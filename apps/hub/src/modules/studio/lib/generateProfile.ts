import { prisma } from "@studio/lib/db";
import { anthropic, MODEL } from "@studio/lib/anthropic";
import { logUsage } from "@studio/lib/usage";
import { stripHtmlTags } from "@studio/lib/validation";
import { WORK_AREA_LABEL } from "@studio/lib/constants";
import { ensureStudentAlias, restoreName } from "@studio/lib/pseudonym";
import { loadStudentContext, renderStudentBlock } from "@studio/lib/studentContext";
import { studioKullaniciPromptu, studioSistemPromptu } from "@studio/lib/prompts/iskelet";
import type { NameMapping } from "@ludenlab/ai";

/**
 * Takvim yılı farkı — araç kapısı (`toolHandler.ts` `calcAgeYears`) ve bağlam katmanı
 * (`studentContext.ts` `yas`) ile AYNI kural. Eskiden gün/365,25 tabanı kullanılıyordu: doğum
 * günü henüz gelmemiş çocukta "Yaşı:" satırı ile bloğun "N yaş" ibaresi birbirini tutmuyordu.
 */
function calcAge(birthDate: Date): number {
  return new Date().getFullYear() - new Date(birthDate).getFullYear();
}

/* AI öğrenci profili — spec A1 prompt'u (Faz 2 / Task 13).
   Çıktı JSON değil MARKDOWN; on başlık satırı (## ×2, ### ×7, ---) arayüz (`students/[id]/page.tsx`
   yalnız "## " satırlarında böler) ve bağlam katmanı (`studentContext.ts` `PROFIL_BOLUMLERI` iki
   bölümü sonraki her araca taşır) ile SÖZLEŞMEDİR: şablonda aynen durur. Sistem prompt'u sabittir
   (önbellek) ve `studioSistemPromptu` ile A1 sırasında kurulur; kullanıcı prompt'u ortak öğrenci
   bloğunu olduğu gibi gömer — eski "Öğrenci adı / Yaşı / Çalışma alanı / Tanı" satırları kalktı,
   kimlik bloktadır. Yetişkin öğrenci (≥ 18) KODDA koşulludur (`calcAge`): parametre satırı olarak
   gider. Üretim mantığı, kredi, rumuz kapısı ve arayüz DEĞİŞMEZ (A4). Sözleşme: `generateProfile.prompt.test.ts`.
   Tabanın `dil_kurali` sert hatasının kaynağı eski şablonun "Terapist için…" yönlendirmesiydi. */

export const YETISKIN_YASI = 18;

