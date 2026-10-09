// apps/hub/evals/tools/studio/phonation/checks.selftest.eval.ts
import { articulation } from "@ludenlab/ai";
import { describe, expect, it } from "vitest";
import { BANKA_STASH_KAYBI } from "../articulation/checks";
import { bankaVar, kelimeKaynagi, phonationChecks, type PhonationBody } from "./checks";

type Rec = Record<string, unknown>;

/** Öğrencili istekte alias (rumuz) vardır → bilinen ürün hatası yüzünden modelin 'geçici' kelimeleri kalır ve kelime puanları ölçülür.
    Öğrencisiz istekte (alias null) kelime/görsel/etiketleri banka yazar: bu alanlar puanlanmaz. */
const OGRENCI = "Selin";
const cell = (position: number, word: string, hasTargetSound: boolean, extra: Rec = {}) => ({ position, word, hasTargetSound, isLadder: false, isSnake: false, instruction: null, visualPrompt: "a plain object", ...extra });
const obj = (name: string, hasTargetSound: boolean, extra: Rec = {}) => ({ name, hasTargetSound, description: "d", visualPrompt: "a plain object", ...extra });
const base = { title: "T", instructions: "i", expertNotes: "e", adaptations: "a", scene: null as string | null, objects: [] as unknown[], grid: null as unknown };
const kos = (o: unknown, b: PhonationBody, alias: string | null = OGRENCI) => phonationChecks({ body: b, output: o, raw: o as Rec | null, text: "", alias });

describe("phonationChecks", () => {
  it("bingo 3×3: hücre sayısı, kare ızgara, hedef harf tutarlılığı", () => {
    const body: PhonationBody = { targetSounds: ["/s/"], activityType: "bingo", difficulty: "easy", itemCount: 9 };
    const sozler = ["su", "sepet", "saat", "sandalye", "sabun", "simit", "salata", "sürahi", "masa"];
    const out = { ...base, grid: { rows: 3, cols: 3, cells: sozler.map((w, i) => cell(i + 1, w, true)) } };
    const r = kos(out, body);
    expect(r.scores).toMatchObject({ yapi: 1, oge_sayisi: 1, hedef_tutarli: 1 });
    expect(r.hard).toEqual([]);
  });
  it("ses avı: sahne + nesneler; grid boş; hedef sesi içermeyen nesne hasTargetSound=true ise tutarsız", () => {
    const body: PhonationBody = { targetSounds: ["/k/"], activityType: "sound_hunt", difficulty: "easy", itemCount: 8 };
    const out = { ...base, scene: "mutfak", objects: [obj("kaşık", true), obj("kedi", true), obj("masa", false), obj("tabak", true), obj("su", true), obj("kapı", true), obj("bardak", true), obj("ekmek", true)] };
    const r = kos(out, body);
    expect(r.scores.yapi).toBe(1);
    expect(r.scores.hedef_tutarli).toBe(7 / 8);
  });
  it("labirent: çeldirici (false) hücre olmalı; yılan-merdiven: merdiven ve yılan işaretli hücre olmalı", () => {
    const maze: PhonationBody = { targetSounds: ["/ş/"], activityType: "sound_maze", difficulty: "hard", itemCount: 8 };
    const out = { ...base, grid: { rows: 2, cols: 4, cells: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => cell(i, "şapka", true)) } };
    expect(kos(out, maze).scores.celdirici).toBe(0);
    const sl: PhonationBody = { targetSounds: ["/r/"], activityType: "snakes_ladders", difficulty: "medium", itemCount: 10 };
    const out2 = { ...base, grid: { rows: 2, cols: 5, cells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => cell(i, "araba", true, { isLadder: i === 3, isSnake: i === 8 })) } };
    expect(kos(out2, sl).scores.yilan_merdiven).toBe(1);
  });
  it("yapı boşsa sert hata; çıktı yoksa sert hata değil (fabrika cikti_yok yazar), talimat 0", () => {
    const body: PhonationBody = { targetSounds: ["/s/"], activityType: "bingo", difficulty: "easy", itemCount: 9 };
    expect(kos(base, body).hard).toContain("yapi_yok");
    const r = kos(null, body);
    expect(r.hard).toEqual([]);
    expect(r.scores.talimat).toBe(0);
  });
});

/* ── Ayırt ediciliği ölçen gerçekçi tabanlar (öğrencili: modelin kelimeleri puanlanır): her puan 1, her mutant ilgili puanı düşürür ── */

const HUNT_B: PhonationBody = { targetSounds: ["/k/"], activityType: "sound_hunt", difficulty: "easy", itemCount: 10, theme: "mutfak" };
const huntTaban = () => ({
  ...base,
  scene: "Mutfak: bir ailenin mutfağında sabah kahvaltısı hazırlanıyor.",
  objects: [
    obj("kaşık", true, { visualPrompt: "a metal spoon" }), obj("kase", true, { visualPrompt: "a ceramic bowl" }), obj("kupa", true, { visualPrompt: "a coffee mug" }),
    obj("bıçak", true, { visualPrompt: "a kitchen knife" }), obj("kavanoz", true, { visualPrompt: "a glass jar" }), obj("kepçe", true, { visualPrompt: "a soup ladle" }),
    obj("masa", false, { visualPrompt: "a wooden table" }), obj("tencere", false, { visualPrompt: "a cooking pot" }), obj("fırın", false, { visualPrompt: "an oven" }), obj("çatal", false, { visualPrompt: "a fork" }),
  ],
});
const BINGO_B: PhonationBody = { targetSounds: ["/s/"], activityType: "bingo", difficulty: "medium", itemCount: 16 };
const S_SOZ = ["su", "sepet", "saat", "sandalye", "sabun", "simit", "salata", "sürahi", "masa", "kasa", "pasta", "musluk", "tas", "sakız", "soba", "sebze"];
const bingoTaban = () => ({ ...base, grid: { rows: 4, cols: 4, cells: S_SOZ.map((w, i) => cell(i + 1, w, true)) } });
const SNAKES_B: PhonationBody = { targetSounds: ["/r/"], activityType: "snakes_ladders", difficulty: "medium", itemCount: 20 };
const R_SOZ = ["araba", "robot", "radyo", "çorap", "armut", "kürek", "köprü", "karpuz", "kurbağa", "marul", "tarak", "portakal", "bardak", "kar", "saray", "torba", "perde", "dere", "yürek", "orman"];
const snakesTaban = () => ({
  ...base,
  grid: { rows: 4, cols: 5, cells: R_SOZ.map((w, i) => cell(i + 1, w, true, { isLadder: [3, 9, 14].includes(i + 1), isSnake: [6, 12, 18].includes(i + 1) })) },
});
const MAZE_B: PhonationBody = { targetSounds: ["/ş/"], activityType: "sound_maze", difficulty: "hard", itemCount: 25 };
const SH_SOZ = ["şapka", "şeker", "şemsiye", "şişe", "şarkı", "kuş", "ışık", "düş", "taş"];
const DEGIL_SOZ = ["sandalye", "masa", "kapı", "elma", "balık", "kedi", "top", "araba", "kitap", "çiçek", "ayna", "bulut", "deniz", "ev", "göl", "yıldız"];
/** 5×5: doğru yol üst satır (1–5) ve sağ sütun (10, 15, 20, 25). */
const MAZE_YOL = [1, 2, 3, 4, 5, 10, 15, 20, 25];
const mazeTaban = () => {
  let t = 0, d = 0;
  return { ...base, grid: { rows: 5, cols: 5, cells: Array.from({ length: 25 }, (_, i) => (MAZE_YOL.includes(i + 1) ? cell(i + 1, SH_SOZ[t++]!, true) : cell(i + 1, DEGIL_SOZ[d++]!, false))) } };
};
type Grid = { rows: number; cols: number; cells: Array<Record<string, unknown>> };
const hucreler = (m: { grid: unknown }) => (m.grid as Grid).cells;
const nesneler = (m: { objects: unknown[] }) => m.objects as Array<Record<string, unknown>>;

