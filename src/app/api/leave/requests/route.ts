import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { calculateAnnualLeaveDays } from "@/lib/leave";
import { leaveTypeSchema } from "@/lib/leave-types";
import { z } from "zod/v4";

// 영업일 수 계산 (주말 제외)
function countBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const curr = new Date(start);
  curr.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (curr <= endD) {
    const day = curr.getDay();
    if (day !== 0 && day !== 6) count++;
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

// GET /api/leave/requests?status=&userId=&year=&page=&limit=
export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const role = session!.user.role;
  const selfId = session!.user.id;

  // 관리자·매니저는 다른 사용자 목록 조회 가능
  let userId: string | undefined;
  if (role === "ADMIN" || role === "MANAGER") {
    userId = searchParams.get("userId") ?? undefined;
  } else {
    userId = selfId;
  }

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (year) {
    where.startDate = {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`),
    };
  }

  const [total, requests] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, team: true, position: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ requests, total, page, limit });
}

const createSchema = z.object({
  type: leaveTypeSchema,
  halfDayType: z.enum(["AM", "PM"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(2, "사유를 입력해주세요"),
});

// POST /api/leave/requests
export async function POST(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }
  const data = parsed.data;

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (end < start) return fail("종료일이 시작일보다 빠를 수 없습니다", 400);

  let days: number;
  if (data.type === "HALF_DAY") {
    days = 0.5;
  } else {
    days = countBusinessDays(start, end);
    if (days === 0) return fail("영업일 기준 휴가 일수가 0일입니다", 400);
  }

  const year = start.getFullYear();
  const userId = session!.user.id;

  // 연차/반차의 경우 잔여일수 확인
  if (data.type === "ANNUAL" || data.type === "HALF_DAY") {
    const [balance, user] = await Promise.all([
      prisma.leaveBalance.findUnique({
        where: { userId_year: { userId, year } },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { joinedAt: true },
      }),
    ]);

    const defaultTotalDays = user
      ? calculateAnnualLeaveDays(user.joinedAt, year)
      : 0;
    const totalDays = balance
      ? Number(balance.totalDays) + Number(balance.carryOverDays)
      : defaultTotalDays;
    const usedDays = balance ? Number(balance.usedDays) : 0;
    const remaining = totalDays - usedDays;
    if (days > remaining) {
      return fail(`연차 잔여일수 부족 (잔여: ${remaining}일, 신청: ${days}일)`, 400);
    }
  }

  // 중복 신청 확인
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) return fail("해당 기간에 이미 휴가 신청이 존재합니다", 409);

  try {
    const request = await prisma.leaveRequest.create({
      data: {
        userId,
        type: data.type,
        halfDayType: data.halfDayType ?? null,
        startDate: start,
        endDate: end,
        days,
        reason: data.reason,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return ok(request, 201);
  } catch (error) {
    console.error("[POST /api/leave/requests]", error);
    return fail("휴가 신청 저장 중 오류가 발생했습니다", 500);
  }
}
