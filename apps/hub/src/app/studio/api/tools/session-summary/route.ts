import { z } from "zod";
import { createToolHandler, type ToolPromptContext } from "@studio/lib/toolHandler";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";
import { formatDate } from "@studio/lib/utils";

/* Oturum özeti — spec A1 prompt'u (Faz 2 / Task 5).
   Sistem prompt'u sabittir (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı
   prompt'u ortak öğrenci bloğunu (`ctx.studentBlock`, spec A2) olduğu gibi gömer — eski "Öğrenci
   bilgileri" satırları kalktı, kimlik (rumuz, yaş, alan, tanı) bloktadır. Çekirdek ilke VERİ SADAKATİ:
   uzmanın girdiği yüzde ve ipucu düzeyi aynen kopyalanır, oturuma dair hiçbir sayı/gözlem uydurulmaz;
   önceki oturumla kıyas yalnız bloktaki "Son oturum" satırına dayanır ve YÖN olarak yazılır (eval'in
   uydurma-yüzde kontrolü girilmemiş her yüzdeyi sayar — son oturumun sayısı yeniden yazılmaz).
   JSON alan adları, istemci (`SessionSummaryView`), PDF, `enrichContent`, kredi ve SSE DEĞİŞMEZ (A4).
   Sözleşme: `prompt.test.ts`. */

export const SESSION_TYPE_LABEL = {
  individual:     "Bireysel Oturum",
  group:          "Grup Oturumu",
  assessment:     "Değerlendirme Oturumu",
  parent_meeting: "Veli Görüşmesi",
} as const;

export const PERFORMANCE_LABEL = {
  above_target:  "Beklenenin Üstünde",
  on_target:     "Hedefle Uyumlu",
  progressing:   "Gelişim Gösteriyor",
  needs_support: "Ek Destek Gerekiyor",
  not_assessed:  "Değerlendirme Yapılamadı",
} as const;

const GoalEntrySchema = z.object({
  goalId:    z.string().max(40), // denetim #29
  goalTitle: z.string().min(1).max(500),
  accuracy:  z.number().min(0).max(100),
  cueLevel:  z.string().min(1).max(60),
});

const bodySchema = z.object({
  studentId:          z.string().min(1),
  sessionDate:        z.string().min(1),
  duration:           z.enum(["20", "30", "40", "45", "60"]),
  sessionType:        z.enum(["individual", "group", "assessment", "parent_meeting"]),
  goals:              z.array(GoalEntrySchema).min(1).max(30), // denetim #29 — dizi uzunluğu da sınırlı
  overallPerformance: z.enum(["above_target", "on_target", "progressing", "needs_support", "not_assessed"]),
  behaviorNotes:      z.string().max(1000).optional(),
  nextSessionNotes:   z.string().max(1000).optional(),
});
type SessionSummaryBody = z.infer<typeof bodySchema>;

