import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regresyon kilidi — "hedefli hesap kilitleme (DoS)" (2026-08 güvenlik denetimi #27).
 *
 * ESKİ DAVRANIŞ: throttle sayacı yalnız E-POSTA anahtarlıydı ve şifre DOĞRULANMADAN ÖNCE
 * artıyordu. Kurbanın e-postasını bilen herkes 8 yanlış denemeyle onu giriş yapamaz hale
 * getirebiliyordu. Yeni sözleşme:
 *   · sayaç e-posta+IP anahtarlı → saldırgan yalnız KENDİ kaynağını kilitler
 *   · yalnız BAŞARISIZLIK sayılır → doğru şifreyle gelen kullanıcı asla kilitlenmez
 *   · suspended/doğrulanmamış "başarısızlık" değildir (kullanıcı kendini kilitlemesin)
 *
 * `authorize` NextAuth yapılandırmasının içinde olduğu için config'i yakalayıp doğrudan
 * çağırıyoruz — prod DB'ye dokunmadan gerçek karar akışı test edilir.
 */
const findUnique = vi.fn();
const compare = vi.fn();

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    (globalThis as Record<string, unknown>).__authConfig = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/credentials", () => ({ default: (cfg: unknown) => cfg }));
vi.mock("@/lib/db", () => ({ prisma: { account: { findUnique } } }));
vi.mock("bcryptjs", () => ({ default: { compare } }));

await import("./auth");

type AuthorizeFn = (
  credentials: { email: string; password: string },
  request: { headers: Headers },
) => Promise<{ id: string } | null>;

const config = (globalThis as Record<string, unknown>).__authConfig as {
  providers: Array<{ authorize: AuthorizeFn }>;
};
const authorize = config.providers[0]!.authorize;

const ACCOUNT = {
  id: "acc1",
  email: "kurban@example.com",
  name: "Kurban",
  passwordHash: "$2a$10$hash",
  role: "user",
  suspended: false,
  emailVerified: new Date("2026-01-01"),
  sessionVersion: 0,
};

/** Her test kendi IP'sini kullanır — modül düzeyindeki sayaç deposu testler arası sızmasın. */
let ipSeq = 0;
const req = (ip: string) => ({ headers: new Headers({ "x-forwarded-for": ip }) });
const freshIp = () => `10.0.0.${++ipSeq}`;

/** Her test kendi e-postasıyla çalışsın (login:watch: sayacı da paylaşılmasın). */
let emailSeq = 0;
const freshEmail = () => `kurban${++emailSeq}@example.com`;

beforeEach(() => {
  findUnique.mockReset();
  compare.mockReset();
});

describe("authorize — hedefli kilitleme (asıl regresyon)", () => {
  it("saldırganın yanlış denemeleri KURBANI kilitlemez", async () => {
    const email = freshEmail();
    const attackerIp = freshIp();
    const victimIp = freshIp();
    findUnique.mockResolvedValue({ ...ACCOUNT, email });

    // Saldırgan aynı e-postayla limitin çok üstünde yanlış deneme yapar.
    compare.mockResolvedValue(false);
    for (let i = 0; i < 20; i++) {
      expect(await authorize({ email, password: "yanlış" }, req(attackerIp))).toBeNull();
    }

    // Kurban KENDİ IP'sinden doğru şifreyle gelir → GİRİŞ YAPABİLMELİ.
    compare.mockResolvedValue(true);
    const user = await authorize({ email, password: "doğru" }, req(victimIp));
    expect(user).toMatchObject({ id: "acc1", role: "user", sessionVersion: 0 });
  });

  it("saldırgan KENDİ kaynağını kilitler — 8 yanlıştan sonra şifre bile denenmez", async () => {
    const email = freshEmail();
    const ip = freshIp();
    findUnique.mockResolvedValue({ ...ACCOUNT, email });
    compare.mockResolvedValue(false);

    for (let i = 0; i < 8; i++) await authorize({ email, password: "yanlış" }, req(ip));
    const callsAfterLimit = compare.mock.calls.length;

    await authorize({ email, password: "yanlış" }, req(ip));
    expect(compare.mock.calls.length).toBe(callsAfterLimit); // bcrypt hiç çalışmadı
  });
});

describe("authorize — normal akış", () => {
  it("doğru şifre kullanıcıyı döner", async () => {
    const email = freshEmail();
    findUnique.mockResolvedValue({ ...ACCOUNT, email });
    compare.mockResolvedValue(true);
    expect(await authorize({ email, password: "doğru" }, req(freshIp()))).toMatchObject({
      id: "acc1",
      email,
    });
  });

  it("başarılı giriş kendi başarısızlık sayacını sıfırlar", async () => {
    const email = freshEmail();
    const ip = freshIp();
    findUnique.mockResolvedValue({ ...ACCOUNT, email });

    compare.mockResolvedValue(false);
    for (let i = 0; i < 7; i++) await authorize({ email, password: "yanlış" }, req(ip));

    compare.mockResolvedValue(true);
    expect(await authorize({ email, password: "doğru" }, req(ip))).not.toBeNull();

    // Sayaç sıfırlandı → aynı IP'den yeniden 8 hakkı var (kilitli kalmadı).
    compare.mockResolvedValue(false);
    for (let i = 0; i < 7; i++) await authorize({ email, password: "yanlış" }, req(ip));
    compare.mockResolvedValue(true);
    expect(await authorize({ email, password: "doğru" }, req(ip))).not.toBeNull();
  });

  it("olmayan hesapta null döner (varlık sızdırmaz) ve bcrypt çalışmaz", async () => {
    findUnique.mockResolvedValue(null);
    expect(await authorize({ email: freshEmail(), password: "x" }, req(freshIp()))).toBeNull();
    expect(compare).not.toHaveBeenCalled();
  });

  it("eksik alanlarda erken null", async () => {
    expect(await authorize({ email: "", password: "x" }, req(freshIp()))).toBeNull();
    expect(await authorize({ email: freshEmail(), password: "" }, req(freshIp()))).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("authorize — yetkilendirme redleri başarısızlık SAYILMAZ", () => {
  it("askıya alınmış hesap giriş yapamaz ama kendini kilitlemez", async () => {
    const email = freshEmail();
    const ip = freshIp();
    findUnique.mockResolvedValue({ ...ACCOUNT, email, suspended: true });
    compare.mockResolvedValue(true);

    for (let i = 0; i < 12; i++) {
      expect(await authorize({ email, password: "doğru" }, req(ip))).toBeNull();
    }
    // Sayaç dolmadığı için şifre HÂLÂ doğrulanıyor (kilit yok) — askı kararı taze okunur.
    expect(compare.mock.calls.length).toBe(12);
  });

  it("doğrulanmamış e-posta giriş yapamaz; doğrulanınca ANINDA girebilir", async () => {
    const email = freshEmail();
    const ip = freshIp();
    findUnique.mockResolvedValue({ ...ACCOUNT, email, emailVerified: null });
    compare.mockResolvedValue(true);

    for (let i = 0; i < 12; i++) {
      expect(await authorize({ email, password: "doğru" }, req(ip))).toBeNull();
    }

    findUnique.mockResolvedValue({ ...ACCOUNT, email });
    expect(await authorize({ email, password: "doğru" }, req(ip))).not.toBeNull();
  });
});