describe("phonationChecks — taban", () => {
  const tabanlar: Array<[string, PhonationBody, () => Rec]> = [
    ["ses avı", HUNT_B, huntTaban],
    ["tombala 4×4", BINGO_B, bingoTaban],
    ["yılan–merdiven 4×5", SNAKES_B, snakesTaban],
    ["labirent 5×5", MAZE_B, mazeTaban],
  ];
  it.each(tabanlar)("gerçekçi %s çıktısı (öğrencili): her puan 1, sert hata yok", (_ad, b, yap) => {
    const r = kos(yap(), b);
    expect(r.hard).toEqual([]);
    for (const [k, v] of Object.entries(r.scores)) expect(v, k).toBe(1);
    expect(r.details.kelimeler).toBe("model");
  });
  it("puan anahtarları etkinlik türüne göre (öğrencili)", () => {
    const anahtarlar = (b: PhonationBody, yap: () => Rec) => Object.keys(kos(yap(), b).scores).sort();
    const kelime = ["hedef_tutarli", "tekrar_yok", "gorsel_dolu", "gorsel_ingilizce"];
    const ortak = ["yapi", "oge_sayisi", "alanlar", "talimat"];
    expect(anahtarlar(HUNT_B, huntTaban)).toEqual([...ortak, ...kelime, "celdirici", "sahne_tema"].sort());
    expect(anahtarlar({ ...HUNT_B, theme: undefined }, huntTaban)).toEqual([...ortak, ...kelime, "celdirici"].sort());
    expect(anahtarlar(BINGO_B, bingoTaban)).toEqual([...ortak, ...kelime, "pozisyon"].sort());
    expect(anahtarlar(SNAKES_B, snakesTaban)).toEqual([...ortak, ...kelime, "pozisyon", "yilan_merdiven"].sort());
    expect(anahtarlar(MAZE_B, mazeTaban)).toEqual([...ortak, ...kelime, "pozisyon", "celdirici", "yol_var"].sort());
  });

  describe("öğrencisiz (banka kelimeleri sistem yazar): kelime/görsel/etiket puanlanmaz, yapı puanlanır", () => {
    it.each(tabanlar)("%s: kelime puanları yok, yapı puanları 1; saçma kelime/görsel puanı değiştirmez", (_ad, b, yap) => {
      const r = kos(yap(), b, null);
      expect(r.details.kelimeler).toBe("banka");
      for (const k of ["hedef_tutarli", "tekrar_yok", "gorsel_dolu", "gorsel_ingilizce"]) expect(r.scores, k).not.toHaveProperty(k);
      for (const [k, v] of Object.entries(r.scores)) expect(v, k).toBe(1);
      // Sistem kelimeleri ezeceği için modelin 'geçici' kelimeleri, görselleri ve (bingo/yılan–merdivende) etiketleri puanı etkilemez.
      const m = yap();
      const ogeler = b.activityType === "sound_hunt" ? nesneler(m as { objects: unknown[] }) : hucreler(m as { grid: unknown });
      ogeler.forEach((o) => {
        o[b.activityType === "sound_hunt" ? "name" : "word"] = "zzz";
        o.visualPrompt = "";
      });
      expect(kos(m, b, null).scores).toEqual(r.scores);
    });
    it("bankada olmayan ses: öğrencisiz de modelin kelimeleri kalır → kelime puanları var", () => {
      const b: PhonationBody = { ...BINGO_B, targetSounds: ["/x/"] };
      const r = kos(bingoTaban(), b, null);
      expect(r.details.kelimeler).toBe("model");
      expect(r.scores).toHaveProperty("hedef_tutarli");
      expect(r.scores.hedef_tutarli).toBe(0); // 's' kelimeleri 'x' içermez
    });
  });
});

