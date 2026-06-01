import { z } from "zod";
import { prisma } from "./db";

/* Seans (takvim) verisi — hepsi ownerId-kapsamlı. */

export const sessionSchema = z.object({
  caseId: z.string().trim().nullish(),
  title: z.string().trim().min(1, "Başlık gerekli").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih biçimi YYYY-MM-DD olmalı"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().max(2000).optional(),
  status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(0).max(6).nullish(),
});

export interface SessionInput {
  caseId?: string | null;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  note?: string;
  status?: string; // PLANNED | COMPLETED | CANCELLED
  isRecurring?: boolean;
  recurringDay?: number | null; // 0=Pzt … 6=Paz
}

function toData(accountId: string, input: SessionInput) {
  return {
    ownerId: accountId,
    caseId: input.caseId || null,
    title: input.title,
    date: new Date(input.date),
    startTime: input.startTime,
    endTime: input.endTime,
    note: input.note || null,
    status: input.status || "PLANNED",
    isRecurring: Boolean(input.isRecurring),
    recurringDay: input.isRecurring ? (input.recurringDay ?? null) : null,
  };
}

export function createSession(accountId: string, input: SessionInput) {
  return prisma.session.create({ data: toData(accountId, input), select: { id: true } });
}

export async function updateSession(
  accountId: string,
  id: string,
  input: SessionInput,
): Promise<boolean> {
  const { ownerId: _ownerId, ...data } = toData(accountId, input);
  const res = await prisma.session.updateMany({ where: { id, ownerId: accountId }, data });
  return res.count > 0;
}

export async function deleteSession(accountId: string, id: string): Promise<boolean> {
  const res = await prisma.session.deleteMany({ where: { id, ownerId: accountId } });
  return res.count > 0;
}

function timeOverlap(aS: string, aE: string, bS: string, bE: string): boolean {
  return aS < bE && bS < aE; // HH:MM string karşılaştırması yeterli
}

/** Aynı güne (tek seferlik) ya da aynı haftaya (tekrar eden) düşen, saati çakışan,
    iptal olmayan başka seans var mı? excludeId: güncellenen seansı dışla. */
export async function findConflict(
  accountId: string,
  input: SessionInput,
  excludeId?: string,
): Promise<boolean> {
  if (input.status === "CANCELLED") return false;
  const [y, m, d] = input.date.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0=Pzt … 6=Paz
  const candidates = await prisma.session.findMany({
    where: {
      ownerId: accountId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { not: "CANCELLED" },
      OR: [
        { isRecurring: false, date: new Date(input.date) },
        { isRecurring: true, recurringDay: weekday },
      ],
    },
    select: { startTime: true, endTime: true },
  });
  return candidates.some((c) => timeOverlap(input.startTime, input.endTime, c.startTime, c.endTime));
}

/** Tek seferlik seanslar verilen aralıkta + tüm tekrar edenler (haftaya istemcide genişletilir). */
export function listSessions(accountId: string, fromISO: string, toISO: string) {
  return prisma.session.findMany({
    where: {
      ownerId: accountId,
      OR: [
        { isRecurring: false, date: { gte: new Date(fromISO), lte: new Date(toISO) } },
        { isRecurring: true },
      ],
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      caseId: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      note: true,
      status: true,
      isRecurring: true,
      recurringDay: true,
      case: { select: { code: true } },
      exceptions: {
        select: {
          originalDate: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          note: true,
        },
      },
    },
  });
}

export interface ExceptionFields {
  title?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  note?: string | null;
}

/** Tekrar eden seansın tek occurrence'ı için override (upsert). Sahiplik doğrulanır. */
export async function upsertException(
  accountId: string,
  sessionId: string,
  dateISO: string,
  fields: ExceptionFields,
): Promise<boolean> {
  const owns = await prisma.session.count({ where: { id: sessionId, ownerId: accountId } });
  if (!owns) return false;
  const originalDate = new Date(dateISO);
  const data = {
    title: fields.title ?? null,
    startTime: fields.startTime ?? null,
    endTime: fields.endTime ?? null,
    status: fields.status ?? null,
    note: fields.note ?? null,
  };
  await prisma.sessionException.upsert({
    where: { sessionId_originalDate: { sessionId, originalDate } },
    create: { sessionId, originalDate, ...data },
    update: data,
  });
  return true;
}

/** Tek occurrence'ı iptal et (status=CANCELLED exception). */
export function cancelOccurrence(accountId: string, sessionId: string, dateISO: string) {
  return upsertException(accountId, sessionId, dateISO, { status: "CANCELLED" });
}
