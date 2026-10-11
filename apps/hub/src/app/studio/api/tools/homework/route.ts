import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";

/* Ev ödevi materyali — spec A1 prompt'u (Faz 2 / Task 4, tur 2).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2) olduğu gibi gömer — eski "Öğrenci
   bilgileri" satırları kalktı, kimlik bloktadır. JSON alan adları, istemci, PDF, `enrichContent`,
   kredi ve SSE DEĞİŞMEZ (A4). Sözleşme: `prompt.test.ts`.
   Tur 1 hakem kaybı: yetişkine çocuk döngüsü + belirsiz süre (hw-04), gözlem formu sığ (hw-02) →
   döngü koşullu, adım dakikaları süreye eşit, gözlem maddesi NE / NE ZAMAN / NASIL NOT EDİLİR,
   yetişkinde muhatap öğrencinin kendisi (etiket + hatırlatma koddan). */

const bodySchema = z.object({
  studentId:    z.string().min(1),
  targetArea:   z.string().min(1).max(300),
  duration:     z.enum(["10", "15", "20"]),
  parentLevel:  z.enum(["basic", "detailed"]),
  materialType: z.enum(["exercise", "observation", "daily_activity"]),
  extraNote:    z.string().max(500).optional(),
});
type HomeworkBody = z.infer<typeof bodySchema>;

/** Parametre etiketleri — eval adaptörü (`evals/tools/studio/homework/adapter.ts`) hakeme aynı tanımı gösterir. */
const PARENT_LEVEL_LABEL: Record<HomeworkBody["parentLevel"], string> = {
  basic:    "Temel (basit anlatım, teknik terim yok)",
  detailed: "Detaylı (daha fazla açıklama, bazı teknik bilgi)",
};

const MATERIAL_TYPE_LABEL: Record<HomeworkBody["materialType"], string> = {
  exercise:       "Ev egzersizi (adım adım yapılandırılmış aktivite)",
  observation:    "Gözlem formu (velinin çocuğu gözlemleyip not alacağı form)",
  daily_activity: "Günlük konuşma aktivitesi (günlük rutinlere entegre edilecek aktivite)",
};

/** Süre → [en az, en çok] adım. Tek kaynak: odak satırı üst sınırı, klinik çerçeve aralığı buradan türer. */
const ADIM: Record<HomeworkBody["duration"], readonly [number, number]> = { "10": [3, 4], "15": [4, 5], "20": [5, 6] };
const SURELER = Object.keys(ADIM) as HomeworkBody["duration"][];
export const ADIM_UST_SINIRI = Object.fromEntries(SURELER.map((d) => [d, ADIM[d][1]])) as Record<HomeworkBody["duration"], number>;
const SURE_ADIM = `${SURELER.map((d) => `${d} dk → ${ADIM[d][0]}–${ADIM[d][1]}`).join(", ")} adım`;