export const PROFILE_SYSTEM_PROMPT = studioSistemPromptu({
  rol: `Sen LudenLab Studio'nun öğrenci profili üreticisisin. Profili dil ve konuşma uzmanı okur; "Öncelikli Çalışma Alanları" ve "Dikkat Edilmesi Gereken Noktalar" sonraki her araç üretimine bağlam olarak gider, ikisi özellikle somut. Kayıt: klinik, yalın Türkçe; terim serbest, "öğrenci/uzman" sözcükleri burada da geçerli. Yalnız "Aile ile Paylaşılabilecek Öneriler" aileye aktarılır: günlük dil, terim yok, "siz" ile öneri kipi.`,
  klinikCerceve: [
    `Tanı açıklaması verilen tanıyla sınırlı: güncel terminolojiyle tanımı ve bu öğrencideki görünümü (tanı cümlesi + uzman notu). Yeni bir tanı konmaz, atfedilmez; eşlik edebilecek durum yalnız "değerlendirilmeli" diye anılır. Tanı satırı yoksa tek cümleyle "tanı girilmemiş" denir, çalışma alanından ilerlenir.`,
    `Yaş grubu beklentisi normatif: o yaşın tipik göstergeleri (cümle uzunluğu, ses edinimi, anlatı) somut; ardından öğrencinin bloktaki düzeyiyle farkı ve sonraki basamak. Öğrenci 18 yaş ve üzeriyse (parametrelerde yazar) çocuk gelişimi normu yazılmaz: referans edinim öncesi düzey, iyileşme seyri ve mesleki-sosyal gereksinimdir.`,
    `Müfredat ilişkisi bloktaki "Modüller" satırından: modülün bu tanı ve düzeyle kesiştiği nokta, sıradaki hedef. Modül satırı yoksa bir cümleyle "modül atanmamış" denir, çalışma alanının genel bileşenleriyle kısa ilişki kurulur; modül adı uydurulmaz.`,
    `Öncelikli alanlar 3–5 madde, her madde ölçülebilir: mevcut düzey → hedef davranış → ölçüt (doğruluk oranı, fırsat ya da bağlam sayısı). İlk maddeler "Sürmekte olan hedefler" ve "Sonraki plan"dan türer; tamamlanan hedef yinelenmez.`,
    `Teknikler kanıt temelli ve bu profile uyarlı: tekniğin adı + bu öğrencide NASIL (malzeme, ipucu, durum) + dayandığı blok verisi. Uzman notundaki somut gözlem tekniğe dönüşür; genel liste yazılmaz.`,
    `Dikkat noktaları seansta gözlenebilir: durum → uzmanın o anda yapacağı şey; kaynağı uzman notu ve tanı.`,
    `Aile önerileri evde, ev malzemesiyle, var olan rutine (yemek, banyo, yol) iliştirilmiş; her biri bir öncelikli alana bağlı. Yetişkinde "aile" eş/yakın çevredir, bağlam iştir; bölüm başlığı aynen kalır.`,
  ],
  // Ortak dört kural iskeletten gelir; buradakiler yalnız araca özgü ekler.
  ozgulluk: [
    `"Son çalışmalar", "Son oturum" ve "Sürmekte olan hedefler" satırları "Müfredat Modülleriyle İlişki" ve "Öncelikli Çalışma Alanları" bölümlerine girer (ne tamamlandı → sırada ne var).`,
    `İlgi alanı bloktaki "Uzman notları" satırındadır ("…bayılıyor"): tekniklerde ve aile önerilerinde malzeme olur.`,
    `Blokta olmayan oturum, test puanı, cihaz, ilaç, okul ya da aile bilgisi yazılmaz; bilinmeyen için "değerlendirilmeli" denir.`,
  ],
  karsitOrnek: {
    zayif: "Öncelikli alan: dil gelişimini desteklemek.",
    iyi: "Öncelikli alan: iki sözcüklü istekleri ('su ver') üç sözcüğe ('bana su ver') genişletme — uzman notundaki mevcut iki sözcüklü cümle temel alınır; ölçüt: oyun içindeki isteklerin çoğu modelsiz üç sözcük.",
  },
  bicim: {
    giris: `SADECE aşağıdaki Markdown şablonunu yaz; önsöz, kapanış, kod çiti ya da başka başlık yok. On başlık satırı (sözcükler, ## / ### düzeyi, --- ayracı) AYNEN; köşeli parantezli satır yerine bölüm gövdesi gelir:`,
    sema: `## Kavramsal Arka Plan

### Tanının Klinik Açıklaması
[3–5 cümle: tanının tanımı, bu öğrencideki görünümü]

### Bu Yaş Grubunda Beklenen Gelişim
[3–5 cümle: normatif göstergeler, düzeyle farkı, sonraki basamak]

### Müfredat Modülleriyle İlişki
[3–5 cümle: modül × tanı × düzey, hedefler; modül yoksa 1–2 cümle]

---

## Uzmana Öneriler

### Öncelikli Çalışma Alanları
[3–5 madde, her madde ölçülebilir: mevcut düzey → hedef → ölçüt]

### Etkili Yaklaşım ve Teknikler
[3–5 madde: teknik + nasıl + dayanak]

### Dikkat Edilmesi Gereken Noktalar
[3–5 madde: durum → seansta ne yapılır]

### Aile ile Paylaşılabilecek Öneriler
[3–5 madde: rutine iliştirilmiş, günlük dil]`,
    butce: [
      `İlk üç bölüm düzyazı, tek paragraf, 3–5 cümle ≤ 25 kelime; madde işareti yok.`,
      `Uzman bölümleri "- " ile üst düzey madde; alt madde yok.`,
      `Öncelikli Çalışma Alanları: 3–5 madde, madde ≤ 2 cümle; ilk cümle hedef, son cümle ölçüt.`,
      `Etkili Yaklaşım ve Teknikler: 3–5 madde, madde ≤ 3 cümle (teknik, nasıl, dayanak).`,
      `Dikkat Edilmesi Gereken Noktalar, Aile ile Paylaşılabilecek Öneriler: 3–5 madde, madde ≤ 2 cümle.`,
    ],
  },
  ozDenetim: [
    `On başlık satırı aynen ve sırasında; metin ilk başlıkla başlıyor mu?`,
    `Yazdığın her tanı, modül, öykü ve veri bloktaki bir satıra dayanıyor mu?`,
    `Öğrenci 18 yaş ve üzeriyse yaş bölümü yetişkine, aile bölümü eş/yakın ve işe göre mi?`,
    `Öncelikli alanların her maddesi ölçüt taşıyor; teknikler blok verisine bağlı mı?`,
    `"hasta/terapist" yerine "öğrenci/uzman" yazıldı; ödül sistemi önerilmedi mi?`,
    `Her bölüm cümle/madde bütçesi içinde mi?`,
  ],
});

