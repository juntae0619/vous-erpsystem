import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { LeaveBalanceCard } from "@/components/leave/LeaveBalanceCard";
import { LeaveRequestForm } from "@/components/leave/LeaveRequestForm";
import { LeaveRequestList } from "@/components/leave/LeaveRequestList";
import { LeaveApprovalPanel } from "@/components/leave/LeaveApprovalPanel";
import { calculateAnnualLeaveDays, formatDateInput } from "@/lib/leave";

export const metadata = { title: "휴가 관리" };

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;
  const year = new Date().getFullYear();
  const isManager = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { joinedAt: true },
  });
  if (!user) return null;

  let balance = await prisma.leaveBalance.findUnique({
    where: { userId_year: { userId, year } },
  });

  if (!balance) {
    balance = await prisma.leaveBalance.create({
      data: {
        userId,
        year,
        totalDays: calculateAnnualLeaveDays(user.joinedAt, year),
        usedDays: 0,
        carryOverDays: 0,
      },
    });
  }

  const [myRequests, pendingRequests] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId },
      include: {
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    isManager
      ? prisma.leaveRequest.findMany({
          where: { status: "PENDING" },
          include: {
            user: { select: { id: true, name: true, team: true, position: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalDays = Number(balance.totalDays);
  const carryOver = Number(balance.carryOverDays);
  const usedDays = Number(balance.usedDays);
  const remaining = totalDays + carryOver - usedDays;

  const serializedMyRequests = myRequests.map((r) => ({
    ...r,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    days: Number(r.days),
  }));

  const serializedPending = pendingRequests.map((r) => ({
    ...r,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    days: Number(r.days),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="휴가 관리" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto section-stack">
          <LeaveBalanceCard
            totalDays={totalDays}
            usedDays={usedDays}
            remainingDays={remaining}
            carryOverDays={carryOver}
            joinedAt={formatDateInput(user.joinedAt)}
            year={year}
          />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(280px,320px)_1fr]">
            <LeaveRequestForm />

            <div>
              <h3 className="mb-3 font-heading text-section-title">
                내 신청 내역
              </h3>
              <LeaveRequestList requests={serializedMyRequests} />
            </div>
          </div>

          {isManager && (
            <div>
              <h3 className="mb-3 font-heading text-section-title">
                승인 대기
                {pendingRequests.length > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-deep-violet text-caption font-bold text-white">
                    {pendingRequests.length}
                  </span>
                )}
              </h3>
              <LeaveApprovalPanel
                requests={serializedPending}
                currentUserId={userId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