describe("phonationChecks — kelime kaynağı (route'un banka mantığı) ve BANKA_STASH_KAYBI", () => {
  it("bayrak açık varsayımı: kapanırsa 'öğrencili = modelin kelimeleri' testleri güncellenmeli (ürün düzelmiştir)", () => {
    expect(BANKA_STASH_KAYBI).toBe(true);
  });
  it("bankaVar: seslerin HEPSİ bankada olmalı (route'un allBanked'i); boş liste yok", () => {
    expect(bankaVar(["/s/"])).toBe(true);
    expect(bankaVar(["/Ş/", " /k/ "])).toBe(true);
    expect(bankaVar(["/s/", "/x/"])).toBe(false);
    expect(bankaVar(["/constructor/"])).toBe(false);
    expect(bankaVar([])).toBe(false);
  });
  it("kelimeKaynagi: bankalı + öğrencisiz → banka; öğrencili → bayrağa göre; bankasız → model", () => {
    expect(kelimeKaynagi(["/s/"], false)).toBe("banka");
    expect(kelimeKaynagi(["/s/"], true)).toBe(BANKA_STASH_KAYBI ? "model" : "banka");
    expect(kelimeKaynagi(["/x/"], false)).toBe("model");
    expect(kelimeKaynagi(["/x/"], true)).toBe("model");
  });

  describe("bayat bayrak tespiti: öğrencili çıktıda kelimelerin banka görselleri varsa ürün düzelmiştir (banka_kaybi_tutarsiz)", () => {
    const bankaKelimeleri = (harf: string, n: number) => [...articulation.WORD_BANK[harf]!.initial, ...articulation.WORD_BANK[harf]!.medial].slice(0, n);
    const bankaTombala = (): Rec => ({ ...base, grid: { rows: 4, cols: 4, cells: bankaKelimeleri("s", 16).map((w, i) => cell(i + 1, w.word, true, { visualPrompt: w.visualPrompt })) } });
    it("öğrencili + banka görselleri → sert hata", () => {
      expect(kos(bankaTombala(), BINGO_B, OGRENCI).hard).toContain("banka_kaybi_tutarsiz");
    });
    it("öğrencisiz aynı çıktı beklenen davranıştır → sert hata yok", () => {
      expect(kos(bankaTombala(), BINGO_B, null).hard).toEqual([]);
    });
    it("modelin kendi kelimeleri ve görselleri → sert hata yok; banka kelimesi + model görseli de değil", () => {
      expect(kos(bingoTaban(), BINGO_B, OGRENCI).hard).toEqual([]);
      const kelimeler = bankaKelimeleri("s", 16);
      const yalnizKelime = { ...base, grid: { rows: 4, cols: 4, cells: kelimeler.map((w, i) => cell(i + 1, w.word, true)) } };
      expect(kos(yalnizKelime, BINGO_B, OGRENCI).hard).toEqual([]);
    });
    it("yarısı banka görseli (eşik %80'in altı) → sert hata yok", () => {
      const m = bankaTombala() as { grid: Grid };
      m.grid.cells.slice(0, 8).forEach((c) => { c.visualPrompt = "a plain object"; });
      expect(kos(m, BINGO_B, OGRENCI).hard).toEqual([]);
    });
    it("ses avı: banka hedef + çeldirici kelimeleri (nesne adları) de yakalanır", () => {
      const hedef = bankaKelimeleri("k", 6).map((w) => obj(w.word, true, { visualPrompt: w.visualPrompt }));
      const celdirici = bankaKelimeleri("m", 4).map((w) => obj(w.word, false, { visualPrompt: w.visualPrompt }));
      const m = { ...huntTaban(), objects: [...hedef, ...celdirici] };
      expect(kos(m, HUNT_B, OGRENCI).hard).toContain("banka_kaybi_tutarsiz");
    });
    it("bankasız ses: bayat bayrak sorusu yok", () => {
      expect(kos(bankaTombala(), { ...BINGO_B, targetSounds: ["/x/"] }, OGRENCI).hard).toEqual([]);
    });
  });
});