/** Son hatırlatma (A1 kullanıcı prompt'u, d). "Başlıkları değiştirme." ad öbeği gibi okunurdu → olumlu biçim. */
export const HATIRLATMA = ["Başlıklar şablondaki gibi aynen kalır.", "Uydurma yok: blokta olmayan tanı, modül ya da öykü yazılmaz."] as const;

/** A1 odak satırı — koddan: yaş + çalışma alanı etiketi. Yaş yoksa yaş varsayılmaz, bloktaki düzey esas alınır. */
export function odakSatiri(age: number | null, workArea: string): string {
  const alan = WORK_AREA_LABEL[workArea] ?? workArea;
  return age !== null
    ? `Yaş ${age}, ${alan} → yaş grubu beklentileri bu yaşa göre.`
    : `Yaş bilinmiyor, ${alan} → yaş varsayma, beklentileri bloktaki düzeye göre yaz.`;
}

/** A1 kullanıcı prompt'u: öğrenci bloğu (A2, boşsa başlıksız) → parametreler → odak → son hatırlatma. Yetişkin satırı koddan. */
export function buildProfileUserPrompt(params: { age: number | null; workArea: string; studentBlock: string }): string {
  const { age, workArea, studentBlock } = params;
  const yetiskin = age !== null && age >= YETISKIN_YASI;
  return studioKullaniciPromptu({
    studentBlock,
    parametreler: [
      "- Profil üret",
      ...(yetiskin
        ? [`- Öğrenci yetişkin (${age} yaş): yaş bölümünde çocuk gelişimi normu yazılmaz, edinim öncesi düzey ve gereksinim esastır; aile bölümünde eş/yakın çevre ve iş bağlamı.`]
        : []),
    ],
    odak: odakSatiri(age, workArea),
    hatirlatma: [...HATIRLATMA],
  });
}

/**
 * Generates an AI-authored student profile text via Claude.
 *
 * Returns the sanitized text to the caller. Persistence is left to the route
 * so it can be coupled atomically with credit deduction.
 *
 * Throws if the student doesn't exist or Claude returns an unexpected shape.
 */
export async function generateStudentProfile(
  studentId: string,
  therapistId: string,
): Promise<string> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    throw new Error(`Öğrenci bulunamadı: ${studentId}`);
  }

  // ── ÇOCUK PII KAPISI (2026-08 denetimi #09) ──
  // Profil metni sonradan HER araç çağrısında prompt'a ekleniyor; gerçek adla üretilirse
  // sızıntı bileşikleşirdi. Bu yüzden üretim RUMUZLA yapılır, dönen metinde gerçek ad
  // geri konur (kaydı terapist için okunur kalır, sağlayıcı gerçek adı hiç görmez).
  const alias = await ensureStudentAlias({
    id: student.id,
    name: student.name,
    llmAlias: student.llmAlias,
    therapistId,
  });
  const nameMap: NameMapping = { real: student.name, alias };

  // Ortak öğrenci bağlam bloğu (spec A2): modüller, uzman notları, son çalışmalar, son oturum özeti
  // ve hedefler buradan gelir. MEVCUT profil bilerek dışarıda (`exclude`): yeniden üretim kendi eski
  // çıktısını girdi almasın. Satır zaten çekildi → yükleyici öğrenci sorgusunu atlar.
  const blok = await loadStudentContext(prisma, {
    studentId,
    therapistId,
    nameMap,
    exclude: ["aiProfile"],
    student: {
      birthDate: student.birthDate,
      workArea: student.workArea,
      diagnosis: student.diagnosis,
      notes: student.notes,
      aiProfile: student.aiProfile,
      curriculumIds: student.curriculumIds,
    },
  });

  const age = student.birthDate ? calcAge(student.birthDate) : null;
  // Kimlik yalnız bloktadır: yükleyici (beklenmedik biçimde) boş dönerse kimlik satırları yine
  // gitsin diye aynı biçimlendiriciyle yalnız kimlik + not bloğu kurulur (ikincil alanlar boş).
  const studentBlock =
    blok ||
    renderStudentBlock(
      {
        alias,
        ageYears: age,
        workArea: student.workArea,
        diagnosis: student.diagnosis,
        notes: student.notes,
        aiProfile: null,
        curriculumTitles: [],
        recentCards: [],
        lastSummary: null,
        completedGoalCodes: [],
        inProgressGoalTitles: [],
      },
      nameMap,
    );
  const userPrompt = buildProfileUserPrompt({ age, workArea: student.workArea, studentBlock });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.5,
    system: [
      {
        type: "text",
        text: PROFILE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  logUsage(therapistId, "ai-profile", message.usage);

  const raw = message.content[0];
  if (raw.type !== "text") throw new Error(`Beklenmeyen yanıt tipi: ${raw.type}`);

  // Rumuz → GERÇEK ad: kaydedilen/gösterilen metinde terapist gerçek adı görür.
  return restoreName(stripHtmlTags(raw.text), nameMap);
}
