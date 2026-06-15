import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Shared auth + ownership guards for API routes.
 *
 * Each helper returns either a typed success shape or a `NextResponse`
 * error that the caller can `return` directly:
 *
 *     const gate = await requireAdmin();
 *     if (gate instanceof NextResponse) return gate;
 *     // gate.session is typed & guaranteed
 */

type SessionWithUserId = Session & { user: { id: string; role?: string } };

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
}

function forbidden(message = "Yetkisiz erişim"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Ensure the request comes from an authenticated therapist.
 * Returns the session on success, a NextResponse on failure.
 */
export async function requireAuth(): Promise<
  { session: SessionWithUserId } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  return { session: session as SessionWithUserId };
}

/**
 * Ensure the request comes from an authenticated admin.
 * Performs a fresh DB read so revoked admins lose access immediately.
 */
export async function requireAdmin(): Promise<
  { session: SessionWithUserId } | NextResponse
> {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;

  const therapist = await prisma.therapist.findUnique({
    where: { id: gate.session.user.id },
    select: { role: true },
  });

  if (therapist?.role !== "admin") return forbidden();
  return gate;
}

type StudentOwnershipOptions = {
  /** Extra fields to fetch. Defaults to only `id`. */
  select?: Parameters<typeof prisma.student.findFirst>[0] extends {
    select?: infer S;
  }
    ? S
    : never;
};

/**
 * Confirm the given student belongs to the therapist.
 * Returns the student on success, a NextResponse on failure.
 */
export async function requireStudentOwnership(
  studentId: string,
  therapistId: string,
  options?: StudentOwnershipOptions,
): Promise<
  | { student: { id: string } & Record<string, unknown> }
  | NextResponse
> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, therapistId },
    select: options?.select ?? { id: true },
  });
  if (!student) return notFound("Öğrenci bulunamadı");
  return { student: student as { id: string } & Record<string, unknown> };
}

/**
 * Confirm the given card belongs to the therapist.
 */
export async function requireCardOwnership(
  cardId: string,
  therapistId: string,
): Promise<{ card: { id: string } } | NextResponse> {
  const card = await prisma.card.findFirst({
    where: { id: cardId, therapistId },
    select: { id: true },
  });
  if (!card) return notFound("Kart bulunamadı");
  return { card };
}
