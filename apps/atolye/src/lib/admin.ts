import { prisma } from "./db";

/* Admin sorguları — yalnız admin-gated route/sayfalardan çağrılır (ownerId-bağımsız). */

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
      createdAt: true,
      _count: { select: { cases: true } },
    },
  });
}
