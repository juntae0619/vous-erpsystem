import { requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format, startOfMonth, endOfMonth } from "date-fns";

// GET /api/export/attendance?year=2026&month=5&userId=xxx
export async function GET(req: Request) {
  const { session, error } = await requireManager();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const targetUserId = searchParams.get("userId") ?? undefined;

  const from = startOfMonth(new Date(year, month - 1, 1));
  const to = endOfMonth(from);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      ...(targetUserId ? { userId: targetUserId } : {}),
      date: { gte: from, lte: to },
    },
    include: {
      user: { select: { name: true, team: true, position: true } },
    },
    orderBy: [{ user: { name: "asc" } }, { date: "asc" }],
  });

  const rows = records.map((r) => ({
    "이름": r.user.name,
    "팀": r.user.team ?? "",
    "직책": r.user.position ?? "",
    "날짜": format(r.date, "yyyy-MM-dd"),
    "출근시간": r.checkIn ? format(r.checkIn, "HH:mm") : "",
    "퇴근시간": r.checkOut ? format(r.checkOut, "HH:mm") : "",
    "근무시간(분)": r.workMinutes ?? "",
    "상태": r.status,
    "비고": r.note ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "출퇴근");

  // 열 너비 설정
  ws["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 20 },
  ];

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const fileName = `출퇴근_${year}년${month}월.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
