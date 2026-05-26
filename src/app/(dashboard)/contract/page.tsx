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
import { BILLING_CYCLE_MAP } from "@/lib/billing-cycle";

export const metadata = { title: "계약·수금 관리" };

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
        <div className="section-stack mx-auto max-w-5xl">

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "전체 청구액", value: formatKRW(totalBilled), color: "text-midnight-charcoal" },
              { label: "수금 완료", value: formatKRW(totalPaid), color: "text-deep-violet" },
              { label: "미수금", value: formatKRW(unpaidAmount), color: unpaidAmount > 0 ? "text-rich-plum" : "text-smoke-gray" },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <p className="mb-1 text-caption text-smoke-gray">{s.label}</p>
                <p className={`text-kpi text-[18px] ${s.color}`}>
                  {s.value}
                </p>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="mb-3 font-heading text-section-title">
              계약 목록
            </h2>

            {contracts.length === 0 ? (
              <Card className="py-8 text-center">
                <FileText size={32} className="mx-auto mb-3 text-ash-gray" />
                <p className="text-body-sm text-smoke-gray">등록된 계약이 없습니다</p>
                {isManager && (
                  <Link
                    href="/contract/new"
                    className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
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
                      <Card className="cursor-pointer transition-shadow hover:shadow-hover">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <ContractStatusBadge status={c.status as import("@/components/contract/ContractStatusBadge").ContractStatus} />
                              <span className="text-caption text-smoke-gray">
                                {BILLING_CYCLE_MAP[c.billingCycle]} 청구
                              </span>
                              {latestBilling && (
                                <PaymentStatusBadge status={latestBilling.paymentStatus as import("@/components/contract/ContractStatusBadge").PaymentStatus} />
                              )}
                            </div>
                            <h3 className="text-body-sm font-semibold text-deep-space-charcoal">{c.contractName}</h3>
                            <p className="mt-0.5 text-caption text-smoke-gray">
                              {c.localGovName} · {c.contractNumber}
                            </p>
                            <p className="mt-0.5 text-caption text-smoke-gray">
                              담당: {c.assignee.name} · 청구 {c._count.billings}건
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-body-sm font-semibold text-deep-space-charcoal">
                              {formatKRW(Number(c.serviceAmount))}
                            </p>
                            <p className="mt-0.5 text-caption text-smoke-gray">
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
