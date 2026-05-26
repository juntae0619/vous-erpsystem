import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Clock,
  FileText,
  Building2,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  Activity,
} from "lucide-react";

export const metadata = { title: "대시보드" };

async function getDashboardData(userId: string, role: string) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    myAttendance,
    pendingApprovals,
    myPendingLeaves,
    onLeaveToday,
    overdueCount,
    monthlyBilling,
    recentActivity,
  ] = await Promise.all([
    // 내 오늘 출퇴근
    prisma.attendanceRecord.findFirst({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
    }),
    // 내가 처리해야 할 미결 결재 (MANAGER/ADMIN)
    role !== "USER"
      ? prisma.approvalStep.count({
          where: {
            approverId: userId,
            status: "PENDING",
            document: { status: "IN_REVIEW" },
          },
        })
      : prisma.approvalDocument.count({
          where: { submitterId: userId, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
        }),
    // 내 대기 중인 휴가 신청
    prisma.leaveRequest.count({
      where: { userId, status: "PENDING" },
    }),
    // 오늘 휴가 중인 직원 수
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    }),
    // 연체 청구 건수 (관리자만)
    role !== "USER"
      ? prisma.billing.count({ where: { paymentStatus: "OVERDUE" } })
      : 0,
    // 이번 달 총 청구 / 입금 현황 (관리자만)
    role !== "USER"
      ? prisma.billing.aggregate({
          where: { billingDate: { gte: monthStart, lte: monthEnd } },
          _sum: { totalAmount: true, paidAmount: true },
        })
      : null,
    // 최근 활동 피드 (결재 + 휴가 최신 10건)
    prisma.auditLog.findMany({
      where: { userId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    myAttendance,
    pendingApprovals,
    myPendingLeaves,
    onLeaveToday,
    overdueCount,
    monthlyBilling,
    recentActivity,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { myAttendance, pendingApprovals, myPendingLeaves, onLeaveToday, overdueCount, monthlyBilling, recentActivity } =
    await getDashboardData(session.user.id, session.user.role);

  const isManager = session.user.role !== "USER";
  const today = new Date();

  const totalBilling = Number(monthlyBilling?._sum?.totalAmount ?? 0);
  const paidBilling = Number(monthlyBilling?._sum?.paidAmount ?? 0);
  const unpaidBilling = totalBilling - paidBilling;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="대시보드"
        subtitle={format(today, "yyyy년 M월 d일 (EEE)", { locale: ko })}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 요약 카드 그리드 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* 출근 현황 */}
          <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#edf6fd]">
                <Clock size={15} className="text-[#7b68ee]" />
              </div>
              <Badge
                variant="secondary"
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  myAttendance?.checkIn
                    ? "bg-green-50 text-green-600 border-green-100"
                    : "bg-[#e9ebf0] text-[#b3b3b3]"
                }`}
              >
                {myAttendance?.checkIn ? "출근" : "미출근"}
              </Badge>
            </div>
            <p className="text-[12px] text-[#b3b3b3] tracking-[-0.14px]">오늘 출근</p>
            <p
              className="text-[20px] font-bold text-[#090c1d] mt-0.5 tracking-[-0.5px]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              {myAttendance?.checkIn
                ? format(myAttendance.checkIn, "HH:mm")
                : "--:--"}
            </p>
            {myAttendance?.checkOut && (
              <p className="text-[12px] text-[#b3b3b3] mt-1">
                퇴근 {format(myAttendance.checkOut, "HH:mm")}
              </p>
            )}
          </Card>

          {/* 결재 현황 */}
          <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#edf6fd]">
                <FileText size={15} className="text-[#7b68ee]" />
              </div>
              {pendingApprovals > 0 && (
                <Badge className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#7b68ee] text-white border-0">
                  {pendingApprovals}건
                </Badge>
              )}
            </div>
            <p className="text-[12px] text-[#b3b3b3] tracking-[-0.14px]">
              {isManager ? "처리 대기" : "진행 중 결재"}
            </p>
            <p
              className="text-[20px] font-bold text-[#090c1d] mt-0.5 tracking-[-0.5px]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              {pendingApprovals}건
            </p>
          </Card>

          {/* 휴가 대기 / 오늘 휴가 */}
          <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#edf6fd]">
                <CalendarDays size={15} className="text-[#7b68ee]" />
              </div>
            </div>
            <p className="text-[12px] text-[#b3b3b3] tracking-[-0.14px]">오늘 휴가 인원</p>
            <p
              className="text-[20px] font-bold text-[#090c1d] mt-0.5 tracking-[-0.5px]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              {onLeaveToday}명
            </p>
            {myPendingLeaves > 0 && (
              <p className="text-[12px] text-[#b3b3b3] mt-1">
                내 신청 대기 {myPendingLeaves}건
              </p>
            )}
          </Card>

          {/* 연체 / 수금 현황 (관리자) */}
          {isManager ? (
            <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#edf6fd]">
                  <AlertCircle size={15} className={overdueCount > 0 ? "text-red-500" : "text-[#7b68ee]"} />
                </div>
                {overdueCount > 0 && (
                  <Badge className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-red-500 text-white border-0">
                    연체 {overdueCount}건
                  </Badge>
                )}
              </div>
              <p className="text-[12px] text-[#b3b3b3] tracking-[-0.14px]">이번 달 미수금</p>
              <p
                className="text-[20px] font-bold text-[#090c1d] mt-0.5 tracking-[-0.5px]"
                style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
              >
                {unpaidBilling > 0
                  ? `${(unpaidBilling / 10000).toFixed(0)}만원`
                  : "없음"}
              </p>
            </Card>
          ) : (
            <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#edf6fd]">
                  <TrendingUp size={15} className="text-[#7b68ee]" />
                </div>
              </div>
              <p className="text-[12px] text-[#b3b3b3] tracking-[-0.14px]">내 팀</p>
              <p
                className="text-[20px] font-bold text-[#090c1d] mt-0.5 tracking-[-0.5px]"
                style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
              >
                바우처팀
              </p>
            </Card>
          )}
        </div>

        {/* 수금 현황 (관리자) */}
        {isManager && totalBilling > 0 && (
          <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
            <h3
              className="text-[14px] font-semibold text-[#090c1d] mb-4 tracking-[-0.15px]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              이번 달 수금 현황
            </h3>
            <div className="flex items-center gap-6 mb-3">
              <div>
                <p className="text-[12px] text-[#b3b3b3]">총 청구액</p>
                <p className="text-[16px] font-semibold text-[#090c1d]">
                  {(totalBilling / 10000).toFixed(0)}만원
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#b3b3b3]">입금 완료</p>
                <p className="text-[16px] font-semibold text-green-600">
                  {(paidBilling / 10000).toFixed(0)}만원
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#b3b3b3]">미수금</p>
                <p className="text-[16px] font-semibold text-red-500">
                  {(unpaidBilling / 10000).toFixed(0)}만원
                </p>
              </div>
            </div>
            {/* 프로그레스 바 */}
            <div className="w-full bg-[#e9ebf0] rounded-full h-2">
              <div
                className="bg-[#7b68ee] h-2 rounded-full transition-all"
                style={{ width: totalBilling > 0 ? `${(paidBilling / totalBilling) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-[11px] text-[#b3b3b3] mt-1.5">
              수금률 {totalBilling > 0 ? Math.round((paidBilling / totalBilling) * 100) : 0}%
            </p>
          </Card>
        )}

        {/* 빈 상태 안내 */}
        {totalBilling === 0 && isManager && (
          <Card className="p-8 shadow-card border-[#e8e8e8] rounded-xl text-center">
            <Building2 size={28} className="mx-auto text-[#e8e8e8] mb-3" />
            <p className="text-[14px] font-medium text-[#b3b3b3]">
              이번 달 청구 내역이 없습니다
            </p>
            <p className="text-[12px] text-[#b3b3b3] mt-1">
              계약·수금 관리에서 청구 내역을 등록해주세요
            </p>
          </Card>
        )}

        {/* 최근 활동 피드 */}
        {recentActivity.length > 0 && (
          <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#7b68ee]" />
              <h3
                className="text-[14px] font-semibold text-[#090c1d] tracking-[-0.15px]"
                style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
              >
                내 최근 활동
              </h3>
            </div>
            <div className="space-y-2.5">
              {recentActivity.map((log) => {
                const ACTION_MAP: Record<string, { label: string; color: string; href?: string }> = {
                  CONTRACT_CREATED: { label: "계약 등록", color: "text-green-600", href: "/contract" },
                  LEAVE_APPROVED: { label: "휴가 승인", color: "text-[#7b68ee]", href: "/leave" },
                  LEAVE_REJECTED: { label: "휴가 반려", color: "text-red-500", href: "/leave" },
                  APPROVAL_APPROVED: { label: "결재 승인", color: "text-[#7b68ee]", href: "/approval" },
                  APPROVAL_REJECTED: { label: "결재 반려", color: "text-red-500", href: "/approval" },
                  APPROVAL_APPROVED_FINAL: { label: "전결 처리", color: "text-[#7b68ee]", href: "/approval" },
                };
                const info = ACTION_MAP[log.action] ?? { label: log.action, color: "text-[#b3b3b3]" };
                const details = log.details as Record<string, unknown> | null;
                const detailText =
                  details?.contractName ?? details?.title ?? details?.type ?? "";

                return (
                  <div key={log.id} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#e8e8e8] shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`text-[12px] font-medium shrink-0 ${info.color}`}>
                        {info.label}
                      </span>
                      {detailText && (
                        <span className="text-[12px] text-[#292d34] truncate">{String(detailText)}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#d0d0d0] shrink-0">
                      {formatDistanceToNow(log.createdAt, { addSuffix: true, locale: ko })}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
