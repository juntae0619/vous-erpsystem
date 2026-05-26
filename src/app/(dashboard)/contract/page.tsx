import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ContractStatusBadge, PaymentStatusBadge } from "@/components/contract/ContractStatusBadge";
import { ContractPageActions } from "@/components/contract/ContractPageActions";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatKRW, cn } from "@/lib/utils";

export const metadata = { title: "계약·수금 관리" };

const BILLING_CYCLE_MAP: Record<string, string> = {
  QUARTERLY: "분기",
  SEMI_ANNUAL: "반기",
  ANNUAL: "연간",
};

export default async function ContractPage() {
  const session = await auth();
  if (!session?.user) return null;

  const isManager = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const contracts = await prisma.contract.findMany({
    include: {
      assignee: { select: { id: true, name: true } },
      billings: {
        orderBy: { billingDate: "desc" },
        take: 1,
        select: {
          paymentStatus: true,
          totalAmount: true,
          billingDate: true,
        },
      },
      _count: { select: { billings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const billingStats = await prisma.billing.aggregate({
    _sum: { totalAmount: true, paidAmount: true },
    where: { contract: { status: "ACTIVE" } },
  });

  const totalBilled = Number(billingStats._sum.totalAmount ?? 0);
  const totalPaid = Number(billingStats._sum.paidAmount ?? 0);
  const unpaidAmount = totalBilled - totalPaid;

  const now = new Date();
  const managerActions = isManager ? (
    <ContractPageActions
      exportHref={`/api/export/billing?year=${now.getFullYear()}&month=${now.getMonth() + 1}`}
    />
  ) : undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약·수금 관리" actions={managerActions} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* 수금 현황 요약 */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "전체 청구액", value: formatKRW(totalBilled), color: "text-[#292d34]" },
              { label: "수금 완료", value: formatKRW(totalPaid), color: "text-green-600" },
              { label: "미수금", value: formatKRW(unpaidAmount), color: unpaidAmount > 0 ? "text-red-500" : "text-[#b3b3b3]" },
            ].map((s) => (
              <Card key={s.label} className="p-4 shadow-card border-[#e8e8e8] rounded-xl text-center">
                <p className="text-[11px] text-[#b3b3b3] mb-1">{s.label}</p>
                <p className={`text-[18px] font-bold tracking-[-0.3px] ${s.color}`} style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
                  {s.value}
                </p>
              </Card>
            ))}
          </div>

          {/* 계약 목록 */}
          <div>
            <h2 className="text-[15px] font-semibold text-[#090c1d] mb-3" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
              계약 목록
            </h2>

            {contracts.length === 0 ? (
              <Card className="p-8 shadow-card border-[#e8e8e8] rounded-xl text-center">
                <FileText size={32} className="text-[#e8e8e8] mx-auto mb-3" />
                <p className="text-[13px] text-[#b3b3b3]">등록된 계약이 없습니다</p>
                {isManager && (
                  <Link
                    href="/contract/new"
                    className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-8 text-[13px] border-[#e8e8e8] rounded-lg")}
                  >
                    계약 등록하기
                  </Link>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => {
                  const latestBilling = c.billings[0];
                  return (
                    <Link key={c.id} href={`/contract/${c.id}`}>
                      <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl hover:shadow-hover transition-shadow cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <ContractStatusBadge status={c.status as import("@/components/contract/ContractStatusBadge").ContractStatus} />
                              <span className="text-[11px] text-[#b3b3b3]">
                                {BILLING_CYCLE_MAP[c.billingCycle]} 청구
                              </span>
                              {latestBilling && (
                                <PaymentStatusBadge status={latestBilling.paymentStatus as import("@/components/contract/ContractStatusBadge").PaymentStatus} />
                              )}
                            </div>
                            <h3 className="text-[13px] font-semibold text-[#090c1d]">{c.contractName}</h3>
                            <p className="text-[12px] text-[#b3b3b3] mt-0.5">
                              {c.localGovName} · {c.contractNumber}
                            </p>
                            <p className="text-[11px] text-[#b3b3b3] mt-0.5">
                              담당: {c.assignee.name} · 청구 {c._count.billings}건
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[13px] font-semibold text-[#090c1d]">
                              {formatKRW(Number(c.serviceAmount))}
                            </p>
                            <p className="text-[11px] text-[#b3b3b3] mt-0.5">
                              {format(c.startDate, "yyyy.MM.dd", { locale: ko })} ~{" "}
                              {format(c.endDate, "yyyy.MM.dd", { locale: ko })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
