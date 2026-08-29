import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAdmin } from "@studio/lib/auth-helpers";
import { recordAudit } from "@studio/lib/audit";
import { clinicalAccess, maskLessonRow, maskStudentRow } from "@studio/lib/adminPrivacy";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";

/**
 * Admin için tek kullanıcı detay görünümü.
 *
 * Tab-based UI'yi tek istekle besleyecek şekilde paralel sorgu seti döner:
 * therapist + abonelik geçmişi + son 50 kredi hareketi + son 30 günün API
 * kullanım aggregate'i + bu kullanıcıya ait son 50 audit kaydı + öğrenci
 * listesi + son 30 ders. Tek seferlik admin görünümü olduğu için sınırlar
 * ekran kapasitesine göre verildi; pagination eklemek istenirse arka tarafa
 * `cursor`/`take` parametreleri taşınmalı.
 *
 * ÇOCUK KLİNİK VERİSİ KAPISI (2026-08 güvenlik denetimi #23):
 * `impersonate` ucu KVKK rızası isteyip her kullanımı audit'lerken bu uç aynı veriye
 * (çocuk adı + TANI + randevu başlıkları) rızasız ve İZSİZ ulaşıyordu — rıza kapısının
 * yanından dolaşılabiliyordu. Artık:
 *   · rıza YOKSA → kimlik maskeli, tanı hiç gönderilmez (maskeleme SUNUCUDA)
 *   · rıza VARSA → tam veri, ama okuma `user.clinical-view` olarak audit'lenir
 * İşletimsel bağlam (sayılar, çalışma alanı, tarihler) her iki modda da korunur.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    const { id } = await params;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      therapist,
      cardGroups,
      creditTxns,
      subscriptions,
      apiUsage,
      apiUsageByEndpoint,
      apiUsageByModel,
      auditLogs,
      students,
      lessons,
    ] = await Promise.all([
      prisma.therapist.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          specialty: true,
          role: true,
          emailVerified: true,
          credits: true,
          studentLimit: true,
          pdfEnabled: true,
          planType: true,
          suspended: true,
          lastLogin: true,
          avatarUrl: true,
          institution: true,
          phone: true,
          experienceYears: true,
          certifications: true,
          supportAccessExpiresAt: true,
          supportAccessReason: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { students: true, cards: true, lessons: true } },
        },
      }),
      prisma.card.groupBy({
        by: ["toolType"],
        where: { therapistId: id },
        _count: { _all: true },
      }),
      prisma.creditTransaction.findMany({
        where: { therapistId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          amount: true,
          type: true,
          description: true,
          createdAt: true,
        },
      }),
      prisma.subscription.findMany({
        where: { therapistId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          billingCycle: true,
          currentPeriodEnd: true,
          centralSubscriptionId: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
          plan: { select: { type: true } },
        },
      }),
      prisma.apiUsageLog.findMany({
        where: { therapistId: id, createdAt: { gte: thirtyDaysAgo } },
        select: {
          createdAt: true,
          costUsd: true,
          inputTokens: true,
          outputTokens: true,
          cacheReadTokens: true,
          cacheWriteTokens: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.apiUsageLog.groupBy({
        by: ["endpoint"],
        where: { therapistId: id, createdAt: { gte: thirtyDaysAgo } },
        _sum: { costUsd: true },
        _count: { _all: true },
      }),
      prisma.apiUsageLog.groupBy({
        by: ["model"],
        where: { therapistId: id, createdAt: { gte: thirtyDaysAgo } },
        _sum: { costUsd: true },
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            { targetType: "therapist", targetId: id },
            { actorId: id },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          actorId: true,
          action: true,
          targetType: true,
          targetId: true,
          diff: true,
          ip: true,
          createdAt: true,
        },
      }),
      prisma.student.findMany({
        where: { therapistId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          workArea: true,
          diagnosis: true,
          createdAt: true,
          _count: { select: { lessons: true, assignments: true, progress: true } },
        },
      }),
      prisma.lesson.findMany({
        where: { therapistId: id },
        orderBy: { date: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          isRecurring: true,
          student: { select: { id: true, name: true } },
        },
      }),
    ]);

    if (!therapist) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // ── Çocuk klinik verisi: rıza kapısı + iz (denetim #23) ──
    const access = clinicalAccess(therapist);
    if (access.granted) {
      // Rıza varken tam veri dönüyoruz — bu HASSAS bir okuma, iz bırakmadan geçmesin.
      // Best-effort: audit yazımı başarısız olsa da ekran çalışmaya devam eder (recordAudit
      // tx'siz çağrıldığında yutar), ama hata loglanır.
      await recordAudit({
        actorId: session.user.id,
        action: "user.clinical-view",
        targetType: "therapist",
        targetId: id,
        diff: {
          targetEmail: therapist.email,
          consent: {
            expiresAt: access.expiresAt?.toISOString() ?? null,
            reason: access.reason,
          },
          disclosed: { students: students.length, lessons: lessons.length },
        },
        ip: getClientIp(request.headers),
      });
    }
    const safeStudents = access.granted ? students : students.map(maskStudentRow);
    const safeLessons = access.granted ? lessons : lessons.map(maskLessonRow);

    // Günlük aggregate — UTC gün sınırına göre. Aynı user'a ait satır sayısı
    // 30 günde nadiren binlerce olduğu için JS tarafında topluyoruz.
    type Daily = { date: string; cost: number; calls: number; cacheReads: number; cacheWrites: number; inputTokens: number; outputTokens: number };
    const dailyMap = new Map<string, Daily>();
    let totalUsd = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const log of apiUsage) {
      const day = log.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? {
        date: day,
        cost: 0,
        calls: 0,
        cacheReads: 0,
        cacheWrites: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      const cost = Number(log.costUsd);
      entry.cost += cost;
      entry.calls += 1;
      entry.cacheReads += log.cacheReadTokens;
      entry.cacheWrites += log.cacheWriteTokens;
      entry.inputTokens += log.inputTokens;
      entry.outputTokens += log.outputTokens;
      dailyMap.set(day, entry);

      totalUsd += cost;
      totalCacheReadTokens += log.cacheReadTokens;
      totalCacheWriteTokens += log.cacheWriteTokens;
      totalInputTokens += log.inputTokens;
      totalOutputTokens += log.outputTokens;
    }

    // Cache hit ratio: cache_read_tokens / (input_tokens + cache_read_tokens + cache_write_tokens).
    // Çıktı (output) token'ı cache'lenebilir değil, paya dahil etmiyoruz.
    const totalReadable = totalInputTokens + totalCacheReadTokens + totalCacheWriteTokens;
    const cacheHitRate = totalReadable > 0 ? totalCacheReadTokens / totalReadable : 0;

    const cardStats = cardGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.toolType] = g._count._all;
      return acc;
    }, {});

    return NextResponse.json({
      therapist,
      cardStats,
      subscriptions,
      creditTxns,
      apiUsage: {
        daily: Array.from(dailyMap.values()),
        endpoints: apiUsageByEndpoint
          .map((g) => ({
            endpoint: g.endpoint,
            cost: Number(g._sum.costUsd ?? 0),
            calls: g._count._all,
          }))
          .sort((a, b) => b.cost - a.cost),
        models: apiUsageByModel
          .map((g) => ({
            model: g.model,
            cost: Number(g._sum.costUsd ?? 0),
            calls: g._count._all,
          }))
          .sort((a, b) => b.cost - a.cost),
        totals: {
          cost: totalUsd,
          calls: apiUsage.length,
          cacheHitRate,
          cacheReadTokens: totalCacheReadTokens,
          cacheWriteTokens: totalCacheWriteTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        },
      },
      auditLogs,
      students: safeStudents,
      lessons: safeLessons,
      // UI dürüst bir bant gösterebilsin: "tanı yok" ile "tanı gizlendi" karışmasın.
      clinical: {
        masked: !access.granted,
        consentExpiresAt: access.expiresAt?.toISOString() ?? null,
        consentReason: access.reason,
      },
    });
  } catch (error) {
    logError("admin/users/[id]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
