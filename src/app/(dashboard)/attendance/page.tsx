import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { CheckInOutButton } from "@/components/attendance/CheckInOutButton";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { ExportButton } from "@/components/export/ExportButton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfDay, endOfDay } from "date-fns";
import { formatTime, attendanceStatusMap } from "@/lib/utils";

export const metadata = { title: "출퇴근 관리" };

export default async function AttendancePage() {
  const session = await auth();
  if (!session?.user) return null;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = endOfDay(now);

  // 오늘 내 출퇴근 기록
  const myRecord = await prisma.attendanceRecord.findFirst({
    where: { userId: session.user.id, date: { gte: todayStart, lte: todayEnd } },
  });

  // 관리자: 전 직원 오늘 현황
  const isManager = session.user.role !== "USER";
  const allToday = isManager
    ? await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true, team: true, position: true,
          attendances: {
            where: { date: { gte: todayStart, lte: todayEnd } },
            take: 1,
          },
          leaveRequests: {
            where: { status: "APPROVED", startDate: { lte: todayEnd }, endDate: { gte: todayStart } },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      })
    : [];

  const nameOrder = ["박상호", "박준태", "박승원", "김지숙", "김희진", "김선희"];

  allToday.sort((a, b) => {
    const ia = nameOrder.indexOf(a.name);
    const ib = nameOrder.indexOf(b.name);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name, "ko");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="출퇴근 관리"
        subtitle="근태 기록을 확인하세요"
        actions={
          isManager ? (
            <ExportButton
              href={`/api/export/attendance?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`}
              label="Excel"
            />
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 상단: 출퇴근 버튼 + 전직원 현황 */}
          <div className={`grid gap-4 ${isManager ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-md"}`}>
            <CheckInOutButton
              initialRecord={
                myRecord
                  ? {
                      id:          myRecord.id,
                      checkIn:     myRecord.checkIn?.toISOString() ?? null,
                      checkOut:    myRecord.checkOut?.toISOString() ?? null,
                      status:      myRecord.status,
                      workMinutes: myRecord.workMinutes,
                    }
                  : null
              }
            />

            {/* 관리자: 전 직원 오늘 현황 */}
            {isManager && (
              <Card className="overflow-hidden p-0 shadow-card border-[#e8e8e8] rounded-xl">
                <div className="bg-[#2c3e6b] px-5 py-3">
                  <h3 className="text-[14px] font-semibold text-white tracking-[-0.15px]">
                    전 직원 오늘 현황
                  </h3>
                </div>
                <div className="p-5">
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {allToday.map((u) => {
                    const att = u.attendances[0];
                    const leave = u.leaveRequests[0];
                    const status = leave ? "ON_LEAVE" : att?.status ?? null;
                    const statusInfo = status ? attendanceStatusMap[status] : null;

                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#e9ebf0] flex items-center justify-center text-[11px] font-semibold text-[#292d34]">
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#292d34]">{u.name}</p>
                            <p className="text-[11px] text-[#b3b3b3]">{u.team}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {att?.checkIn && (
                            <span className="text-[11px] text-[#b3b3b3]">
                              {formatTime(att.checkIn)}
                            </span>
                          )}
                          {statusInfo ? (
                            <Badge
                              className={`text-[11px] px-2 py-0.5 rounded-full border-0 font-medium ${statusInfo.bg} ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </Badge>
                          ) : (
                            <Badge className="text-[11px] px-2 py-0.5 rounded-full border-0 font-medium bg-[#e9ebf0] text-[#b3b3b3]">
                              미출근
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              </Card>
            )}
          </div>

          {/* 월별 달력 */}
          <AttendanceCalendar />
        </div>
      </div>
    </div>
  );
}
