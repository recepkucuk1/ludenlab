// apps/hub/evals/tools/studio/phonation/adapter.ts
import { DIFFICULTY_LABEL } from "@studio/lib/constants";
import { studioAdapter } from "../../../lib/adapterFactory";
import { kayitlar, nesneVeyaNull, str } from "../../../lib/sharedChecks";
import { bankaVar, bankaYazmis, bingoSerbestPozisyon, kelimeKaynagi, phonationChecks, sayiOf, type PhonationBody } from "./checks";

type Rec = Record<string, unknown>;

/** Route'taki ACTIVITY_TYPE_LABEL ve parametre satırlarının AYNI metinleri (hakem, modelin gördüğünü görsün). */
const ACT_TR: Record<PhonationBody["activityType"], string> = {
  sound_hunt: "Ses Avı",
  bingo: "Tombala",
  snakes_ladders: "Yılan Merdiven",
  sound_maze: "Ses Labirenti",
};
/** Route prompt'unun etkinlik türü kuralları (hakem "doğru yapı"yı bilsin). */
const YAPI: Record<PhonationBody["activityType"], string> = {
  sound_hunt: "sahne + nesneler (hedef sesli ve çeldirici nesneler karışık); grid BOŞ",
  bingo:
    "öğe sayısına göre kare ızgara (9→3×3, 16→4×4, 25→5×5), tüm kelimeler hedef sesli; scene ve objects BOŞ. Arayüz kare ızgarada ortadaki kareyi (konum ⌈n/2⌉) kelime yerine serbest kare yapar: o karenin kelimesi kullanıcıya gösterilmez",
  snakes_ladders:
    "öğe sayısı kadar kare, ızgara satır = öğe/5 × 5 sütun, her karede hedef sesli kelime, bazı karelerde merdiven (doğru söylersen yukarı) ve yılan (yeniden dene); scene ve objects BOŞ",
  sound_maze:
    "ızgara tabanlı basit labirent: doğru yol hedef sesli kelimeler (hasTargetSound true), yanlış yollar hedef sesi içermeyen kelimeler (false); scene ve objects BOŞ",
};
const GENERIC_NOT = ["Çok duyulu yaklaşım kullanın.", "Düzenli tekrar önemlidir.", "Bireysel farklılıklara dikkat edin."];

/** Kelime kaynağı notu: son içerikteki kelimeleri model mi banka mı yazdı (puanlayıcıyla aynı karar, `kelimeKaynagi`). */
function kelimeNotu(b: PhonationBody, ogrencili: boolean): string {
  if (kelimeKaynagi(b.targetSounds, ogrencili) === "banka") {
    return "- Kelime kaynağı: kelimeler, görsel komutları ve (tombala/yılan–merdivende) hedef etiketleri sistem tarafından uzman-onaylı bankadan yazıldı (iki adayda aynı); model 'geçici kelime yaz, sistem değiştirecek' talimatını alır. Modelin payı YAPIDIR (sahne, öğe sayısı, ızgara, konumlar, hedef–çeldirici dağılımı, merdiven/yılan, yönerge, uzman notları, uyarlamalar): kelime seçimini değil yapıyı değerlendir.";
  }
  if (!bankaVar(b.targetSounds)) return "- Kelime kaynağı: bu ses(ler) bankada yok; kelimeleri model seçer.";
  return "- Kelime kaynağı: bilinen ürün hatası yüzünden öğrenci seçiliyken banka kelimeleri sonradan yazılmaz; modelin 'geçici' kelimeleri, görsel komutları ve etiketleri olduğu gibi kalır (prompt modele kelimelerin değişeceğini söylese de). Kelimeleri yine hedef sesi taşıma, gerçek ve yaşa uygun kelime olma açısından değerlendir; iki adaya eşit yükle.";
}