describe("phonationChecks — mutantlar (öğrencili tabanlar)", () => {
  const mutantlar: Array<[string, PhonationBody, () => Rec, (m: Rec) => void, string]> = [
    // ses avı
    ["sahne yok", HUNT_B, huntTaban, (m) => { m.scene = null; }, "yapi"],
    ["sahne yalnız boşluk", HUNT_B, huntTaban, (m) => { m.scene = "  "; }, "yapi"],
    ["ses avında grid de dolu", HUNT_B, huntTaban, (m) => { m.grid = { rows: 1, cols: 1, cells: [cell(1, "kedi", true)] }; }, "yapi"],
    ["nesne sayısı 8 (10 istendi)", HUNT_B, huntTaban, (m) => { (m.objects as unknown[]).splice(0, 2); }, "oge_sayisi"],
    ["nesne sayısı 12 (10 istendi)", HUNT_B, huntTaban, (m) => { (m.objects as unknown[]).push(obj("kalem", true), obj("kitap", true)); }, "oge_sayisi"],
    ["hedef işaretli ama harf yok", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] })[2]!.name = "su"; }, "hedef_tutarli"],
    ["çeldirici işaretli ama harf var", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] })[7]!.name = "kazan"; }, "hedef_tutarli"],
    ["hasTargetSound metin ('true')", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] })[0]!.hasTargetSound = "true"; }, "hedef_tutarli"],
    ["hasTargetSound yok", HUNT_B, huntTaban, (m) => { delete nesneler(m as { objects: unknown[] })[1]!.hasTargetSound; }, "hedef_tutarli"],
    ["nesne adı boş", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] })[8]!.name = ""; }, "hedef_tutarli"],
    ["aynı nesne iki kez (büyük/küçük harf)", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] })[1]!.name = "Kaşık"; }, "tekrar_yok"],
    ["görsel komutu boş", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] })[3]!.visualPrompt = ""; }, "gorsel_dolu"],
    ["görsel komutu Türkçe", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] })[4]!.visualPrompt = "cam bir kavanoz"; }, "gorsel_ingilizce"],
    ["hiç çeldirici yok", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] }).forEach((o) => { o.hasTargetSound = true; }); }, "celdirici"],
    ["hiç hedefli nesne yok", HUNT_B, huntTaban, (m) => { nesneler(m as { objects: unknown[] }).forEach((o) => { o.hasTargetSound = false; }); }, "celdirici"],
    ["sahne temadan bağımsız", HUNT_B, huntTaban, (m) => { m.scene = "Park: çocuklar parkta oynuyor."; }, "sahne_tema"],
    ["yönerge boş", HUNT_B, huntTaban, (m) => { m.instructions = ""; }, "alanlar"],
    // tombala
    ["3×3 verdi (4×4 istendi)", BINGO_B, bingoTaban, (m) => { m.grid = { rows: 3, cols: 3, cells: S_SOZ.slice(0, 9).map((w, i) => cell(i + 1, w, true)) }; }, "oge_sayisi"],
    ["15 hücre (rows×cols = 16)", BINGO_B, bingoTaban, (m) => { hucreler(m as { grid: unknown }).pop(); }, "oge_sayisi"],
    ["kare olmayan ızgara 2×8", BINGO_B, bingoTaban, (m) => { (m.grid as Grid).rows = 2; (m.grid as Grid).cols = 8; }, "oge_sayisi"],
    ["rows/cols sayı değil", BINGO_B, bingoTaban, (m) => { (m.grid as Grid).rows = "dört" as unknown as number; }, "oge_sayisi"],
    ["tombalada sahne dolu", BINGO_B, bingoTaban, (m) => { m.scene = "Mutfak"; }, "yapi"],
    ["tombalada nesneler dolu", BINGO_B, bingoTaban, (m) => { m.objects = [obj("kedi", true)]; }, "yapi"],
    ["tombalada çeldirici hücre (hasTargetSound false)", BINGO_B, bingoTaban, (m) => { hucreler(m as { grid: unknown })[3]!.hasTargetSound = false; }, "hedef_tutarli"],
    ["tombalada hedef harfsiz kelime", BINGO_B, bingoTaban, (m) => { hucreler(m as { grid: unknown })[5]!.word = "kedi"; }, "hedef_tutarli"],
    ["tombalada aynı kelime iki hücrede", BINGO_B, bingoTaban, (m) => { hucreler(m as { grid: unknown })[9]!.word = "SU"; }, "tekrar_yok"],
    ["konum numaraları sıfırdan", BINGO_B, bingoTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c, i) => { c.position = i; }); }, "pozisyon"],
    ["konum tekrarlı", BINGO_B, bingoTaban, (m) => { hucreler(m as { grid: unknown })[7]!.position = 7; }, "pozisyon"],
    ["hücre görsel komutu yok", BINGO_B, bingoTaban, (m) => { delete hucreler(m as { grid: unknown })[0]!.visualPrompt; }, "gorsel_dolu"],
    ["hücre görsel komutu Türkçe işlev sözcüklü", BINGO_B, bingoTaban, (m) => { hucreler(m as { grid: unknown })[0]!.visualPrompt = "bir bardak su"; }, "gorsel_ingilizce"],
    // yılan–merdiven
    ["sütun sayısı 4 (5 olmalı)", SNAKES_B, snakesTaban, (m) => { (m.grid as Grid).rows = 5; (m.grid as Grid).cols = 4; }, "oge_sayisi"],
    ["25 hücre (20 istendi)", SNAKES_B, snakesTaban, (m) => { (m.grid as Grid).rows = 5; hucreler(m as { grid: unknown }).push(...[21, 22, 23, 24, 25].map((p) => cell(p, "kürek", true))); }, "oge_sayisi"],
    ["19 hücre (rows×cols = 20)", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown }).pop(); }, "oge_sayisi"],
    ["merdiven yok", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c) => { c.isLadder = false; }); }, "yilan_merdiven"],
    ["yılan yok", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c) => { c.isSnake = false; }); }, "yilan_merdiven"],
    ["aynı karede hem yılan hem merdiven", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown })[2]!.isSnake = true; }, "yilan_merdiven"],
    ["özel kareler yarıdan fazla (13/20; başlangıç ve bitiş temiz)", SNAKES_B, snakesTaban, (m) => { [1, 3, 4, 6, 7, 9, 10].forEach((i) => { hucreler(m as { grid: unknown })[i]!.isLadder = true; }); }, "yilan_merdiven"],
    ["bitiş karesinde yılan", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown })[19]!.isSnake = true; }, "yilan_merdiven"],
    ["bitiş karesinde merdiven", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown })[19]!.isLadder = true; }, "yilan_merdiven"],
    ["başlangıç karesinde yılan", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown })[0]!.isSnake = true; }, "yilan_merdiven"],
    ["yılan işareti metin ('true')", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c) => { if (c.isSnake) c.isSnake = "true"; }); }, "yilan_merdiven"],
    ["yılan–merdivende konumlar 1'den başlamıyor", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c, i) => { c.position = i + 2; }); }, "pozisyon"],
    ["yılan–merdivende hedef harfsiz kelime", SNAKES_B, snakesTaban, (m) => { hucreler(m as { grid: unknown })[10]!.word = "elma"; }, "hedef_tutarli"],
    // labirent
    ["hiç çeldirici hücre yok", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c) => { c.hasTargetSound = true; }); }, "celdirici"],
    ["hedefli hücre yok", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c) => { c.hasTargetSound = false; }); }, "celdirici"],
    ["doğru yol kopuk (bir hücre çeldirici)", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown })[14]!.hasTargetSound = false; }, "yol_var"],
    ["giriş karesi çeldirici", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown })[0]!.hasTargetSound = false; }, "yol_var"],
    ["çıkış karesi çeldirici", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown })[24]!.hasTargetSound = false; }, "yol_var"],
    ["doğru yol yalnız çaprazdan geçiyor", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown }).forEach((c, i) => { c.hasTargetSound = i % 6 === 0; }); }, "yol_var"],
    ["labirentte 22 hücre (25 istendi)", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown }).splice(22); (m.grid as Grid).rows = 2; (m.grid as Grid).cols = 11; }, "oge_sayisi"],
    ["labirentte rows×cols hücre sayısını tutmuyor", MAZE_B, mazeTaban, (m) => { (m.grid as Grid).cols = 4; }, "oge_sayisi"],
    ["labirentte konum tekrarlı", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown })[24]!.position = 24; }, "pozisyon"],
    ["labirentte çeldirici işaretli ama hedef harfi var", MAZE_B, mazeTaban, (m) => { hucreler(m as { grid: unknown })[8]!.word = "şemsiye"; }, "hedef_tutarli"],
  ];
  it.each(mutantlar)("mutant: %s → %s düşer, taban 1", (_ad, b, yap, mut, anahtar) => {
    const m = yap();
    mut(m);
    const r = kos(m, b);
    expect(r.scores[anahtar], anahtar).toBeLessThan(1);
    expect(r.scores.talimat).toBeLessThan(1);
    expect(r.hard).toEqual([]);
  });
});

