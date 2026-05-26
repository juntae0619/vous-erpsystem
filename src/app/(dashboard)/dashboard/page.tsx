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

      <div className="flex-1 overflow-y-auto p-6 section-stack">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <div className="mb-3 flex items-start justify-between">
              <div className="icon-accent h-8 w-8">
                <Clock size={15} />
              </div>
              <Badge variant={myAttendance?.checkIn ? "positive" : "neutral"}>
                {myAttendance?.checkIn ? "출근" : "미출근"}
              </Badge>
            </div>
            <p className="text-caption text-smoke-gray">오늘 출근</p>
            <p className="text-kpi mt-0.5">
              {myAttendance?.checkIn
                ? format(myAttendance.checkIn, "HH:mm")
                : "--:--"}
            </p>
            {myAttendance?.checkOut && (
              <p className="mt-1 text-caption text-smoke-gray">
                퇴근 {format(myAttendance.checkOut, "HH:mm")}
              </p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-start justify-between">
              <div className="icon-accent h-8 w-8">
                <FileText size={15} />
              </div>
              {pendingApprovals > 0 && (
                <Badge variant="positive">{pendingApprovals}건</Badge>
              )}
            </div>
            <p className="text-caption text-smoke-gray">
              {isManager ? "처리 대기" : "진행 중 결재"}
            </p>
            <p className="text-kpi mt-0.5">{pendingApprovals}건</p>
          </Card>

          <Card>
            <div className="mb-3 flex items-start justify-between">
              <div className="icon-accent h-8 w-8">
                <CalendarDays size={15} />
              </div>
            </div>
            <p className="text-caption text-smoke-gray">오늘 휴가 인원</p>
            <p className="text-kpi mt-0.5">{onLeaveToday}명</p>
            {myPendingLeaves > 0 && (
              <p className="mt-1 text-caption text-smoke-gray">
                내 신청 대기 {myPendingLeaves}건
              </p>
            )}
          </Card>

          {isManager ? (
            <Card>
              <div className="mb-3 flex items-start justify-between">
                <div className="icon-accent h-8 w-8">
                  <AlertCircle size={15} className={overdueCount > 0 ? "text-rich-plum" : ""} />
                </div>
                {overdueCount > 0 && (
                  <Badge variant="attention">연체 {overdueCount}건</Badge>
                )}
              </div>
              <p className="text-caption text-smoke-gray">이번 달 미수금</p>
              <p className="text-kpi mt-0.5">
                {unpaidBilling > 0
                  ? `${(unpaidBilling / 10000).toFixed(0)}만원`
                  : "없음"}
              </p>
            </Card>
          ) : (
            <Card>
              <div className="mb-3 flex items-start justify-between">
                <div className="icon-accent h-8 w-8">
                  <TrendingUp size={15} />
                </div>
              </div>
              <p className="text-caption text-smoke-gray">내 팀</p>
              <p className="text-kpi mt-0.5">바우처팀</p>
            </Card>
          )}
        </div>

        {isManager && totalBilling > 0 && (
          <Card>
            <h3 className="mb-4 font-heading text-section-title">이번 달 수금 현황</h3>
            <div className="mb-3 flex items-center gap-6">
              <div>
                <p className="text-caption text-smoke-gray">총 청구액</p>
                <p className="text-body font-semibold text-deep-space-charcoal">
                  {(totalBilling / 10000).toFixed(0)}만원
                </p>
              </div>
              <div>
                <p className="text-caption text-smoke-gray">입금 완료</p>
                <p className="text-body font-semibold text-deep-violet">
                  {(paidBilling / 10000).toFixed(0)}만원
                </p>
              </div>
              <div>
                <p className="text-caption text-smoke-gray">미수금</p>
                <p className="text-body font-semibold text-rich-plum">
                  {(unpaidBilling / 10000).toFixed(0)}만원
                </p>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-hint-of-sky">
              <div
                className="h-2 rounded-full bg-deep-violet transition-all"
                style={{ width: totalBilling > 0 ? `${(paidBilling / totalBilling) * 100}%` : "0%" }}
              />
            </div>
            <p className="mt-1.5 text-caption text-smoke-gray">
              수금률 {totalBilling > 0 ? Math.round((paidBilling / totalBilling) * 100) : 0}%
            </p>
          </Card>
        )}

        {totalBilling === 0 && isManager && (
          <Card className="py-8 text-center">
            <Building2 size={28} className="mx-auto mb-3 text-ash-gray" />
            <p className="text-body-sm font-medium text-smoke-gray">
              이번 달 청구 내역이 없습니다
            </p>
            <p className="mt-1 text-caption text-smoke-gray">
              계약·수금 관리에서 청구 내역을 등록해주세요
            </p>
          </Card>
        )}

        {recentActivity.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Activity size={14} className="text-deep-violet" />
              <h3 className="font-heading text-section-title">내 최근 활동</h3>
            </div>
            <div className="space-y-2.5">
              {recentActivity.map((log) => {
                const ACTION_MAP: Record<string, { label: string; color: string; href?: string }> = {
                  CONTRACT_CREATED: { label: "계약 등록", color: "text-deep-violet", href: "/contract" },
                  LEAVE_APPROVED: { label: "휴가 승인", color: "text-deep-violet", href: "/leave" },
                  LEAVE_REJECTED: { label: "휴가 반려", color: "text-rich-plum", href: "/leave" },
                  APPROVAL_APPROVED: { label: "결재 승인", color: "text-deep-violet", href: "/approval" },
                  APPROVAL_REJECTED: { label: "결재 반려", color: "text-rich-plum", href: "/approval" },
                  APPROVAL_APPROVED_FINAL: { label: "전결 처리", color: "text-deep-violet", href: "/approval" },
                };
                const info = ACTION_MAP[log.action] ?? { label: log.action, color: "text-smoke-gray" };
                const details = log.details as Record<string, unknown> | null;
                const detailText =
                  details?.contractName ?? details?.title ?? details?.type ?? "";

                return (
                  <div key={log.id} className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-ash-gray" />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className={`shrink-0 text-caption font-medium ${info.color}`}>
                        {info.label}
                      </span>
                      {detailText && (
                        <span className="truncate text-caption text-midnight-charcoal">{String(detailText)}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-caption text-smoke-gray">
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