/** Konum/satır/sütun gibi sayısal alan: sayı ya da sayı metni olduğu gibi, yoksa `yedek`, başka türde "?". */
const sayiMetni = (v: unknown, yedek?: number) =>
  typeof v === "number" && Number.isFinite(v) ? String(v) : typeof v === "string" && v.trim() ? v.trim() : v === undefined && yedek !== undefined ? String(yedek) : "?";
const etiket = (v: unknown) => (v === true ? "hedef" : v === false ? "çeldirici" : "etiket yok");
const SERBEST = "⭐ serbest kare";

/** Hakem çizimi, çıktının kelimelerini KİM yazdıysa ona göre: kelimeleri sistem bankadan yazdıysa (öğrencisiz istek; çıktıdaki görsel
    komutları bankayla aynı) kelime ve görsel satırları iki adayda da aynı olduğundan tek satırda listelenir ve görsel komutu atılır;
    modelin 'geçici' açıklamaları da kelime değişince bayatladığından (rota yalnız ad, görsel komutu ve etiketi ezer) gösterilmez.
    Modelin kendi kelimeleri (öğrencili istek) tam satırlarla gösterilir. Bu karar çıktının kendisinden verilir (`bankaYazmis`): ürün
    düzelip öğrenci seçiliyken de banka yazarsa çizim kendiliğinden sıkışır. */
