// apps/hub/src/app/studio/api/students/[id]/progress/[goalId]/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rehydrateText, type NameMapping } from "@ludenlab/ai";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { HEDEF_DENETIM_GUNLUK, HEDEF_DENETIM_SINIR_METNI, adParcaCeviricileri, hedefMetniSchema, sonucuGeriCevir, temizle } from "@/lib/hedefDenetimi";
import { DenetimHatasi } from "@/lib/hedefDenetimi/dogrula";
import { hedefDenetle } from "@/lib/hedefDenetimi/run";
import { requireAuth } from "@studio/lib/auth-helpers";
import { calcAgeText } from "@studio/lib/age";
import { prisma } from "@studio/lib/db";
import { GOAL_AUDIT_ENDPOINT, GOAL_AUDIT_RATE_PER_MIN, goalAuditBugun, usageToLog } from "@studio/lib/goalAudit";
import { ensureStudentAlias, restoreName, scrub } from "@studio/lib/pseudonym";
import { logUsage } from "@studio/lib/usage";
import { logError } from "@studio/lib/utils";
import { zodError } from "@studio/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

/* Kısa dönem hedef denetimi (spec §7.2, §15). KREDİ YOK, plan kapısı YOK; koruma: 6/dk + günlük 10 (ApiUsageLog) + 24h tavan.
   ÇOCUK PII: önce `temizle` (görünmez/etiketle bölünmüş ad birleşmesin), sonra `scrub`; çıktı alıntı başına geri çevrilir.
   Depolama: metin ve denetim GERÇEK adla (Studio kararı, 1b ile aynı). Hedef metni log satırlarına yazılmaz. */

const bodySchema = z.object({ objective: hedefMetniSchema });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; goalId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const therapistId = gate.session.user.id;
  const { id: studentId, goalId } = await params;
  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId },
      select: { id: true, name: true, llmAlias: true, therapistId: true, birthDate: true, curriculumIds: true },
    });
    if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    const goal = await prisma.curriculumGoal.findUnique({ where: { id: goalId }, select: { code: true, title: true, curriculumId: true } });
    if (!goal || !student.curriculumIds.includes(goal.curriculumId)) {
      return NextResponse.json({ error: "Hedef bu öğrencinin müfredatında değil" }, { status: 404 });
    }

    const read = await readJsonBody(request);
    if (!read.ok) return NextResponse.json({ error: read.error }, { status: read.status });
    const parsed = bodySchema.safeParse(read.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });
    const gercekHedef = temizle(parsed.data.objective);
    if (!gercekHedef) return NextResponse.json({ error: "Hedef boş olamaz" }, { status: 400 });

    const rl = rateLimit(`goal-audit:${therapistId}`, GOAL_AUDIT_RATE_PER_MIN);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
    const sayim = await goalAuditBugun(prisma, therapistId);
    if (sayim >= HEDEF_DENETIM_GUNLUK) return NextResponse.json({ error: HEDEF_DENETIM_SINIR_METNI, code: "DAILY_CAP" }, { status: 429 });
    // 24 saatlik bellek-içi maliyet tavanı (sayım hatası açık sayıldığında bile); reddedilenler harcamasın diye sayımdan SONRA.
    const gun = rateLimit(`goal-audit-gun:${therapistId}`, HEDEF_DENETIM_GUNLUK * 2, 86_400_000);
    if (!gun.allowed) return NextResponse.json({ error: HEDEF_DENETIM_SINIR_METNI, code: "DAILY_CAP" }, { status: 429 });

    const alias = await ensureStudentAlias(student);
    const map: NameMapping = { real: student.name, alias };
    const hedef = scrub(gercekHedef, map) ?? gercekHedef;

    try {
      const { sonuc: rumuzlu, usage } = await hedefDenetle({
        hedef,
        baglam: { kademeYas: student.birthDate ? calcAgeText(student.birthDate) : undefined, ustHedef: `${goal.code} ${goal.title}` },
      });
      const sonuc = sonucuGeriCevir(rumuzlu, gercekHedef, (s) => restoreName(s, map), adParcaCeviricileri(student.name, alias, rehydrateText));
      logUsage(therapistId, GOAL_AUDIT_ENDPOINT, usageToLog(usage));
      const now = new Date();
      await prisma.studentProgress.upsert({
        where: { studentId_goalId: { studentId, goalId } },
        create: { studentId, goalId, therapistId, status: "not_started", objective: gercekHedef, objectiveAudit: sonuc, objectiveAuditedAt: now },
        update: { objective: gercekHedef, objectiveAudit: sonuc, objectiveAuditedAt: now },
      });
      return NextResponse.json({ audit: sonuc, objective: gercekHedef, auditedAt: now.toISOString(), kalan: Math.max(0, HEDEF_DENETIM_GUNLUK - (sayim + 1)) });
    } catch (err) {
      if (err instanceof DenetimHatasi) {
        if (err.kullanim) logUsage(therapistId, GOAL_AUDIT_ENDPOINT, usageToLog(err.kullanim.usage)); // model çağrısı ücretlendi
        return NextResponse.json({ error: "Denetim üretilemedi. Tekrar deneyin." }, { status: 502 });
      }
      throw err;
    }
  } catch (error) {
    logError("POST /studio/api/students/[id]/progress/[goalId]/audit", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
