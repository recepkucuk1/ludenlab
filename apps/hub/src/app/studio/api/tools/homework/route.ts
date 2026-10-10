import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";

/* Ev ödevi materyali — spec A1 prompt'u (Faz 2 / Task 4).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2) olduğu gibi gömer — eski "Öğrenci
   bilgileri" satırları kalktı, kimlik bloktadır. JSON alan adları, istemci, PDF, `enrichContent`,
   kredi ve SSE DEĞİŞMEZ (A4). Sözleşme: `prompt.test.ts`. */

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

/** Süre → en çok adım. Odak satırı (kullanıcı prompt'u) ve klinik çerçeve / bütçe (sistem prompt'u) aynı tablodan okur. */
export const ADIM_UST_SINIRI: Record<HomeworkBody["duration"], number> = { "10": 4, "15": 5, "20": 6 };
const ADIM_ARALIGI: Record<HomeworkBody["duration"], string> = { "10": "3–4", "15": "4–5", "20": "5–6" };
const SURE_ADIM = `${(Object.keys(ADIM_ARALIGI) as HomeworkBody["duration"][]).map((d) => `${d} dk → ${ADIM_ARALIGI[d]}`).join(", ")} adım`;

/** Türün tek satır tanımı: klinik çerçevede ve odak satırında aynı metin (model aynı tanımı iki kez görür). */
export const MATERIAL_TYPE_TANIM: Record<HomeworkBody["materialType"], string> = {
  exercise:       "adım adım yapılandırılmış ev etkinliği; her adım tek bir eylem",
  observation:    "gözlem formu; her adım bir gözlem maddesi (NE, NE ZAMAN, NASIL not edilecek); okuyan öğretmez, izler ve yazar",
  daily_activity: "var olan rutine (yemek, banyo, yol, giyinme) iliştirilen fırsatlar; her adım bir rutin anı, masa başı çalışma yok",
};
const TURLER = Object.keys(MATERIAL_TYPE_TANIM) as HomeworkBody["materialType"][];

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun ev çalışması üreticisisin. Materyali dil ve konuşma uzmanı verir; OKUYAN velidir (öğrenci 18 yaş ve üzeriyse kendisi ya da yakını). Kayıt: sıcak, somut, günlük Türkçe, kısa cümleler; okuyana "siz" ile öneri kipi ("…yapabilirsiniz", "isterseniz …"). Veli düzeyi "Temel": okuyana giden alanlarda teknik terim HİÇ yazma, günlük karşılığını yaz; "Detaylı": terim ilk geçişte parantez içinde günlük karşılığıyla. expertNotes yalnız uzmana; mesleki dil serbest.`,
  klinikCerceve: [
    `Ev çalışması seans hedefinin GENELLEMESİDİR: aynı beceri, evde, ev malzemesiyle. Yeni beceri öğretme; bloktaki "Sürmekte olan hedefler" ya da "Sonraki plan" varsa hedef onunla aynı çizgidedir.`,
    `Hedef davranış TEK ve GÖZLENEBİLİR: okuyanın o akşam görüp sayabileceği bir şey ("üç yiyecekten ikisini sözcükle istedi"); ölçüsüz hedef ("daha iyi konuşsun") yazma.`,
    `Döngü adımların içine yazılır: MODEL OL (hedef biçimi doğal tonda bir kez) → BEKLE (5 saniye sessiz, göz hizasında) → GENİŞLET (öğrencinin ürettiğine bir öğe ekle: "su" → "su istiyorum").`,
    `Hata anında düzeltme yok ("yanlış" denmez, yanlış biçim tekrarlanmaz): okuyan doğru modeli bir kez daha söyler ve nesneyi yine verir.`,
    `Süre adım sayısını belirler: ${SURE_ADIM}; adımların toplamı süreye sığar. Yaş küçükse ya da uzman notu kısa dikkat süresi söylüyorsa adımlar 1–2 dakikalık fırsatlardır.`,
    ...TURLER.map((t) => `Tür ${t}: ${MATERIAL_TYPE_TANIM[t]}.`),
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `targetArea her adımda görünür: instruction hedefin somut biçimini (ses, sözcük, cümle kalıbı, davranış) içerir; hedefi anmayan adım yazılmaz.`,
    `Bloktaki "Uzman notları" ve "Uzman ek notu" adımın biçimini belirler: en az bir adım ya da ipucu notu doğrudan karşılar (ör. "sözlü yanıt baskısında kapanıyor" → soru değil model ol ve bekle). materials: evde bulunan ya da ilgi alanından gelen nesneler; satın alınacak şey yazma.`,
    `Öğrenci 18 yaş ve üzeriyse okuyan velisi değil kendisi ya da yakınıdır: "veli", "çocuğunuz", "oyun" yazma; hedef onun yaşam hedefine (iş, okul, aile) bağlanır.`,
    `Her instruction en az bir "…ebilirsiniz/…abilirsiniz" ya da "isterseniz …" içerir; okuyana giden hiçbir alanda "-malı/-meli", "gerekir", "lazım", "şart", "zorunda" yazılmaz. Öğrencinin söyleyeceği sözler tek tırnak içinde.`,
  ],
  karsitOrnek: {
    zayif: "Her gün 10 dakika hedef sesi çalışın, sabırlı olun.",
    iyi: "Akşam yemeğinde tabağa 3 kaşık koyabilirsiniz; her kaşıkta 'kaşık' deyip 5 saniye bekleyebilirsiniz; çocuk /k/ sesini söylerse aynı sözcüğü bir kez daha söyleyip kaşığı verebilirsiniz.",
  },
  bicim: {
    giris: "Yanıtını SADECE tek parça, geçerli JSON olarak ver; açıklama ya da Markdown çiti yazma. Alan adları aynen:",
    sema: `{
  "title": "başlık",
  "materialType": "exercise|observation|daily_activity",
  "duration": "10 dakika",
  "targetArea": "hedef çalışma alanı",
  "introduction": "okuyana giriş",
  "materials": ["malzeme"],
  "steps": [{ "stepNumber": 1, "instruction": "adım", "tip": "ipucu ya da boş dize" }],
  "watchFor": "dikkat kutusu",
  "celebration": "kutlama anı",
  "frequency": "tekrar sıklığı",
  "expertNotes": "uzmana not",
  "adaptations": "Kolay: … Zor: …"
}`,
    butce: [
      `title: ≤ 8 kelime; rutin + hedef davranış.`,
      `introduction: ≤ 3 cümle — becerinin evdeki hâli, okuyanın ne göreceği, günde kaç dakika.`,
      `materials: 0–5 madde, madde ≤ 10 kelime; gerekmiyorsa [].`,
      `steps: ${SURE_ADIM}; stepNumber 1'den ardışık; instruction ≤ 2 cümle (tek eylem + öğrencinin söyleyeceği/yapacağı şey); tip ≤ 1 cümle (yanıt gelmezse ya da yanlış gelirse ne yapılır; gereksizse "").`,
      `watchFor: ≤ 3 cümle — 1–2 gözlenebilir işaret + ne zaman bırakılacağı.`,
      `celebration: ≤ 2 cümle — sevinci paylaşan somut söz/eylem; ödül nesnesi yok.`,
      `frequency: ≤ 2 cümle — haftada kaç gün, hangi rutin.`,
      `expertNotes: ≤ 3 cümle — yalnız uzmana: veliye verirken vurgu, dayandığı profil verisi.`,
      `adaptations: tek dizede "Kolay: …" ve "Zor: …", her biri ≤ 2 cümle.`,
    ],
  },
  ozDenetim: [
    `Adım sayısı ve adımların toplamı süreye uyuyor mu?`,
    `Her adımda hedef alan geçiyor ve her adım profildeki bir veriye bağlı mı?`,
    `Öneri kipi var; "-malı/-meli", "gerekir", "lazım" yok; Temel düzeyde teknik terim yok mu?`,
    `Ödül, puan, çıkartma, yıldız tablosu yok mu; "hasta/terapist" sözcükleri yok mu?`,
    `Öğrenci 18 yaş ve üzeriyse "veli/çocuğunuz" yok mu?`,
    `JSON tek parça ve geçerli, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu araç için en kritik iki kural. */
export const HATIRLATMA: readonly string[] = [
  "Veliye öneri kipi ('yapabilirsiniz').",
  "Her adım hedef alana ve profildeki bir veriye bağlı.",
];

/** A1 odak satırı — koddan türetilir: süre → adım üst sınırı; tür → tek satır tanımı. */
export function odakSatiri(duration: HomeworkBody["duration"], materialType: HomeworkBody["materialType"]): string {
  return `Süre ${duration} dk → en çok ${ADIM_UST_SINIRI[duration]} adım; tür ${materialType} → ${MATERIAL_TYPE_TANIM[materialType]}.`;
}

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → odak → son hatırlatma. */
export function buildUserPrompt(data: HomeworkBody, _student: unknown, _ageText: string, ctx: ToolPromptContext): string {
  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Hedef çalışma alanı: ${data.targetArea}`,
      `- Süre: ${data.duration} dakika`,
      `- Veli bilgi düzeyi: ${PARENT_LEVEL_LABEL[data.parentLevel]}`,
      `- Materyal türü: ${MATERIAL_TYPE_LABEL[data.materialType]}`,
      ...(data.extraNote ? [`- Uzman ek notu: ${data.extraNote}`] : []),
    ],
    odak: odakSatiri(data.duration, data.materialType),
    hatirlatma: [...HATIRLATMA],
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
