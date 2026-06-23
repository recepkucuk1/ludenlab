import { prisma } from "./db";

/* Öğrenci / klinik veri erişimi — TÜM sorgular owner (oturum açan uzman) ile
   filtrelenir; birincil izolasyon (RLS bypass eden rollerde de geçerli).
   `code` = öğrencinin Ad Soyad'ı (kimlik). İletişim PII'si (okul/veliIletisim)
   yalnız owner'ın roster'ında döner; araç prompt'larına gitmez. */

export interface SaveDocInput {
  code: string; // Ad Soyad
  kademe: string;
  type: string;
  content: string;
  model: string;
  credits: number;
  /** MEB hedef hizalaması (opsiyonel). */
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/** Öğrenci kaydı girdisi (oluştur/güncelle). */
export interface StudentInput {
  code: string; // Ad Soyad
  kademe: string;
  yas?: number | null;
  taniProfili?: string[];
  guclukDuzeyi?: string | null;
  gucluYonler?: string | null;
  ilgiAlanlari?: string | null;
  okul?: string | null;
  veliIletisim?: string | null;
  notes?: string | null;
  mebBolumler?: string[];
}

/** Owner'a ait, aynı adlı öğrenciyi bul-veya-oluştur; üretilen taslağı ona ata. */
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
      mebHedefKod: input.mebHedefKod ?? null,
      mebDavranisKodlari: input.mebDavranisKodlari ?? [],
    },
    select: { id: true },
  });

  return { caseId: kase.id, docId: doc.id };
}

/** Araç öğrenci-seçici için: AI-güvenli profil. İletişim PII'si döndürülmez. */
export function listStudentsForPicker(accountId: string) {
  return prisma.case.findMany({
    where: { ownerId: accountId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      kademe: true,
      yas: true,
      taniProfili: true,
      guclukDuzeyi: true,
      gucluYonler: true,
      ilgiAlanlari: true,
      mebBolumler: true,
    },
  });
}

export function listCases(accountId: string) {
  return prisma.case.findMany({
    where: { ownerId: accountId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      kademe: true,
      yas: true,
      taniProfili: true,
      guclukDuzeyi: true,
      gucluYonler: true,
      ilgiAlanlari: true,
      okul: true,
      veliIletisim: true,
      notes: true,
      mebBolumler: true,
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
      yas: true,
      taniProfili: true,
      guclukDuzeyi: true,
      gucluYonler: true,
      ilgiAlanlari: true,
      okul: true,
      veliIletisim: true,
      notes: true,
      mebBolumler: true,
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
        credits: true,
        model: true,
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

/* ── Öğrenci CRUD (hepsi ownerId-kapsamlı) ── */

export function createCase(accountId: string, data: StudentInput) {
  return prisma.case.create({
    data: {
      ownerId: accountId,
      code: data.code,
      kademe: data.kademe,
      yas: data.yas ?? null,
      taniProfili: data.taniProfili ?? [],
      guclukDuzeyi: data.guclukDuzeyi ?? null,
      gucluYonler: data.gucluYonler ?? null,
      ilgiAlanlari: data.ilgiAlanlari ?? null,
      okul: data.okul ?? null,
      veliIletisim: data.veliIletisim ?? null,
      notes: data.notes ?? null,
      mebBolumler: data.mebBolumler ?? [],
    },
    select: { id: true },
  });
}

export async function updateCase(
  accountId: string,
  caseId: string,
  data: Partial<StudentInput>,
): Promise<boolean> {
  const { taniProfili, mebBolumler, ...rest } = data;
  const res = await prisma.case.updateMany({
    where: { id: caseId, ownerId: accountId },
    data: {
      ...rest,
      ...(taniProfili !== undefined ? { taniProfili: { set: taniProfili } } : {}),
      ...(mebBolumler !== undefined ? { mebBolumler: { set: mebBolumler } } : {}),
    },
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

/** Tek taslak (owner-kapsamlı) — Kütüphane görüntüleyici için içerik + meta. */
export function getDocument(accountId: string, docId: string) {
  return prisma.generatedDocument.findFirst({
    where: { id: docId, case: { ownerId: accountId } },
    select: {
      id: true,
      type: true,
      content: true,
      model: true,
      credits: true,
      createdAt: true,
      case: { select: { id: true, code: true } },
    },
  });
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
