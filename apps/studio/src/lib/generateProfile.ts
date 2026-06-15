import { prisma } from "@/lib/db";
import { anthropic, MODEL } from "@/lib/anthropic";
import { logUsage } from "@/lib/usage";
import { stripHtmlTags } from "@/lib/validation";
import { WORK_AREA_LABEL } from "@/lib/constants";

function calcAge(birthDate: Date): number {
  return Math.floor(
    (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
}

// ─── Statik system prompt — cache'e uygun, her çağrıda aynı ───
const PROFILE_SYSTEM_PROMPT = `Sen deneyimli bir dil ve konuşma terapisti uzmanısın.
Öğrenci bilgilerine dayanarak iki bölümden oluşan kapsamlı bir eğitim profili hazırlıyorsun.

Yanıtını tam olarak aşağıdaki yapıda, başka hiçbir şey eklemeden ver:

## Kavramsal Arka Plan

### Tanının Klinik Açıklaması
[Tanının kısa, net klinik açıklaması — 3-5 cümle]

### Bu Yaş Grubunda Beklenen Gelişim
[Bu yaş aralığındaki tipik gelişim özellikleri ve sınırlar — 3-5 cümle]

### Müfredat Modülleriyle İlişki
[Seçili modüllerin bu tanı ve yaş grubuyla nasıl örtüştüğü — 3-5 cümle]

---

## Uzmana Öneriler

### Öncelikli Çalışma Alanları
[Bu öğrenci için en önemli 3-5 hedef]

### Etkili Yaklaşım ve Teknikler
[Kanıt temelli, bu profil için uygun yaklaşımlar]

### Dikkat Edilmesi Gereken Noktalar
[Terapist için önemli uyarılar ve özel durumlar]

### Aile ile Paylaşılabilecek Öneriler
[Ebeveynlerin evde uygulayabileceği pratik öneriler]`;

// ─── Dinamik user prompt — öğrenci bilgileri, her çağrıda farklı ───
function buildUserPrompt(params: {
  name: string;
  age: number | null;
  workArea: string;
  diagnosis: string | null;
  notes: string | null;
  moduleNames: string[];
}): string {
  const { name, age, workArea, diagnosis, notes, moduleNames } = params;

  const lines: string[] = [
    `Öğrenci adı: ${name}`,
    age !== null ? `Yaşı: ${age}` : null,
    `Çalışma alanı: ${WORK_AREA_LABEL[workArea] ?? workArea}`,
    diagnosis ? `Tanı: ${diagnosis}` : null,
    moduleNames.length > 0 ? `Seçili müfredat modülleri: ${moduleNames.join(", ")}` : null,
    notes ? `Ek notlar: ${notes}` : null,
  ].filter(Boolean) as string[];

  return `Aşağıdaki öğrenci için eğitim profili hazırla.\n\n${lines.join("\n")}`;
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

  let moduleNames: string[] = [];
  if (student.curriculumIds.length > 0) {
    const modules = await prisma.curriculum.findMany({
      where: { id: { in: student.curriculumIds } },
      select: { title: true },
    });
    moduleNames = modules.map((m) => m.title);
  }

  const age = student.birthDate ? calcAge(student.birthDate) : null;
  const userPrompt = buildUserPrompt({
    name: student.name,
    age,
    workArea: student.workArea,
    diagnosis: student.diagnosis,
    notes: student.notes,
    moduleNames,
  });

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

  return stripHtmlTags(raw.text);
}