describe("phonationChecks — sayı kuralları (prompt: tombala 9→3×3 / 16→4×4 / 25→5×5; yılan–merdiven rows=itemCount/5, cols=5; ses avı ve labirent itemCount ± 1)", () => {
  const gridli = (rows: number, cols: number, n = rows * cols): Rec => ({ ...base, grid: { rows, cols, cells: Array.from({ length: n }, (_, i) => cell(i + 1, S_SOZ[i % S_SOZ.length]! + (i >= S_SOZ.length ? String(i) : ""), true)) } });
  const sayi = (o: unknown, b: PhonationBody) => kos(o, b, null).scores.oge_sayisi;

  it("tombala: itemCount 9/16/25 ise tam o kare; başka itemCount'ta 9/16/25'ten biri (kare) yeter, kare olmayan ya da başka boyut yetmez", () => {
    for (const [n, k] of [[9, 3], [16, 4], [25, 5]] as const) {
      const b: PhonationBody = { ...BINGO_B, itemCount: n };
      expect(sayi(gridli(k, k), b), `${n}`).toBe(1);
      for (const [d] of [[3], [4], [5]].filter(([x]) => x !== k)) expect(sayi(gridli(d!, d!), b), `${n} istendi, ${d}×${d}`).toBe(0);
    }
    const on: PhonationBody = { ...BINGO_B, itemCount: 12 };
    for (const k of [3, 4, 5]) expect(sayi(gridli(k, k), on), `12 → ${k}×${k}`).toBe(1);
    expect(sayi(gridli(3, 4), on)).toBe(0); // 12 hücre ama kare değil
    expect(sayi(gridli(2, 2), on)).toBe(0); // 4 desteklenen boyut değil
    expect(sayi(gridli(6, 6), on)).toBe(0);
    expect(sayi(gridli(3, 3, 8), on)).toBe(0); // rows×cols ≠ hücre
  });
  it("yılan–merdiven: cols tam 5, rows×5 = hücre; itemCount 5'in katıysa rows = itemCount/5, değilse alt ya da üst yuvarlama", () => {
    const b = (itemCount: number): PhonationBody => ({ ...SNAKES_B, itemCount });
    for (const n of [10, 15, 20, 25]) {
      expect(sayi(gridli(n / 5, 5), b(n)), `${n}`).toBe(1);
      expect(sayi(gridli(n / 5 + 1, 5), b(n)), `${n}: bir satır fazla`).toBe(0);
      expect(sayi(gridli(n / 5 - 1, 5), b(n)), `${n}: bir satır az`).toBe(0);
    }
    for (const [n, alt, ust] of [[8, 1, 2], [12, 2, 3], [13, 2, 3], [17, 3, 4], [22, 4, 5]] as const) {
      expect(sayi(gridli(alt, 5), b(n)), `${n} → ${alt}`).toBe(1);
      expect(sayi(gridli(ust, 5), b(n)), `${n} → ${ust}`).toBe(1);
      expect(sayi(gridli(ust + 1, 5), b(n)), `${n} → ${ust + 1}`).toBe(0);
    }
    expect(sayi(gridli(4, 5), b(20))).toBe(1);
    expect(sayi(gridli(5, 4), b(20))).toBe(0);
    expect(sayi(gridli(2, 10), b(20))).toBe(0);
  });
  it("ses avı ve labirent: itemCount ± 1 kabul, ± 2 değil", () => {
    const hunt = (n: number) => ({ ...base, scene: "Mutfak", objects: Array.from({ length: n }, (_, i) => obj(`kelime${i}`, i % 2 === 0)) });
    const hb: PhonationBody = { ...HUNT_B, itemCount: 10 };
    for (const n of [9, 10, 11]) expect(sayi(hunt(n), hb), `${n}`).toBe(1);
    for (const n of [8, 12, 0, 25]) expect(sayi(hunt(n), hb), `${n}`).toBe(0);
    const mb: PhonationBody = { ...MAZE_B, itemCount: 12 };
    expect(sayi(gridli(3, 4), mb)).toBe(1);
    expect(sayi(gridli(3, 4, 11), mb)).toBe(0); // 3×4 ≠ 11 hücre
    expect(sayi(gridli(1, 11), mb)).toBe(1); // 11 = 12 − 1
    expect(sayi(gridli(1, 13), mb)).toBe(1);
    expect(sayi(gridli(1, 14), mb)).toBe(0);
    expect(sayi(gridli(2, 5), mb)).toBe(0);
  });
});

describe("phonationChecks — yol_var (labirent: giriş = ilk hücre, çıkış = son hücre, doğru yol dört komşuluktan oluşur)", () => {
  const harita = (satirlar: string[]): Rec => {
    const cols = satirlar[0]!.length;
    return { ...base, grid: { rows: satirlar.length, cols, cells: satirlar.join("").split("").map((ch, i) => cell(i + 1, ch === "#" ? "şapka" : "masa", ch === "#")) } };
  };
  const yol = (satirlar: string[]) => {
    const b: PhonationBody = { ...MAZE_B, itemCount: satirlar.join("").length };
    return kos(harita(satirlar), b).scores.yol_var;
  };
  it("düz, L biçimli ve yılan gibi kıvrımlı yollar geçer", () => {
    expect(yol(["###", "..#", "..#"])).toBe(1);
    expect(yol(["#...", "#...", "####"])).toBe(1);
    expect(yol(["####", "...#", "####", "#...", "####"])).toBe(1);
    expect(yol(["##", "#."])).toBe(0); // son hücre çeldirici
    expect(yol(["#######"])).toBe(1); // tek satır
  });
  it("kopuk, çapraz ve yan satıra sarmalı (satır sonu → sonraki satır başı) yollar geçmez", () => {
    expect(yol(["#..", ".#.", "..#"])).toBe(0); // yalnız çapraz
    expect(yol(["##.", "..#", "..#"])).toBe(0); // (0,1) → (1,2) çapraz
    expect(yol(["..#", "#..", "..#"])).toBe(0); // giriş karesi çeldirici (ve 3. hücre ile 4. hücre satır sonu/başı: komşu değil)
    expect(yol(["#.#", "#.#", "###"])).toBe(1); // U biçimli
    expect(yol(["##.", "...", ".##"])).toBe(0);
  });
  it("çözülebilir yol varken fazladan kapalı (hedefli) hücreler yolu bozmaz; yol yoksa fazla hedefli hücre kurtarmaz", () => {
    expect(yol(["###", "###", "###"])).toBe(1);
    expect(yol(["#.#", "...", "#.#"])).toBe(0);
  });
  it("cols geçersizse (0, metin, kesirli) yol yok", () => {
    const m = harita(["###", "..#", "..#"]) as { grid: Grid };
    for (const c of [0, "üç", 2.5, undefined, null]) {
      m.grid.cols = c as number;
      expect(kos(m, { ...MAZE_B, itemCount: 9 }).scores.yol_var, String(c)).toBe(0);
    }
  });
  it("tek hücre ya da hücre yok: yol yok", () => {
    expect(yol(["#"])).toBe(0);
  });
});

