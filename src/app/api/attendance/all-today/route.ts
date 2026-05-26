import { prisma } from "@/lib/prisma";
import { ok, requireManager } from "@/lib/api";
import { startOfDay, endOfDay } from "date-fns";

// GET /api/attendance/all-today — 전 직원 오늘 출퇴근 현황 (관리자/중간관리자)
export async function GET() {
  const { error } = await requireManager();
  if (error) return error;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, team: true, position: true,
      attendances: {
        where: { date: { gte: todayStart, lte: todayEnd } },
        select: { checkIn: true, checkOut: true, status: true, workMinutes: true },
        take: 1,
      },
      leaveRequests: {
        where: {
          status: "APPROVED",
          startDate: { lte: todayEnd },
          endDate:   { gte: todayStart },
        },
        select: { type: true, halfDayType: true },
        take: 1,
      },
    },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });

  const result = users.map((u) => ({
    id:         u.id,
    name:       u.name,
    team:       u.team,
    position:   u.position,
    attendance: u.attendances[0] ?? null,
    onLeave:    u.leaveRequests[0] ?? null,
  }));

  return ok(result);
}
