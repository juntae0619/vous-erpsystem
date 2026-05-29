import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ContractStatusBadge } from "@/components/contract/ContractStatusBadge";
import { BillingPanel } from "@/components/contract/BillingPanel";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatKRW, cn } from "@/lib/utils";
import { BILLING_CYCLE_MAP } from "@/lib/billing-cycle";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.contract.findUnique({ where: { id }, select: { contractName: true } });
  return { title: c?.contractName ?? "계약 상세" };
}

const FEE_TYPE_MAP: Record<string, string> = { RATE: "수수료율", FIXED: "정액" };

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, position: true } },
      billings: {
        include: { payments: true },
        orderBy: { billingDate: "desc" },
      },
    },
  });
  if (!contract) notFound();

  const isManager = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  // 직렬화
  const serializedBillings = contract.billings.map((b) => ({
    ...b,
    billingDate: b.billingDate.toISOString(),
    dueDate: b.dueDate.toISOString(),
    taxInvoiceDate: b.taxInvoiceDate?.toISOString() ?? null,
    serviceAmount: Number(b.serviceAmount),
    merchantFeeAmt: Number(b.merchantFeeAmt),
    totalAmount: Number(b.totalAmount),
    paidAmount: Number(b.paidAmount),
    payments: b.payments.map((p) => ({
      ...p,
      paidAt: p.paidAt.toISOString(),
      amount: Number(p.amount),
      createdAt: p.createdAt.toISOString(),
    })),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={contract.contractName}
        showBack
        actions={
          isManager ? (
            <Link
              href={`/contract/${id}/edit`}
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-8 h-8 rounded-lg hover:bg-[#e9ebf0] text-[#b3b3b3]")}
            >
              <Pencil size={14} />
            </Link>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* 계약 기본 정보 */}
          <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <ContractStatusBadge status={contract.status as import("@/components/contract/ContractStatusBadge").ContractStatus} />
              <p className="text-[11px] text-[#b3b3b3]">
                등록: {format(contract.createdAt, "yyyy.MM.dd", { locale: ko })}
              </p>
            </div>

            <h2 className="text-[18px] font-bold text-[#090c1d] mb-1 tracking-[-0.3px]" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
              {contract.contractName}
            </h2>
            <p className="text-[13px] text-[#b3b3b3] mb-5">
              {contract.region ? `${contract.region} · ` : ""}{contract.localGovName} · {contract.contractNumber}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "계약 기간", value: `${format(contract.startDate, "yyyy.MM.dd", { locale: ko })} ~ ${format(contract.endDate, "yyyy.MM.dd", { locale: ko })}` },
                { label: "서비스 금액", value: formatKRW(Number(contract.serviceAmount)) },
                { label: "청구 주기", value: BILLING_CYCLE_MAP[contract.billingCycle] },
                { label: "다음 청구 예정일", value: contract.nextBillingDate ? format(contract.nextBillingDate, "yyyy.MM.dd", { locale: ko }) : "-" },
                { label: "기관 담당", value: [contract.department, contract.managerName].filter(Boolean).join(" ") || "-" },
                { label: "연락처", value: contract.contactPhone ?? "-" },
                { label: "담당자(내부)", value: `${contract.assignee.name}${contract.assignee.position ? ` (${contract.assignee.position})` : ""}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-[#b3b3b3] mb-0.5">{label}</p>
                  <p className="text-[13px] font-medium text-[#292d34]">{value}</p>
                </div>
              ))}
            </div>

            {/* 가맹점 수수료 */}
            {contract.hasMerchantFee && (
              <div className="mt-4 p-3 bg-[#f8f9fb] rounded-xl">
                <p className="text-[11px] text-[#b3b3b3] mb-2">가맹점 수수료</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-[#b3b3b3]">유형</p>
                    <p className="text-[13px] font-medium text-[#292d34]">
                      {FEE_TYPE_MAP[contract.merchantFeeType ?? ""] ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#b3b3b3]">금액/율</p>
                    <p className="text-[13px] font-medium text-[#292d34]">
                      {contract.merchantFeeType === "RATE"
                        ? `${contract.merchantFeeRate}%`
                        : formatKRW(Number(contract.merchantFeeAmount))}
                    </p>
                  </div>
                  {contract.merchantFeeCycle && (
                    <div>
                      <p className="text-[11px] text-[#b3b3b3]">가맹점 정산 주기</p>
                      <p className="text-[13px] font-medium text-[#292d34]">
                        {BILLING_CYCLE_MAP[contract.merchantFeeCycle]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {contract.note && (
              <div className="mt-4 p-3 bg-[#f8f9fb] rounded-xl">
                <p className="text-[11px] text-[#b3b3b3] mb-1">비고</p>
                <p className="text-[13px] text-[#292d34]">{contract.note}</p>
              </div>
            )}
          </Card>

          {/* 청구·수금 패널 */}
          <BillingPanel
            contractId={contract.id}
            billings={serializedBillings}
            canManage={isManager}
          />
        </div>
      </div>
    </div>
  );
}
