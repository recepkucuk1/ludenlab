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