describe("phonationChecks — hedef/çeldirici tutarlılığı: hunt/maze'de etiket zorunlu ve harfle uyumlu; bingo/yılan–merdivende hedef harf zorunlu", () => {
  const ses = (hedefler: string[], cikti: Rec, tip: PhonationBody["activityType"], n = 10) =>
    kos(cikti, { targetSounds: hedefler, activityType: tip, difficulty: "easy", itemCount: n }).scores.hedef_tutarli;
  const av = (...ogeler: Array<[string, boolean]>): Rec => ({ ...base, scene: "S", objects: ogeler.map(([ad, h]) => obj(ad, h)) });
  it("büyük harf ve Türkçe harfler: /ş/ için 'ŞAPKA' ve 'Işık' hedef, 'sapka' çeldirici", () => {
    expect(ses(["/ş/"], av(["ŞAPKA", true], ["Işık", true], ["sapka", false]), "sound_hunt")).toBe(1);
    expect(ses(["/ş/"], av(["sapka", true]), "sound_hunt")).toBe(0);
    expect(ses(["/Ş/"], av(["şeker", true]), "sound_hunt")).toBe(1);
  });
  it("çok sesli hedef: herhangi bir hedef harf yeter; çeldirici HİÇBİRİNİ içermemeli", () => {
    expect(ses(["/s/", "/ş/"], av(["su", true], ["şapka", true], ["kedi", false]), "sound_hunt")).toBe(1);
    expect(ses(["/s/", "/ş/"], av(["su", false]), "sound_hunt")).toBe(0);
    expect(ses(["/s/", "/ş/"], av(["şapka", false]), "sound_hunt")).toBe(0);
  });
  it("bingo: etiketsiz (undefined) hücre kabul — arayüz bingo'da etiketi okumaz; ama hedef harfsiz kelime ya da false etiket kabul değil", () => {
    const hucre = (...ogeler: Array<[string, unknown]>): Rec => ({ ...base, grid: { rows: 1, cols: ogeler.length, cells: ogeler.map(([w, h], i) => ({ ...cell(i + 1, w, true), hasTargetSound: h })) } });
    expect(ses(["/s/"], hucre(["su", undefined], ["sepet", true]), "bingo")).toBe(1);
    expect(ses(["/s/"], hucre(["su", false]), "bingo")).toBe(0);
    expect(ses(["/s/"], hucre(["kedi", true]), "bingo")).toBe(0);
    expect(ses(["/s/"], hucre(["", true]), "bingo")).toBe(0);
  });
});

describe("phonationChecks — sahne_tema (yalnız ses avında ve anlamlı tema sözcüğü varsa)", () => {
  const sahne = (tema: string | undefined, sahneMetni: string) =>
    kos({ ...huntTaban(), scene: sahneMetni }, { ...HUNT_B, theme: tema }).scores.sahne_tema;
  it("tema gövdesi sahnede geçer: ek ve ünsüz yumuşaması sorun değil (mutfak → mutfağında)", () => {
    expect(sahne("mutfak", "Mutfak")).toBe(1);
    expect(sahne("mutfak", "Bir ailenin mutfağında akşam yemeği")).toBe(1);
    expect(sahne("Çiftlik", "Çiftlikte sabah")).toBe(1);
    expect(sahne("deniz kenarı", "Deniz kıyısında yaz günü")).toBe(1);
  });
  it("tema yok / yalnız kısa sözcük → puan yok; tema sahnede yoksa 0", () => {
    expect(sahne(undefined, "Park")).toBeUndefined();
    expect(sahne("", "Park")).toBeUndefined();
    expect(sahne("ev", "Park")).toBeUndefined();
    expect(sahne("mutfak", "Park")).toBe(0);
    expect(sahne("mutfak", "")).toBe(0);
  });
  it("diğer etkinlik türlerinde tema puanlanmaz (banka kelimeleri temadan bağımsız)", () => {
    expect(kos(bingoTaban(), { ...BINGO_B, theme: "mutfak" })).not.toHaveProperty("scores.sahne_tema");
    expect(kos(mazeTaban(), { ...MAZE_B, theme: "mutfak" }).scores).not.toHaveProperty("sahne_tema");
  });
});

describe("phonationChecks — rotanın ezdiği alanlar", () => {
  it("activityType, targetSounds, difficulty, theme çıktıda bozuk olsa da puan değişmez (gövdeden okunur)", () => {
    const m = bingoTaban();
    const once = kos(m, BINGO_B).scores;
    Object.assign(m, { activityType: "sound_hunt", targetSounds: ["/zzz/"], difficulty: 5, theme: ["x"] });
    expect(kos(m, BINGO_B).scores).toEqual(once);
  });
  it("hunt'ta objects yok ama grid dolu → yapi 0 ve sert hata; bingo'da grid yok → sert hata", () => {
    const m = { ...base, scene: "Mutfak", grid: { rows: 2, cols: 4, cells: S_SOZ.slice(0, 8).map((w, i) => cell(i + 1, w, true)) } };
    const r = kos(m, HUNT_B);
    expect(r.scores.yapi).toBe(0);
    expect(r.hard).toContain("yapi_yok");
    expect(kos({ ...base, objects: [obj("a", true)] }, BINGO_B).hard).toContain("yapi_yok");
  });
});

describe("phonationChecks — dayanıklılık: nesne olmayan hücre/nesne/ızgara", () => {
  it("null/metin/dizi hücreler ve nesneler çökmez; öğe sayısı korunur", () => {
    const hucre = { ...base, grid: { rows: 2, cols: 2, cells: [null, "metin", [1], 5, { word: 5, hasTargetSound: "x", visualPrompt: null, position: "1" }] } };
    const r = kos(hucre, { ...BINGO_B, itemCount: 4 });
    expect(r.details.oge).toBe(5);
    const av = { ...base, scene: 7, objects: [null, "x", { name: ["a"], hasTargetSound: null }] };
    expect(() => kos(av, HUNT_B)).not.toThrow();
    expect(kos(av, HUNT_B).details.oge).toBe(3);
  });
  it("grid nesne değilse (metin/dizi/null) ve cells dizi değilse hücre yok sayılır; çökmez", () => {
    for (const grid of ["x", [1], null, 5, { rows: 3, cols: 3, cells: "x" }, { rows: 3, cols: 3 }]) {
      const r = kos({ ...base, grid }, BINGO_B);
      expect(r.hard, JSON.stringify(grid)).toContain("yapi_yok");
    }
  });
  it("çıktı nesne değilse (dizi/metin/sayı) çıktı yok gibi: talimat 0", () => {
    for (const x of [[1], "metin", 7, undefined]) expect(kos(x, BINGO_B).scores.talimat, String(x)).toBe(0);
  });
  it("hunt'ta objects dizi değilse nesne yok → sert hata", () => {
    expect(kos({ ...base, scene: "S", objects: "x" }, HUNT_B).hard).toContain("yapi_yok");
  });
});

/* ── Mutasyon taramasının açtığı boşluklar: her test bir kontrol koşulunun gerçekten gerekli olduğunu gösterir ── */

