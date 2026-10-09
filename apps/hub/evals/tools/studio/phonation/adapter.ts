// apps/hub/evals/tools/studio/phonation/adapter.ts
import { DIFFICULTY_LABEL } from "@studio/lib/constants";
import { studioAdapter } from "../../../lib/adapterFactory";
import { kayitlar, nesneVeyaNull, str } from "../../../lib/sharedChecks";
import { bankaVar, kelimeKaynagi, phonationChecks, type PhonationBody } from "./checks";

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
  bingo: "öğe sayısına göre kare ızgara (9→3×3, 16→4×4, 25→5×5), tüm kelimeler hedef sesli; scene ve objects BOŞ",
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

  renderOutput(o) {
    const a = o as Rec; // JSON modu: çıktı nesnesi
    const grid = nesneVeyaNull(a.grid);
    const cells = kayitlar(grid?.cells);
    const objects = kayitlar(a.objects);
    return [
      `Başlık: ${str(a.title) || "—"}`,
      str(a.scene) ? `Sahne: ${str(a.scene)}` : "",
      ...objects.map((x) => `• ${str(x.name) || "—"} [${etiket(x.hasTargetSound)}]${str(x.description) ? ` ${str(x.description)}` : ""} · görsel: ${str(x.visualPrompt) || "—"}`),
      grid ? `Izgara ${sayiMetni(grid.rows)}×${sayiMetni(grid.cols)}:` : "",
      ...cells.map(
        (c, i) =>
          `${sayiMetni(c.position, i + 1)}. ${str(c.word) || "—"} [${etiket(c.hasTargetSound)}]${c.isLadder === true ? " · merdiven" : ""}${c.isSnake === true ? " · yılan" : ""}${str(c.instruction) ? ` — ${str(c.instruction)}` : ""} · görsel: ${str(c.visualPrompt) || "—"}`,
      ),
      `Yönerge: ${str(a.instructions) || "—"}`,
      `Uzman notları: ${str(a.expertNotes) || "—"}`,
      `Uyarlamalar: ${str(a.adaptations) || "—"}`,
    ]
      .filter(Boolean)
      .join("\n");
  },

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
        "Yönerge ve yapı (sahne, ızgara, yılan/merdiven, labirent) seansta çıktı alınıp hemen oynanabilir mi: kurallar net ve zorluğa/yaşa uygun mu; labirentte girişten (ilk kare) çıkışa (son kare) hedef sesli kelimelerden geçen bir doğru yol var mı; yılan–merdivende başlangıç/bitiş ve merdiven/yılan yerleşimi anlamlı mı?",
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
