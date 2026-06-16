import { prisma } from "./db";

/* Admin sorguları — yalnız admin-gated route/sayfalardan çağrılır (ownerId-bağımsız). */

export type AdminRole = "practitioner" | "admin";

export function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function adminStats() {
  const [accounts, cases, docs, sessions] = await Promise.all([
    prisma.account.count(),
    prisma.case.count(),
    prisma.generatedDocument.count(),
    prisma.session.count(),
  ]);
  return { accounts, cases, docs, sessions };
}

export function listAccounts() {
  return prisma.account.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      suspended: true,
      createdAt: true,
      _count: { select: { cases: true, sessions: true } },
    },
  });
}

export function getAccountDetail(id: string) {
  return prisma.account.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      suspended: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { cases: true, sessions: true } },
      cases: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          code: true,
          kademe: true,
          updatedAt: true,
          _count: { select: { documents: true } },
        },
      },
    },
  });
}

/** Audit için hafif kayıt (eski değerleri diff'lemek üzere). */
export function getAccountBasics(id: string) {
  return prisma.account.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, suspended: true },
  });
}

export async function setAccountRole(id: string, role: AdminRole) {
  await prisma.account.update({ where: { id }, data: { role } });
}

export async function setAccountSuspended(id: string, suspended: boolean) {
  await prisma.account.update({ where: { id }, data: { suspended } });
}

export async function deleteAccount(id: string) {
  // Case + Session ilişkileri onDelete: Cascade → birlikte silinir
  await prisma.account.delete({ where: { id } });
}
