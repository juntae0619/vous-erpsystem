import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { ContractForm } from "@/components/contract/ContractForm";
import { format } from "date-fns";

export const metadata = { title: "계약 수정" };

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role === "USER") redirect("/contract");

  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) notFound();

  const assignees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, position: true },
    orderBy: { name: "asc" },
  });

  const defaultValues = {
    localGovName: contract.localGovName,
    contractNumber: contract.contractNumber,
    contractName: contract.contractName,
    startDate: format(contract.startDate, "yyyy-MM-dd"),
    endDate: format(contract.endDate, "yyyy-MM-dd"),
    serviceAmount: String(Number(contract.serviceAmount)),
    billingCycle: contract.billingCycle,
    assigneeId: contract.assigneeId,
    hasMerchantFee: contract.hasMerchantFee,
    merchantFeeType: contract.merchantFeeType ?? undefined,
    merchantFeeRate: contract.merchantFeeRate ? String(Number(contract.merchantFeeRate)) : undefined,
    merchantFeeAmount: contract.merchantFeeAmount ? String(Number(contract.merchantFeeAmount)) : undefined,
    merchantFeeCycle: contract.merchantFeeCycle ?? undefined,
    note: contract.note ?? undefined,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약 수정" showBack />
      <div className="flex-1 overflow-y-auto p-6">
        <ContractForm
          assignees={assignees}
          defaultValues={defaultValues}
          contractId={id}
        />
      </div>
    </div>
  );
}