describe("phonationChecks — yol_var: yalnız dört komşuluk, sarmalama yok, yukarı/aşağı/sağa/sola hareket", () => {
  const harita = (satirlar: string[]): Rec => {
    const cols = satirlar[0]!.length;
    return { ...base, grid: { rows: satirlar.length, cols, cells: satirlar.join("").split("").map((ch, i) => cell(i + 1, ch === "#" ? "şapka" : "masa", ch === "#")) } };
  };
  const yol = (satirlar: string[]) => kos(harita(satirlar), { ...MAZE_B, itemCount: satirlar.join("").length }).scores.yol_var;
  it("satır sonundan sonraki satırın başına geçiş (sağa sarma) komşuluk değildir", () => {
    expect(yol(["##", ".#", "#.", "##"])).toBe(0);
    expect(yol(["###", "..#", "##.", ".##"])).toBe(0);
  });
  it("satır başından önceki satırın sonuna geçiş (sola sarma) komşuluk değildir", () => {
    expect(yol(["#.#", "#.#"])).toBe(0);
    expect(yol(["#.#", "#.#", "..#"])).toBe(0);
  });
  it("yolun bir yerinde yukarı çıkması gerekiyorsa (kıvrımlı labirent) yine bulunur", () => {
    expect(yol(["#.###", "###.#", "....#", "....#"])).toBe(1);
  });
  it("kesirli sütun sayısı geçersizdir (2,5 sütunla 3 hücre 'yan yana' sayılmaz)", () => {
    const m = harita(["###"]) as { grid: Grid };
    m.grid.cols = 2.5;
    expect(kos(m, { ...MAZE_B, itemCount: 3 }).scores.yol_var).toBe(0);
    m.grid.cols = 3;
    expect(kos(m, { ...MAZE_B, itemCount: 3 }).scores.yol_var).toBe(1);
  });
});

describe("phonationChecks — ızgara sayıları: rows/cols tam sayı ve hücre sayısıyla tutarlı; sayı metni kabul", () => {
  const gridli = (rows: unknown, cols: unknown, n: number): Rec => ({ ...base, grid: { rows, cols, cells: Array.from({ length: n }, (_, i) => cell(i + 1, S_SOZ[i % S_SOZ.length]! + i, true)) } });
  const sayi = (o: unknown, b: PhonationBody) => kos(o, b, null).scores.oge_sayisi;
  it("tombala: ilan edilen rows×cols hücre sayısını tutmalı (4×4 ilan, 9 hücre)", () => {
    expect(sayi(gridli(4, 4, 9), { ...BINGO_B, itemCount: 9 })).toBe(0);
    expect(sayi(gridli(3, 3, 9), { ...BINGO_B, itemCount: 9 })).toBe(1);
  });
  it("yılan–merdiven: sütun tam 5 olmalı (4×4 = 16 hücre ilan edilse de, satır sayısı kabul edilen aralıkta olsa da)", () => {
    expect(sayi(gridli(4, 4, 16), SNAKES_B)).toBe(0);
    expect(sayi(gridli(4, 5, 20), SNAKES_B)).toBe(1);
  });
  it("labirent: kesirli satır ya da sütun geçersiz (2,5×4 = 10 hücre, 10 istendi)", () => {
    const m: PhonationBody = { ...MAZE_B, itemCount: 10 };
    expect(sayi(gridli(2.5, 4, 10), m)).toBe(0);
    expect(sayi(gridli(4, 2.5, 10), m)).toBe(0);
    expect(sayi(gridli(2, 5, 10), m)).toBe(1);
  });
  it("satır, sütun ve konum sayı metni olabilir ('4', '1'); sayı olmayan metin (boş, 'dört') geçersiz", () => {
    const m = gridli("4", "4", 16) as { grid: { rows: unknown; cols: unknown; cells: Array<Record<string, unknown>> } };
    m.grid.cells.forEach((c, i) => { c.position = String(i + 1); });
    const r = kos(m, BINGO_B, null);
    expect(r.scores.oge_sayisi).toBe(1);
    expect(r.scores.pozisyon).toBe(1);
    m.grid.cells.forEach((c) => { c.position = ""; });
    expect(kos(m, BINGO_B, null).scores.pozisyon).toBe(0);
    m.grid.rows = "";
    expect(kos(m, BINGO_B, null).scores.oge_sayisi).toBe(0);
  });
});

describe("phonationChecks — yapi: hunt'ta nesne, diğerlerinde hücre zorunlu", () => {
  it("ses avında sahne var ama nesne yok → yapi 0", () => {
    const r = kos({ ...base, scene: "Mutfak" }, HUNT_B);
    expect(r.scores.yapi).toBe(0);
    expect(r.hard).toContain("yapi_yok");
  });
  it("ızgara türünde hücre yok (sahne/nesne de boş) → yapi 0", () => {
    for (const b of [BINGO_B, SNAKES_B, MAZE_B]) expect(kos(base, b).scores.yapi, b.activityType).toBe(0);
  });
});

describe("phonationChecks — tema sahne eşleşmesi: durak sözcük sayılmaz, gövde 5 harfe kadar, kelime başında aranır", () => {
  const sahne = (tema: string, sahneMetni: string) => kos({ ...huntTaban(), scene: sahneMetni }, { ...HUNT_B, theme: tema }).scores.sahne_tema;
  it("durak sözcükler ('için', 'gibi', 'daha', 'veya', 'olan') tema parçası değildir", () => {
    expect(sahne("mutfak için", "Park için oyun")).toBe(0);
    expect(sahne("mutfak için", "Mutfak için hazırlık")).toBe(1);
    expect(sahne("park gibi", "Okul gibi bir yer")).toBe(0);
  });
  it("gövde ilk beş harfle (kısa sözcükte son harf atılarak) eşleşir: ortak üç harfli ön ek yetmez", () => {
    expect(sahne("mutfak", "Mutlu bir gün")).toBe(0);
    expect(sahne("mutfak", "Mutfakta kahvaltı")).toBe(1);
    expect(sahne("park", "Parkta oyun")).toBe(1);
    expect(sahne("park", "Parıltılı bir gece")).toBe(0); // dört harflide gövde sözcüğün kendisi (3 harf "par" parıltıyı da yakalardı)
    expect(sahne("okul", "Okuyor bir çocuk")).toBe(0);
    expect(sahne("okul", "Okulda ders")).toBe(1);
    expect(sahne("deniz", "Denize girmek")).toBe(1);
  });
  it("tema gövdesi sözcüğün ortasında geçerse sayılmaz (kelime başı)", () => {
    expect(sahne("park", "Otopark alanı")).toBe(0);
    expect(sahne("park", "Otopark ve park alanı")).toBe(1);
    expect(sahne("mutfak", "Bir mutfak")).toBe(1);
  });
  it("uzun tema sözcüğünde gövde ilk beş harftir (ek/çekim farkı tolerans); BİLİNEN SINIR: aynı beş harfle başlayan başka sözcük de eşleşir", () => {
    expect(sahne("çiftlik", "Çiftlikte hayvanlar")).toBe(1);
    expect(sahne("çiftlik", "Çiftlerin evi")).toBe(1); // 'çiftl' ortak
    expect(sahne("çiftlik", "Çift ve tek sayılar")).toBe(0); // 'çift' ortak ama 'çiftl' değil
  });
});

