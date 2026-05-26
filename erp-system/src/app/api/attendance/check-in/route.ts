import { prisma } from "@/lib/prisma";
import { ok, fail, requireAuth } from "@/lib/api";
import { startOfDay, endOfDay, differenceInMinutes, parse } from "date-fns";

// POST /api/attendance/check-in
export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // 오늘 이미 출근한지 확인
  const existing = await prisma.attendanceRecord.findFirst({
    where: {
      userId: session!.user.id,
      date: { gte: todayStart, lte: todayEnd },
    },
  });
  if (existing?.checkIn) return fail("오늘 이미 출근 처리되었습니다");

  // 기준 시간 조회
  const settings = await prisma.attendanceSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const checkInStandard = settings?.checkInTime ?? "09:00";

  // 지각 판정 (기준시간 + 10분 grace period)
  const [h, m] = checkInStandard.split(":").map(Number);
  const standardTime = new Date(now);
  standardTime.setHours(h, m + 10, 0, 0); // grace 10분
  const isLate = now > standardTime;

  const record = await prisma.attendanceRecord.upsert({
    where: {
      userId_date: { userId: session!.user.id, date: todayStart },
    },
    create: {
      userId: session!.user.id,
      date: todayStart,
      checkIn: now,
      status: isLate ? "LATE" : "NORMAL",
    },
    update: {
      checkIn: now,
      status: isLate ? "LATE" : "NORMAL",
    },
  });

  return ok({ record, isLate });
}
