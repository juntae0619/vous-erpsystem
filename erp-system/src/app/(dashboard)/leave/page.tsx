import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { LeaveBalanceCard } from "@/components/leave/LeaveBalanceCard";
import { LeaveRequestForm } from "@/components/leave/LeaveRequestForm";
import { LeaveRequestList } from "@/components/leave/LeaveRequestList";
import { LeaveApprovalPanel } from "@/components/leave/LeaveApprovalPanel";

export const metadata = { title: "휴가 관리" };

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;
  const year = new Date().getFullYear();
  const isManager = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const [balance, myRequests, pendingRequests] = await Promise.all([
    prisma.leaveBalance.findUnique({
      where: { userId_year: { userId, year } },
    }),
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

  const totalDays = balance ? Number(balance.totalDays) : 15;
  const carryOver = balance ? Number(balance.carryOverDays) : 0;
  const usedDays = balance ? Number(balance.usedDays) : 0;
  const remaining = totalDays + carryOver - usedDays;

  // Date → ISO string 직렬화 (클라이언트 컴포넌트 전달용)
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
        <div className="max-w-5xl mx-auto space-y-6">

          {/* 연차 현황 */}
          <div className="max-w-sm">
            <LeaveBalanceCard
              totalDays={totalDays}
              usedDays={usedDays}
              remainingDays={remaining}
              carryOverDays={carryOver}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* 왼쪽: 신청 폼 */}
            <LeaveRequestForm />

            {/* 오른쪽: 내 신청 내역 */}
            <div>
              <h3
                className="text-[15px] font-semibold text-[#090c1d] mb-3"
                style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
              >
                내 신청 내역
              </h3>
              <LeaveRequestList requests={serializedMyRequests} />
            </div>
          </div>

          {/* 매니저: 승인 대기 */}
          {isManager && (
            <div>
              <h3
                className="text-[15px] font-semibold text-[#090c1d] mb-3"
                style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
              >
                승인 대기
                {pendingRequests.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#7b68ee] text-white text-[11px] font-bold">
                    {pendingRequests.length}
                  </span>
                )}
              </h3>
              <LeaveApprovalPanel requests={serializedPending} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