describe("phonationChecks — boş hedef ses ve kelime yazımı", () => {
  const ses = (hedefler: string[], o: Rec) => kos(o, { ...HUNT_B, targetSounds: hedefler, theme: undefined }).scores.hedef_tutarli;
  const av = (...ogeler: Array<[string, boolean]>): Rec => ({ ...base, scene: "S", objects: ogeler.map(([ad, h]) => obj(ad, h)) });
  it("boş ses ('//') hiçbir kelimeyi hedefli yapmaz: hedefli etiket tutmaz, çeldirici etiket tutar", () => {
    expect(ses(["//"], av(["su", false]))).toBe(1);
    expect(ses(["//"], av(["su", true]))).toBe(0);
    expect(ses(["/ /", "/s/"], av(["su", true], ["kedi", false]))).toBe(1);
  });
  it("kelime tekrarı büyük/küçük harf ve kenar boşluğundan bağımsız; boş kelimeler tekrar sayılır", () => {
    const m = huntTaban();
    nesneler(m)[1]!.name = " KAŞIK ";
    expect(kos(m, HUNT_B).scores.tekrar_yok).toBeCloseTo(9 / 10);
    const b = huntTaban();
    nesneler(b)[1]!.name = "";
    nesneler(b)[2]!.name = "  ";
    expect(kos(b, HUNT_B).scores.tekrar_yok).toBeCloseTo(8 / 10);
  });
  it("yalnız boşluktan oluşan görsel komutu boş sayılır; hiç komut yoksa dil puanı 1 (eksiklik gorsel_dolu'da cezalanır)", () => {
    const m = huntTaban();
    nesneler(m)[0]!.visualPrompt = "   ";
    expect(kos(m, HUNT_B).scores.gorsel_dolu).toBeCloseTo(9 / 10);
    nesneler(m).forEach((o) => { o.visualPrompt = ""; });
    const r = kos(m, HUNT_B);
    expect(r.scores.gorsel_dolu).toBe(0);
    expect(r.scores.gorsel_ingilizce).toBe(1);
  });
});

describe("phonationChecks — yılan–merdiven bayrakları yalnız === true sayılır", () => {
  it("isLadder 'true' (metin) merdiven sayılmaz; tek merdiven bu yüzden eksik kalır", () => {
    const m = snakesTaban();
    hucreler(m).forEach((c) => { if (c.isLadder) c.isLadder = false; });
    hucreler(m)[2]!.isLadder = "true";
    expect(kos(m, SNAKES_B).scores.yilan_merdiven).toBe(0);
    hucreler(m)[2]!.isLadder = true;
    expect(kos(m, SNAKES_B).scores.yilan_merdiven).toBe(1);
  });
});

describe("phonationChecks — alanlar ve ayrıntılar", () => {
  it.each(["title", "instructions", "expertNotes", "adaptations"])("%s boşsa alanlar 0,75", (k) => {
    const m = bingoTaban() as Rec;
    m[k] = " ";
    expect(kos(m, BINGO_B).scores.alanlar).toBe(0.75);
    delete m[k];
    expect(kos(m, BINGO_B).scores.alanlar).toBe(0.75);
  });
  it("banka_tutarli yalnız banka kelimelerinde ayrıntıdır (puan değil): tutarlıysa 1, kusurluysa düşer; model kelimelerinde yok", () => {
    const iyi = kos(bingoTaban(), BINGO_B, null);
    expect(iyi.details.banka_tutarli).toBe(1);
    expect(iyi.scores).not.toHaveProperty("banka_tutarli");
    const m = bingoTaban();
    hucreler(m)[0]!.word = "kedi"; // sistem yazsaydı olmayacak bir durum: izleme amaçlı ayrıntı yakalar
    expect(kos(m, BINGO_B, null).details.banka_tutarli).toBe(15 / 16);
    expect(kos(bingoTaban(), BINGO_B, OGRENCI).details).not.toHaveProperty("banka_tutarli");
  });
});

describe("phonationChecks — bayat bayrak tespiti ayrıntıları", () => {
  const bankaOge = (harf: string, n: number) => [...articulation.WORD_BANK[harf]!.initial, ...articulation.WORD_BANK[harf]!.medial].slice(0, n);
  const tombala = (ogeler: Array<{ word: string; visualPrompt: string }>): Rec => ({ ...base, grid: { rows: 2, cols: 2, cells: ogeler.map((w, i) => cell(i + 1, w.word, true, { visualPrompt: w.visualPrompt })) } });
  it("en az 4 öğe gerekir: 3 banka öğesi kanıt değil, 4 öğe kanıttır", () => {
    expect(kos(tombala(bankaOge("s", 3)), BINGO_B, OGRENCI).hard).toEqual([]);
    expect(kos(tombala(bankaOge("s", 4)), BINGO_B, OGRENCI).hard).toContain("banka_kaybi_tutarsiz");
  });
  it("büyük harf içeren banka görseli ('a TV antenna') ve büyük harfli/boşluklu kelime yine eşleşir", () => {
    const buyuk = Object.values(articulation.WORD_BANK)
      .flatMap((p) => [...p.initial, ...p.medial, ...p.final])
      .filter((w) => /[A-Z]/.test(w.visualPrompt))
      .slice(0, 4);
    expect(buyuk.length).toBe(4);
    expect(kos(tombala(buyuk), BINGO_B, OGRENCI).hard).toContain("banka_kaybi_tutarsiz");
    const kenarli = bankaOge("s", 4).map((w) => ({ word: ` ${w.word.charAt(0).toLocaleUpperCase("tr-TR")}${w.word.slice(1)} `, visualPrompt: `  ${w.visualPrompt.replace(/ /g, "  ")} ` }));
    expect(kos(tombala(kenarli), BINGO_B, OGRENCI).hard).toContain("banka_kaybi_tutarsiz");
  });
});
