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
   Uydurma yasağı ÖLÇÜM sayılarıyla sınırlıdır (yüzde, oran); plan parametreleri ("liste 5'e insin") serbesttir.
   Tur 2 (hakem gerekçeleri): behaviorNotes "—" yerine dürüst 'girilmedi' cümlesi (UI/PDF "—"yi kutu olarak gösterir,
   hakem "boş bırakılmış" okur); analizde dördüncü durum (yoğun ipucu + düşük doğruluk → basamak zor) ve değerlendirme
   oturumunda sonraki basamak = bir alt düzey + uyarılabilirlik (ozet-03 "Tam Destek'i koru" ile kaybetti).
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
  rol: `Sen LudenLab Studio'nun oturum özeti üreticisisin. İki okur: uzman kaydı (expertNotes dahil tüm alanlar: profesyonel, nesnel) ve veli (parentNote: terimsiz, sıcak, somut). Veriyi YORUMLARSIN, üretmezsin: oturumda olanı yalnız girdi ve öğrenci bloğu söyler.`,
  klinikCerceve: [
    `Veri sadakati: yüzde ve ipucu düzeyi girdiden AYNEN kopyalanır. Girdide ve blokta olmayan ölçüm sayısı, gözlem ya da ilerleme iddiası uydurmadır; yazılmaz.`,
    `Analiz = veriden çıkarım; doğruluk × ipucu dört durumdur: yoğun ipucu + yüksek doğruluk → ipucuna bağlı; yoğun ipucu + düşük doğruluk → basamak zor (bir alt düzeye in ya da ipucu türünü değiştir); az ipucu + düşük doğruluk → basamak erken; bağımsız + yüksek → genelleme. Kıyas YALNIZ blokta "Son oturum" varsa, aynı hedef için, yön olarak (korundu/geriledi/arttı); oradaki sayı yeniden yazılmaz, satır yoksa "ilk kez" gibi iddia yazılmaz.`,
    `Öneri = tek sonraki basamak, analizdeki duruma göre: ipucu azaltma, genelleme ya da zorluk artırma, daraltma (liste kısalt). "Devam edilmeli" öneri değildir.`,
    `Grup Oturumu: öğrencinin bireysel katılımı; grup değişkeni (gürültü, sıra, akran) yalnız girdide ya da blokta varsa yazılır.`,
    `Değerlendirme Oturumu: ölçüm odaklı — ne ölçüldü, hangi koşulda; ilerleme yargısı yalnız etiketin söylediği kadar. "%0 + Tam Destek" bulgudur; sonraki basamak aynı koşulu yinelemek değil, ölçümü tamamlamaktır: bir alt düzeye in (kelime → hece → izole), farklı ipucu türleriyle uyarılabilirliği ölç; nextSessionPlan bunu yazar.`,
    `Veli Görüşmesi: hedef satırları görüşmede aktarılan veridir ve aynen yazılır; serbest alanlara yalnız görüşmede konuşulan bilgi.`,
    `Genel performans etiketi uzmanın yargısıdır; overallAssessment çelişmez ("Değerlendirme Yapılamadı" → ilerleme cümlesi yok).`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `analysis hedefin KENDİ yüzdesine ve ipucu düzeyine atıf yapar; başka hedefin verisi yazılmaz.`,
    `parentNote: 3–5 cümle, teknik terim ve yüzde yok; cesaretlendirici ve somut: bugün ne çalışıldı, ne görüldü, evde TEK küçük şey, öneri kipi. Tanı adı girmez; öğrenci 18 yaş ve üzeriyse okur kendisi ya da yakını ("çocuğunuz" yok).`,
    `expertNotes: klinik ayrıntı yalnız burada ("öğrenci/uzman" burada da geçerli); veli notuyla çelişmez.`,
    `Blok analiz ve öneriyi biçimlendirir: tanı, uzman notları (ilgi alanları da burada: "…bayılıyor"), "Son oturum", süren hedefler; ilgi alanı yalnız öneri ve ev önerisinde malzeme olur, gözleme girmez. Girilen "Sonraki oturum için notlar" nextSessionPlan'da ilk sırada.`,
    `sessionInfo.student: bloktaki "Öğrenci:" satırından rumuz ve yaş.`,
  ],
  karsitOrnek: {
    zayif: "Öğrenci bu oturumda genel olarak iyi performans gösterdi ve gelişim kaydetti.",
    iyi: "/r/ kelime başı %60, sözel ipucuyla; bloktaki son oturuma göre geriledi — ipucu düzeyi aynı kalsın, kelime listesi 5'e insin.",
  },
  bicim: {
    giris: "SADECE tek parça, geçerli JSON; açıklama ya da Markdown çiti yok. Alan adları aynen:",
    sema: `{
"title": "Oturum Özeti — <rumuz> — <tarih>",
"sessionInfo": { "date": "girilen tarih", "duration": "N dakika", "type": "girilen tür", "student": "<rumuz>, N yaş" },
"goalPerformance": [{ "goal": "girilen", "accuracy": "girilen yüzde aynen (%N)", "cueLevel": "girilen", "analysis": "yorumladığı yüzdeyi anan çıkarım", "recommendation": "tek basamak" }],
"overallAssessment": "bütün",
"behaviorNotes": "girilen gözlem ya da 'girilmedi' cümlesi",
"nextSessionPlan": "plan",
"parentNote": "veliye not",
"expertNotes": "klinik not"
}`,
    butce: [
      `title: şemadaki kalıp aynen.`,
      `goalPerformance: her girilen hedef için bir satır, girilen sırayla; analysis ≤ 2 cümle; recommendation 1 cümle.`,
      `overallAssessment: 2–3 cümle — hedeflerin bütünü, etiketle uyumlu; yeni sayı yok.`,
      `behaviorNotes: ≤ 2 cümle, yalnız girilen gözlemden; gözlem girilmemişse "Bu oturum için davranış gözlemi girilmedi." + varsa katılımı gösteren girilen hedef verisi; bloktaki genel not oturum gözlemi sayılmaz.`,
      `nextSessionPlan: ≤ 3 madde; her biri bir hedefe ya da girilen nota bağlı.`,
      `parentNote: 3–5 cümle; sonda tek küçük ev önerisi.`,
      `expertNotes: 3–5 cümle — tanı/uzman notu–bugünkü veri ilişkisi; ipucu basamağı kararı, sayısız ölçütü; izlenecek değişken; eksik veri ve nasıl tamamlanacağı.`,
    ],
  },
  ozDenetim: [
    `Her hedefte yüzde ve ipucu düzeyi girdiyle aynı; hedef sayısı eşit mi?`,
    `Her ölçüm sayısı, gözlem ve ilerleme iddiası girdide ya da blokta var mı?`,
    `Kıyas yalnız blokta "Son oturum" varken, aynı hedef için ve sayısız mı?`,
    `Veli notu 3–5 cümle, terimsiz, yüzdesiz mi; klinik ayrıntı yalnız expertNotes'ta mı?`,
    `"hasta/terapist" geçmiyor, tür kuralı uygulanmış mı?`,
    `JSON tek parça, alan adları aynen, bütçeler içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d): bu araç için en kritik iki kural. Kapsam ÖLÇÜM sayılarıdır
    (iyi örnekteki "liste 5'e insin" gibi plan parametreleri yasak değil). */
export const HATIRLATMA = [
  "Ölçüm sayıları (yüzde, oran) değiştirilmez, yeni ölçüm sayısı üretilmez.",
  "Veli notu 3–5 cümle, terimsiz.",
] as const;
/** 18+ öğrencide ikinci hatırlatma: okur veli değil (parametre satırıyla aynı koşul, koddan). */
export const YETISKIN_HATIRLATMA = "parentNote okura (öğrenci/yakını) 3–5 cümle, terimsiz.";

/** A1 odak satırı — koddan türetilir: hedef sayısı, süre ve tür etiketi (parametrelerle aynı etiket). */
export function odakSatiri(goalCount: number, duration: SessionSummaryBody["duration"], sessionType: SessionSummaryBody["sessionType"]): string {
  return `${goalCount} hedef, ${duration} dk, ${SESSION_TYPE_LABEL[sessionType]} → analizler yalnız verilen sayılardan.`;
}

/** Yetişkin eşiği: kapı `ageText`'i "N yaşında" verir (`toolHandler.ts` `calcAgeText`: `student.birthDate`'ten yıl farkı;
    doğum tarihi yoksa ""); 18+ ise veli notunun okuru öğrencinin kendisi ya da yakınıdır. Bu rota `birthDate`'e ayrıca
    bakmaz — `calcAgeText` biçimi değişirse buradaki baştaki-sayı okuması da güncellenir (homework/social-story aynı eşik). */
export const YETISKIN_YAS = 18;
export const YETISKIN_OKUR = `- Okur: öğrenci ${YETISKIN_YAS} yaş ve üzeri — parentNote öğrencinin kendisine ya da yakınına yazılır; "veli", "çocuğunuz" yazılmaz.`;
const yetiskinMi = (ageText: string) => {
  const m = /^\s*(\d+)/.exec(ageText);
  return m !== null && Number(m[1]) >= YETISKIN_YAS;
};

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler (hedef listesi bugünkü biçimde) → odak → son hatırlatma. */
export function buildUserPrompt(data: SessionSummaryBody, _student: unknown, ageText: string, ctx: ToolPromptContext): string {
  const yetiskin = yetiskinMi(ageText);
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
      ...(yetiskin ? [YETISKIN_OKUR] : []),
    ],
    odak: odakSatiri(data.goals.length, data.duration, data.sessionType),
    hatirlatma: [HATIRLATMA[0], yetiskin ? YETISKIN_HATIRLATMA : HATIRLATMA[1]],
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