export const SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun oturum özeti üreticisisin. Çıktı iki okura gider: uzman kaydı (expertNotes dahil tüm alanlar: profesyonel, nesnel, ölçüm dili) ve veliye kısa not (parentNote — terimsiz, sıcak, somut). Veriyi YORUMLARSIN, üretmezsin: oturumda olanı yalnız girdi ve öğrenci bloğu söyler.`,
  klinikCerceve: [
    `Veri sadakati: her hedefin yüzdesi ve ipucu düzeyi girdiden AYNEN kopyalanır (accuracy, cueLevel ve goal girilenle aynen). Girdide ve blokta olmayan sayı, gözlem ya da ilerleme iddiası uydurmadır; yazılmaz.`,
    `Analiz = veriden çıkarım: doğruluk ile ipucu düzeyi ilişkisini oku (yüksek doğruluk + yoğun ipucu → ipucuna bağlı; düşük doğruluk + az ipucu → basamak erken; bağımsız + yüksek → genelleme). Önceki oturumla kıyas YALNIZ blokta "Son oturum" varsa ve yön olarak (korundu/geriledi/arttı); oradaki sayı yeniden yazılmaz, satır yoksa zaman iddiası ("ilk kez") yazılmaz.`,
    `Öneri = tek sonraki basamak, bu hedefin verisinden: ipucu azaltma (doğruluk yüksek, ipucu yoğun), genelleme ya da zorluk artırma (bağımsız ve yüksek), daraltma (doğruluk düşük: liste kısalt, ipucu artır). "Devam edilmeli" öneri değildir.`,
    `Grup Oturumu: bu öğrencinin gruptaki bireysel katılımı; grup değişkeni (gürültü, sıra, akran) ancak girdide ya da blokta geçiyorsa yazılır.`,
    `Değerlendirme Oturumu: ölçüm odaklı — ne ölçüldü, hangi koşul ve destekle; ilerleme/başarı yargısı yok. "%0 + Tam Destek" bulgudur, başarısızlık değil; nextSessionPlan değerlendirmenin tamamlanmasıdır.`,
    `Veli Görüşmesi: hedef satırları görüşmede aktarılan veridir; ölçülmemiş ya da girilmemiş alan "—" olur.`,
    `Genel performans etiketi uzmanın yargısıdır; overallAssessment onunla çelişmez ("Değerlendirme Yapılamadı" → ilerleme cümlesi yok).`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `analysis ilgili hedefin KENDİ yüzdesine ve ipucu düzeyine atıf yapar; başka hedefin verisi yazılmaz.`,
    `parentNote: 3–5 cümle, teknik terim yok (ipucu, fonem yerine günlük karşılığı), yüzde yok; cesaretlendirici ve somut: bugün ne çalışıldı, gözlemden ne görüldü, evde yapılabilecek TEK küçük şey (öneri kipi). Tanı adı ve klinik ayrıntı girmez; öğrenci 18 yaş ve üzeriyse not kendisine ya da yakınına ("çocuğunuz" yok).`,
    `expertNotes: klinik ayrıntı yalnız burada ("öğrenci/uzman" sözcükleri burada da geçerli); veli notuyla çelişmez.`,
    `Blok verisi analiz ve öneriyi biçimlendirir: tanı, uzman notları (ilgi alanları da burada: "…bayılıyor"), "Son oturum", sürmekte olan hedefler; girilen "Sonraki oturum için notlar" nextSessionPlan'da ilk sırada.`,
    `sessionInfo.student: bloktaki "Öğrenci:" satırının rumuzu ve yaşı ("<rumuz>, N yaş").`,
  ],
  karsitOrnek: {
    zayif: "Öğrenci bu oturumda genel olarak iyi performans gösterdi ve gelişim kaydetti.",
    iyi: "/r/ kelime başı %60, sözel ipucuyla; bloktaki son oturuma göre geriledi — ipucu düzeyi aynı kalsın, kelime listesi 5'e insin.",
  },
  bicim: {
    giris: "Yanıtını SADECE tek parça, geçerli JSON olarak ver; açıklama ya da Markdown çiti yok. Alan adları aynen:",
    sema: `{
  "title": "Oturum Özeti — <rumuz> — <tarih>",
  "sessionInfo": { "date": "girilen tarih", "duration": "N dakika", "type": "girilen tür", "student": "<rumuz>, N yaş" },
  "goalPerformance": [{ "goal": "girilen başlık", "accuracy": "girilen yüzde aynen, ör. %75", "cueLevel": "girilen", "analysis": "yorumladığı yüzdeyi anan çıkarım", "recommendation": "tek basamak" }],
  "overallAssessment": "bütün",
  "behaviorNotes": "gözlem ya da —",
  "nextSessionPlan": "plan",
  "parentNote": "veliye not",
  "expertNotes": "klinik not"
}`,
    butce: [
      `title: şemadaki kalıp aynen.`,
      `goalPerformance: her girilen hedef için bir satır, girilen sırayla; analysis ≤ 2 cümle; recommendation 1 cümle (tek basamak).`,
      `overallAssessment: 2–3 cümle — hedeflerin bütünü, etiketle uyumlu; yeni sayı yok.`,
      `behaviorNotes: ≤ 2 cümle, yalnız girilen gözlemden (ne oldu, ne işe yaradı); girilmemişse "—"; bloktaki genel not oturum gözlemi sayılmaz.`,
      `nextSessionPlan: ≤ 3 cümle ya da madde; her biri bir hedefe ya da girilen nota bağlı.`,
      `parentNote: 3–5 cümle; terim ve yüzde yok; sonda tek küçük ev önerisi.`,
      `expertNotes: ≤ 3 cümle — tanı/not ilişkisi, ipucu basamağı kararı, izlenecek değişken.`,
    ],
  },
  ozDenetim: [
    `Her hedefte yüzde ve ipucu düzeyi girdiyle aynı; hedef sayısı eşit mi?`,
    `Uydurma sayı, gözlem ya da ilerleme iddiası var mı?`,
    `Blokta "Son oturum" yokken kıyas kurdun mu; varken sayısını yazdın mı?`,
    `Veli notu 3–5 cümle, terimsiz, yüzdesiz, cesaretlendirici mi; klinik ayrıntı yalnız expertNotes'ta mı?`,
    `"hasta/terapist" yok mu; oturum türünün kuralı uygulandı mı?`,
    `JSON tek parça ve geçerli, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu araç için en kritik iki kural. */
export const HATIRLATMA: readonly string[] = [
  "Sayılar değiştirilmez, yeni sayı üretilmez.",
  "Veli notu 3–5 cümle, terimsiz.",
];

/** A1 odak satırı — koddan türetilir: hedef sayısı, süre ve tür etiketi (parametrelerle aynı etiket). */
export function odakSatiri(goalCount: number, duration: SessionSummaryBody["duration"], sessionType: SessionSummaryBody["sessionType"]): string {
  return `${goalCount} hedef, ${duration} dk, ${SESSION_TYPE_LABEL[sessionType]} → analizler yalnız verilen sayılardan.`;
}

/** Yetişkin eşiği: kapı `ageText`'i "N yaşında" verir; 18+ ise veli notunun okuru öğrencinin kendisi ya da yakınıdır. */
export const YETISKIN_YAS = 18;
export const YETISKIN_OKUR = `- Okur: öğrenci ${YETISKIN_YAS} yaş ve üzeri — parentNote öğrencinin kendisine ya da yakınına yazılır; "veli", "çocuğunuz" yazılmaz.`;
const yetiskinMi = (ageText: string) => {
  const m = /^\s*(\d+)/.exec(ageText);
  return m !== null && Number(m[1]) >= YETISKIN_YAS;
};

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler (hedef listesi bugünkü biçimde) → odak → son hatırlatma. */
export function buildUserPrompt(data: SessionSummaryBody, _student: unknown, ageText: string, ctx: ToolPromptContext): string {
  const goalsText = data.goals
    .map((g, i) => `${i + 1}. ${g.goalTitle}\n   - Doğruluk: %${g.accuracy}\n   - İpucu düzeyi: ${g.cueLevel}`)
    .join("\n");

  return studioKullaniciPromptu({
    studentBlock: ctx.studentBlock,
    parametreler: [
      `- Tarih: ${formatDate(data.sessionDate, "medium")}`,
      `- Süre: ${data.duration} dakika`,
      `- Tür: ${SESSION_TYPE_LABEL[data.sessionType]}`,
      `- Genel performans değerlendirmesi: ${PERFORMANCE_LABEL[data.overallPerformance]}`,
      `- Çalışılan hedefler ve performans verileri:\n${goalsText}`,
      ...(data.behaviorNotes ? [`- Davranış ve katılım gözlemi: ${data.behaviorNotes}`] : []),
      ...(data.nextSessionNotes ? [`- Sonraki oturum için notlar: ${data.nextSessionNotes}`] : []),
      // Yaşa bağlı ipucu koddan (yalnız düzyazıya bırakılmaz): okur değişir, alan adı değişmez.
      ...(yetiskinMi(ageText) ? [YETISKIN_OKUR] : []),
    ],
    odak: odakSatiri(data.goals.length, data.duration, data.sessionType),
    hatirlatma: [...HATIRLATMA],
  });
}

export const POST = createToolHandler({
  rateLimitKey: "session-summary",
  bodySchema,
  cost: 1,
  systemPrompt: SYSTEM_PROMPT,
  toolType: "SESSION_SUMMARY",
  category: "speech",
  categoryFromWorkArea: true,
  creditDescription: "Oturum özeti oluşturma",
  responseKey: "summary",
  fallbackTitle: (_, student) => `Oturum Özeti — ${student?.name ?? ""}`,

  buildUserPrompt,

  enrichContent(content, data) {
    content.sessionType        = data.sessionType;
    content.overallPerformance = data.overallPerformance;
    content.sessionDate        = data.sessionDate;
  },
});
