import { prisma } from "@/lib/prisma";
import { ok, fail, requireAuth } from "@/lib/api";
import { startOfDay, endOfDay, differenceInMinutes } from "date-fns";

// POST /api/attendance/check-out
export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const record = await prisma.attendanceRecord.findFirst({
    where: {
      userId: session!.user.id,
      date: { gte: todayStart, lte: todayEnd },
    },
  });

  if (!record?.checkIn) return fail("출근 기록이 없습니다. 먼저 출근해주세요");
  if (record.checkOut) return fail("오늘 이미 퇴근 처리되었습니다");

  // 기준 퇴근시간 조회
  const settings = await prisma.attendanceSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const checkOutStandard = settings?.checkOutTime ?? "18:00";
  const [h, m] = checkOutStandard.split(":").map(Number);
  const standardOut = new Date(now);
  standardOut.setHours(h, m, 0, 0);

  const isEarlyLeave = now < standardOut;
  const workMinutes = differenceInMinutes(now, record.checkIn);

  // 이미 지각이면 LATE 유지, 조퇴면 EARLY_LEAVE
  let status = record.status;
  if (isEarlyLeave) status = "EARLY_LEAVE";

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { checkOut: now, workMinutes, status },
  });

  return ok({ record: updated, workMinutes, isEarlyLeave });
}
