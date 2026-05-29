import { prisma } from "./db";

/* Klinik veri erişimi — TÜM sorgular owner (oturum açan uzman) ile filtrelenir.
   Bu, birincil izolasyon (RLS bypass eden rollerde de geçerli). */

export interface SaveDocInput {
  code: string; // rumuz
  kademe: string;
  type: string; // bep_hedef | ilerleme_raporu | aile_ozeti | seans_plani
  content: string;
  model: string;
  credits: number;
}

/** Owner'a ait, aynı rumuzlu vakayı bul-veya-oluştur; üretilen taslağı ona ekle. */
export async function saveDocument(accountId: string, input: SaveDocInput) {
  const existing = await prisma.case.findFirst({
    where: { ownerId: accountId, code: input.code },
    select: { id: true },
  });

  const kase =
    existing ??
    (await prisma.case.create({
      data: { ownerId: accountId, code: input.code, kademe: input.kademe },
      select: { id: true },
    }));

  const doc = await prisma.generatedDocument.create({
    data: {
      caseId: kase.id,
      type: input.type,
      content: input.content,
      model: input.model,
      credits: input.credits,
    },
    select: { id: true },
  });

  return { caseId: kase.id, docId: doc.id };
}

export function listCases(accountId: string) {
  return prisma.case.findMany({
    where: { ownerId: accountId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      kademe: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { documents: true } },
    },
  });
}

export function getCaseWithDocs(accountId: string, caseId: string) {
  return prisma.case.findFirst({
    where: { id: caseId, ownerId: accountId },
    select: {
      id: true,
      code: true,
      kademe: true,
      notes: true,
      createdAt: true,
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          content: true,
          model: true,
          credits: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function dashboardData(accountId: string) {
  const [caseCount, docCount, recentCases, recentDocs, byType] = await Promise.all([
    prisma.case.count({ where: { ownerId: accountId } }),
    prisma.generatedDocument.count({ where: { case: { ownerId: accountId } } }),
    prisma.case.findMany({
      where: { ownerId: accountId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        kademe: true,
        updatedAt: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.generatedDocument.findMany({
      where: { case: { ownerId: accountId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        type: true,
        createdAt: true,
        case: { select: { id: true, code: true } },
      },
    }),
    prisma.generatedDocument.groupBy({
      by: ["type"],
      where: { case: { ownerId: accountId } },
      _count: { _all: true },
    }),
  ]);
  return { caseCount, docCount, recentCases, recentDocs, byType };
}

/* ── Vaka CRUD (hepsi ownerId-kapsamlı) ── */

export function createCase(accountId: string, data: { code: string; kademe: string; notes?: string }) {
  return prisma.case.create({
    data: { ownerId: accountId, code: data.code, kademe: data.kademe, notes: data.notes || null },
    select: { id: true },
  });
}

export async function updateCase(
  accountId: string,
  caseId: string,
  data: { code?: string; kademe?: string; notes?: string },
): Promise<boolean> {
  const res = await prisma.case.updateMany({
    where: { id: caseId, ownerId: accountId },
    data,
  });
  return res.count > 0;
}

export async function deleteCase(accountId: string, caseId: string): Promise<boolean> {
  const res = await prisma.case.deleteMany({ where: { id: caseId, ownerId: accountId } });
  return res.count > 0;
}

export async function deleteDocument(accountId: string, docId: string): Promise<boolean> {
  const res = await prisma.generatedDocument.deleteMany({
    where: { id: docId, case: { ownerId: accountId } },
  });
  return res.count > 0;
}

/** Kütüphane: owner'ın tüm üretilen taslakları (opsiyonel tip filtresi). */
export function listAllDocuments(accountId: string, type?: string) {
  return prisma.generatedDocument.findMany({
    where: { case: { ownerId: accountId }, ...(type ? { type } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      credits: true,
      model: true,
      createdAt: true,
      case: { select: { id: true, code: true, kademe: true } },
    },
  });
}
