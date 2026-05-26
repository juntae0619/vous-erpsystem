import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  calculateAnnualLeaveDays,
  parseDateInput,
} from "@/lib/leave";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

async function resolveTargetUserId(
  session: NonNullable<Awaited<ReturnType<typeof requireAuth>>["session"]>,
  requestedUserId: string | null
) {
  const role = session.user.role;
  const selfId = session.user.id;

  if (requestedUserId && requestedUserId !== selfId) {
    if (role !== "ADMIN" && role !== "MANAGER") {
      return { error: fail("권한이 없습니다", 403) as ReturnType<typeof fail>, userId: null };
    }
    return { error: null, userId: requestedUserId };
  }

  return { error: null, userId: selfId };
}

async function getBalancePayload(userId: string, year: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { joinedAt: true },
  });
  if (!user) return null;

  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_year: { userId, year } },
  });

  const totalDays = balance
    ? Number(balance.totalDays)
    : calculateAnnualLeaveDays(user.joinedAt, year);

  const usedDays = balance ? Number(balance.usedDays) : 0;
  const carryOverDays = balance ? Number(balance.carryOverDays) : 0;
  const remainingDays = totalDays + carryOverDays - usedDays;

  return {
    userId,
    year,
    joinedAt: user.joinedAt.toISOString(),
    totalDays,
    usedDays,
    carryOverDays,
    remainingDays,
    totalHalfDays: balance?.totalHalfDays ?? 0,
    usedHalfDays: balance?.usedHalfDays ?? 0,
    hasBalanceRecord: !!balance,
  };
}

// GET /api/leave/balance?userId=&year=
export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const target = await resolveTargetUserId(session!, searchParams.get("userId"));
  if (target.error) return target.error;

  const payload = await getBalancePayload(target.userId!, year);
  if (!payload) return fail("사용자를 찾을 수 없습니다", 404);

  return ok(payload);
}

const upsertSchema = z.object({
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "입사일 형식이 올바르지 않습니다"),
  year: z.number().int().min(2000).max(2100).optional(),
  userId: z.string().optional(),
});

// POST /api/leave/balance — 입사일 기준 연차 부여/갱신
export async function POST(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }

  const joinedAt = parseDateInput(parsed.data.joinedAt);
  if (!joinedAt) return fail("입사일 형식이 올바르지 않습니다", 400);

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (joinedAt > today) return fail("입사일은 오늘 이후일 수 없습니다", 400);

  const year = parsed.data.year ?? new Date().getFullYear();
  const target = await resolveTargetUserId(session!, parsed.data.userId ?? null);
  if (target.error) return target.error;
  const userId = target.userId!;

  const totalDays = calculateAnnualLeaveDays(joinedAt, year);

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { joinedAt },
    });

    const balance = await tx.leaveBalance.upsert({
      where: { userId_year: { userId, year } },
      update: { totalDays },
      create: {
        userId,
        year,
        totalDays,
        usedDays: 0,
        carryOverDays: 0,
      },
    });

    return balance;
  });

  await writeAuditLog({
    userId: session!.user.id,
    action: "LEAVE_BALANCE_UPSERT",
    resource: "LeaveBalance",
    resourceId: result.id,
    details: {
      targetUserId: userId,
      year,
      joinedAt: parsed.data.joinedAt,
      totalDays,
    },
  });

  const payload = await getBalancePayload(userId, year);
  return ok(payload, 201);
}
