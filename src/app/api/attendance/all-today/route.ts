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
    orderBy: { name: "asc" },
  });

  const positionOrder: Record<string, number> = {
    "대표이사": 1,
    "이사":     2,
    "부장":     3,
    "과장":     4,
    "대리":     5,
    "사원":     6,
  };

  const sorted = users.sort((a, b) => {
    const pa = positionOrder[a.position ?? ""] ?? 99;
    const pb = positionOrder[b.position ?? ""] ?? 99;
    return pa !== pb ? pa - pb : a.name.localeCompare(b.name, "ko");
  });

  const result = sorted.map((u) => ({
    id:         u.id,
    name:       u.name,
    team:       u.team,
    position:   u.position,
    attendance: u.attendances[0] ?? null,
    onLeave:    u.leaveRequests[0] ?? null,
  }));

  return ok(result);
}