function ciz(a: Rec): string {
  const grid = nesneVeyaNull(a.grid);
  const cells = kayitlar(grid?.cells);
  const objects = kayitlar(a.objects);
  const hunt = a.activityType === "sound_hunt" || (a.activityType === undefined && objects.length > 0 && cells.length === 0);
  const sesler = (Array.isArray(a.targetSounds) ? a.targetSounds : []).filter((x): x is string => typeof x === "string");
  const banka = bankaYazmis(hunt ? objects : cells, hunt, sesler);
  const serbest = a.activityType === "bingo" ? bingoSerbestPozisyon(grid) : null;
  const no = (c: Rec, i: number) => sayiMetni(c.position, i + 1);
  const serbestMi = (c: Rec) => serbest !== null && sayiOf(c.position) === serbest;
  const bayrak = (c: Rec) => [c.isLadder === true ? "merdiven" : "", c.isSnake === true ? "yılan" : ""].filter(Boolean).join(" · ");
  const ozel = (c: Rec) => [bayrak(c), str(c.instruction) ? `— ${str(c.instruction)}` : ""].filter(Boolean).join(" ");

  const nesneSatirlari = banka
    ? [`Nesneler (sistem bankadan yazdı): ${objects.map((x) => `${str(x.name) || "—"} [${etiket(x.hasTargetSound)}]`).join(", ")}`]
    : objects.map((x) => `• ${str(x.name) || "—"} [${etiket(x.hasTargetSound)}]${str(x.description) ? ` ${str(x.description)}` : ""} · görsel: ${str(x.visualPrompt) || "—"}`);

  const konumlar = (f: (c: Rec) => boolean) => cells.flatMap((c, i) => (f(c) ? [no(c, i)] : [])).join(", ");
  const hucreSatirlari = banka
    ? [
        `Kelimeler (sistem bankadan yazdı; konum sırasıyla): ${cells.map((c) => (serbestMi(c) ? SERBEST : str(c.word) || "—")).join(", ")}`,
        // Etiketler yalnız hepsi 'hedef' değilse (labirent) konum listesi olarak: hakem doğru yolu konumlardan okur.
        ...(cells.every((c) => c.hasTargetSound === true)
          ? []
          : [`Hedef konumlar: ${konumlar((c) => c.hasTargetSound === true) || "—"}`, `Çeldirici konumlar: ${konumlar((c) => c.hasTargetSound === false) || "—"}`, ...(cells.some((c) => typeof c.hasTargetSound !== "boolean") ? [`Etiketsiz konumlar: ${konumlar((c) => typeof c.hasTargetSound !== "boolean")}`] : [])]),
        ...cells.flatMap((c, i) => (ozel(c) ? [`${no(c, i)}. ${ozel(c)}`] : [])),
      ]
    : cells.map((c, i) =>
        serbestMi(c)
          ? `${no(c, i)}. ${SERBEST} (arayüz kelimeyi göstermez)`
          : `${no(c, i)}. ${str(c.word) || "—"} [${etiket(c.hasTargetSound)}]${c.isLadder === true ? " · merdiven" : ""}${c.isSnake === true ? " · yılan" : ""}${str(c.instruction) ? ` — ${str(c.instruction)}` : ""} · görsel: ${str(c.visualPrompt) || "—"}`,
      );

  return [
    `Başlık: ${str(a.title) || "—"}`,
    str(a.scene) ? `Sahne: ${str(a.scene)}` : "",
    ...nesneSatirlari,
    grid ? `Izgara ${sayiMetni(grid.rows)}×${sayiMetni(grid.cols)}:` : "",
    ...hucreSatirlari,
    `Yönerge: ${str(a.instructions) || "—"}`,
    `Uzman notları: ${str(a.expertNotes) || "—"}`,
    `Uyarlamalar: ${str(a.adaptations) || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const adapter = studioAdapter<PhonationBody>({
  id: "studio/phonation",
  label: "Sesletim oyunu (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/phonation/route"),
  responseKey: "activity",
  studentRequired: false,

  requestLines: (b, f) => [
    `- Aktivite türü: ${ACT_TR[b.activityType]} · Hedef ses(ler): ${b.targetSounds.join(", ")} · Zorluk: ${DIFFICULTY_LABEL[b.difficulty]} · Öğe sayısı: ${b.itemCount} · Tema: ${b.theme || "Karışık (tema yok)"}`,
    `- Yapı kuralı (route prompt'u): ${YAPI[b.activityType]}.`,
    kelimeNotu(b, f !== null),
  ],

  renderOutput: (o) => ciz(o as Rec),

  checks: phonationChecks,

  criteria: [
    {
      key: "ses_dogrulugu",
      question:
        "Hedef/çeldirici etiketleri kelimelerle tutarlı mı; kelimeler gerçek, yaşa uygun ve hedef sesi belirgin biçimde taşıyor mu; çeldiriciler gerçekten hedef sesi içermiyor mu? Kelimeleri sistem bankadan yazdıysa (istek notu) kelime seçimini değil etiket ve yapı tutarlılığını değerlendir.",
    },
    {
      key: "oyun_uygulanabilirligi",
      question:
        "Yönerge ve yapı (sahne, ızgara, yılan/merdiven, labirent) seansta çıktı alınıp hemen oynanabilir mi: kurallar net ve zorluğa/yaşa uygun mu; sahne/kelimeler temayla uyumlu mu (tema yoksa karışık); labirentte girişten (ilk kare) çıkışa (son kare) hedef sesli kelimelerden geçen bir doğru yol var mı; yılan–merdivende başlangıç/bitiş ve merdiven/yılan yerleşimi anlamlı mı? (Tombalada ortadaki serbest karenin kelimesi değerlendirilmez.)",
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`). Yapı (sahne, ızgara, öğeler, etiketler, konumlar, yılan/merdiven) ve
  // başlık aynı kalır; nesne açıklamaları, yönerge ve notlar jenerik olur. Yasak kalıplar SABİT (üst düzey) alanlardan gelir:
  // öğesiz kısa çıktıda da ≥ 4 kalıp taşınır.
  generic(o) {
    const a = o as Rec;
    return {
      ...a,
      objects: Array.isArray(a.objects) ? kayitlar(a.objects).map((x) => ({ ...x, description: "Bir nesne." })) : a.objects,
      instructions: `Oyunu kurallarına göre oynayın. ${GENERIC_NOT[0]}`,
      expertNotes: `${GENERIC_NOT[1]} Sabırlı olun.`,
      adaptations: `${GENERIC_NOT[2]} Olumlu pekiştirme yapın.`,
    };
  },
});
