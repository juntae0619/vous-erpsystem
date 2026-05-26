import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireAuth } from "@/lib/api";
import { startOfMonth, endOfMonth } from "date-fns";

// GET /api/attendance/monthly?year=2026&month=5&userId=xxx
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const year  = parseInt(sp.get("year")  ?? String(new Date().getFullYear()));
  const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1));
  // 관리자는 다른 직원 조회 가능
  const targetUserId =
    session!.user.role !== "USER" && sp.get("userId")
      ? sp.get("userId")!
      : session!.user.id;

  const from = startOfMonth(new Date(year, month - 1, 1));
  const to   = endOfMonth(new Date(year, month - 1, 1));

  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId: targetUserId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });

  // 해당 월 승인된 휴가 조회 (달력에 표시용)
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId: targetUserId,
      status: "APPROVED",
      startDate: { lte: to },
      endDate:   { gte: from },
    },
  });

  // 요약 통계
  const summary = {
    total:      records.length,
    normal:     records.filter((r) => r.status === "NORMAL").length,
    late:       records.filter((r) => r.status === "LATE").length,
    earlyLeave: records.filter((r) => r.status === "EARLY_LEAVE").length,
    absent:     records.filter((r) => r.status === "ABSENT").length,
    onLeave:    records.filter((r) => r.status === "ON_LEAVE").length,
    totalWorkMinutes: records.reduce((acc, r) => acc + (r.workMinutes ?? 0), 0),
  };

  return ok({ records, leaves, summary });
}