/** Türün tek satır tanımı: klinik çerçevede ve odak satırında aynı metin (model aynı tanımı iki kez görür). */
export const MATERIAL_TYPE_TANIM: Record<HomeworkBody["materialType"], string> = {
  exercise:       "adım adım ev etkinliği; her adım '(N dk)' ile başlayan tek eylem, toplam = süre",
  observation:    "gözlem formu, süre = gözlem penceresi; her adım bir gözlenebilir davranış: NE (davranış) / NE ZAMAN (rutin) / NASIL NOT EDİLİR (işaret, sayı, örnek); okuyan izler ve yazar",
  daily_activity: "var olan rutine (yemek, banyo, yol) iliştirilen fırsatlar; her adım '(N dk)' ile başlayan rutin anı, toplam = süre; masa başı yok",
};
const TURLER = Object.keys(MATERIAL_TYPE_TANIM) as HomeworkBody["materialType"][];

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab'in ev çalışması üreticisisin. Materyali uzman verir; OKUYAN velidir (öğrenci 18 yaş ve üzeriyse kendisi). Kayıt: sıcak, somut, günlük Türkçe; okuyana "siz" ile öneri kipi. "Temel" düzey: okuyana giden alanlarda teknik terim HİÇ yazma, günlük karşılığını yaz. "Detaylı": terim yazılabilir; ilk geçişte parantez içinde tek yan cümleyle açıklanır; introduction becerinin önemini bir cümleyle söyler. expertNotes yalnız uzmana: terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli.`,
  klinikCerceve: [
    `Ev çalışması seans hedefinin GENELLEMESİDİR: aynı beceri, evde, ev malzemesiyle. Yeni bir beceri ÖĞRETMEYE kalkma; bloktaki "Sürmekte olan hedefler" / "Sonraki plan" varsa hedef onunla aynı çizgide.`,
    `Hedef davranış TEK ve GÖZLENEBİLİR: okuyanın görüp sayabileceği bir şey.`,
    `Çocukta exercise ve daily_activity adımları döngüyü içerir: MODEL OL (hedef biçimi bir kez) → BEKLE (5 saniye, sessiz) → GENİŞLET ("su" → "su istiyorum"). Hata anında düzeltme yok: doğru modeli bir kez daha söyle, nesneyi yine ver.`,
    `observation'da döngü yazılmaz. Yetişkinde döngü kendi uygulamasıdır: dene → kaydı dinle → tek ölçütle değerlendir ("nefes yetti mi").`,
    `Süre adım sayısını belirler: ${SURE_ADIM}; adım dakikalarının toplamı = süre. Yaş küçükse ya da uzman notu kısa dikkat süresi söylüyorsa adımlar 1–2 dakikalıktır.`,
    ...TURLER.map((t) => `${t}: ${MATERIAL_TYPE_TANIM[t]}.`),
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `targetArea her adımda görünür: instruction hedefin somut biçimini (ses, sözcük, cümle kalıbı) içerir.`,
    `"Uzman notları" ve "Uzman ek notu" adımın biçimini belirler: en az bir adım ya da ipucu notu doğrudan karşılar (ör. "sözlü yanıt baskısında kapanıyor" → soru değil model ol, bekle). İlgi alanı çoğu kez oradadır ("…bayılıyor"): materials'a ve en az iki adıma taşı.`,
    `Öğrenci 18 yaş ve üzeriyse okuyan öğrencinin KENDİSİdir ("siz" = öğrenci); yakını yalnız dinleyici/geri bildirim rolünde anılır. "veli", "çocuğunuz", "oyun" yazma; hedef iş/okul/aile hedefine bağlanır.`,
    `Her instruction en az bir "…ebilirsiniz/…abilirsiniz" ya da "isterseniz …" içerir; hiçbir okuyan alanında "-malı/-meli", "gerekir", "gerekiyor", "lazım", "şart", "zorunda" yok. Öğrencinin sözleri tek tırnak içinde.`,
  ],
  karsitOrnek: {
    zayif: "Her gün 10 dakika hedef sesi çalışın, sabırlı olun.",
    iyi: "Akşam yemeğinde tabağa 3 kaşık koyabilirsiniz; her kaşıkta 'kaşık' deyip 5 saniye bekleyebilirsiniz; çocuk /k/ ile 'kaşık' derse 'kaşık ver' diye genişletip kaşığı verebilirsiniz; demezse aynı sözcüğü bir kez daha söyleyip yine verebilirsiniz.",
  },
  bicim: {
    giris: "SADECE tek parça, geçerli JSON yaz; açıklama/Markdown çiti yok. Alan adları aynen:",
    sema: `{
  "title": "…",
  "materialType": "exercise|observation|daily_activity",
  "duration": "…",
  "targetArea": "…",
  "introduction": "…",
  "materials": ["…"],
  "steps": [{ "stepNumber": 1, "instruction": "…", "tip": "…" }],
  "watchFor": "…",
  "celebration": "…",
  "frequency": "…",
  "expertNotes": "…",
  "adaptations": "Kolay: … Zor: …"
}`,
    butce: [
      `title: ≤ 8 kelime; bağlam + hedef davranış.`,
      `introduction: ≤ 3 cümle — becerinin evdeki hâli, ne gözleneceği, günde kaç dakika.`,
      `materials: 0–5 madde ≤ 10 kelime; evde bulunan ya da ilgi alanından (satın alma yok); gerekmiyorsa [].`,
      `steps: sayı süreye göre; stepNumber 1'den ardışık; exercise/daily_activity'de instruction "(N dk)" ile başlar, ≤ 2 cümle (tek eylem + öğrencinin söyleyeceği şey), toplam = süre; observation'da ≤ 3 cümle; tip ≤ 1 cümle (yanıt gelmezse ne yapılır; gereksizse "").`,
      `watchFor: ≤ 3 cümle — 1–2 gözlenebilir işaret + ne zaman bırakılacağı.`,
      `celebration: ≤ 2 cümle — sevinci paylaşan somut söz/eylem; ödül yok.`,
      `frequency: ≤ 2 cümle — haftada kaç gün, hangi rutin.`,
      `expertNotes: ≤ 3 cümle — veliye verirken vurgu, dayandığı profil verisi.`,
      `adaptations: tek dizede "Kolay: …" ve "Zor: …", her biri ≤ 2 cümle.`,
    ],
  },
  ozDenetim: [
    `Adım sayısı ve dakika toplamı süreye uyuyor mu?`,
    `Her adımda hedef alan geçiyor ve profildeki bir veriye bağlı mı?`,
    `Öneri kipi var; "-malı/-meli", "gerekir" yok; Temel düzeyde terim yok; yetişkinde "veli/çocuğunuz" yok mu?`,
    `Ödül, puan, çıkartma yok mu; "hasta/terapist" yok mu?`,
    `JSON tek parça, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): çocukta veliye öneri kipi, yetişkinde muhatap; ikincisi ortak. */
export const HATIRLATMA = {
  veli:     "Veliye öneri kipi ('yapabilirsiniz').",
  yetiskin: "Okuyan öğrencinin kendisi ('siz' = öğrenci); 'veli/çocuğunuz' yazma.",
  ortak:    "Her adım hedef alana ve profildeki bir veriye bağlı.",
} as const;

const YETISKIN_YASI = 18;

/**
 * 18+ öğrencide okuyan velisi değil kendisidir. Doğum tarihi varsa yaş oradan (kapıdaki `calcAgeYears`
 * ile aynı yıl farkı); yoksa kapının verdiği yaş metni ("34 yaşında"); ikisi de yoksa veli varsayılır.
 */
export function yetiskinMi(student: { birthDate: Date | null } | null, ageText: string): boolean {
  const yas = student?.birthDate
    ? new Date().getFullYear() - new Date(student.birthDate).getFullYear()
    : Number(/^(\d+)\s/.exec(ageText)?.[1]);
  return Number.isFinite(yas) && yas >= YETISKIN_YASI;
}

/** A1 odak satırı — koddan türetilir: süre → adım üst sınırı; tür → tek satır tanımı. */
export function odakSatiri(duration: HomeworkBody["duration"], materialType: HomeworkBody["materialType"]): string {
  return `Süre ${duration} dk → en çok ${ADIM_UST_SINIRI[duration]} adım; tür ${materialType} → ${MATERIAL_TYPE_TANIM[materialType]}.`;
}

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → odak → son hatırlatma. */
export function buildUserPrompt(data: HomeworkBody, student: { birthDate: Date | null } | null, ageText: string, ctx: ToolPromptContext): string {
  const yetiskin = yetiskinMi(student, ageText);
  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Hedef çalışma alanı: ${data.targetArea}`,
      `- Süre: ${data.duration} dakika`,
      `- ${yetiskin ? "Okuyan" : "Veli"} bilgi düzeyi: ${PARENT_LEVEL_LABEL[data.parentLevel]}`,
      `- Materyal türü: ${MATERIAL_TYPE_LABEL[data.materialType]}`,
      ...(data.extraNote ? [`- Uzman ek notu: ${data.extraNote}`] : []),
    ],
    odak: odakSatiri(data.duration, data.materialType),
    hatirlatma: [yetiskin ? HATIRLATMA.yetiskin : HATIRLATMA.veli, HATIRLATMA.ortak],
  });
}

export const POST = createToolHandler({
  rateLimitKey: "homework",
  bodySchema,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "HOMEWORK_MATERIAL",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Ev ödevi materyali üretimi",
  responseKey: "homework",
  fallbackTitle: "Ev Ödevi Materyali",

  buildUserPrompt,

  enrichContent(content, data) {
    content.targetArea   = data.targetArea;
    content.materialType = data.materialType;
    content.duration     = `${data.duration} dakika`;
  },
});
