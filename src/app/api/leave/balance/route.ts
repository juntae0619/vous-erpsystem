import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/leave/balance?userId=&year=
export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const role = session!.user.role;
  const selfId = session!.user.id;

  // 관리자·매니저는 다른 사용자 잔여 조회 가능
  const userId =
    (role === "ADMIN" || role === "MANAGER") && searchParams.get("userId")
      ? searchParams.get("userId")!
      : selfId;

  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_year: { userId, year } },
  });

  if (!balance) {
    return ok({
      userId,
      year,
      totalDays: 15,
      usedDays: 0,
      carryOverDays: 0,
      remainingDays: 15,
      totalHalfDays: 0,
      usedHalfDays: 0,
    });
  }

  const remainingDays =
    Number(balance.totalDays) + Number(balance.carryOverDays) - Number(balance.usedDays);

  return ok({ ...balance, remainingDays });
}
