import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { ContractForm, type ContractFormData } from "@/components/contract/ContractForm";
import { toMerchantSettlementCycle, type MerchantSettlementCycleValue } from "@/lib/billing-cycle";
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

  const merchantFeeCycle: MerchantSettlementCycleValue | undefined =
    toMerchantSettlementCycle(contract.merchantFeeCycle);

  const defaultValues: Partial<ContractFormData> = {
    region: contract.region ?? undefined,
    localGovName: contract.localGovName,
    contractNumber: contract.contractNumber,
    department: contract.department ?? undefined,
    managerName: contract.managerName ?? undefined,
    contactPhone: contract.contactPhone ?? undefined,
    contractName: contract.contractName,
    contractMethod: contract.contractMethod ?? undefined,
    billingMethod: contract.billingMethod ?? undefined,
    startDate: format(contract.startDate, "yyyy-MM-dd"),
    commencementDate: contract.commencementDate ? format(contract.commencementDate, "yyyy-MM-dd") : undefined,
    endDate: format(contract.endDate, "yyyy-MM-dd"),
    nextBillingDate: contract.nextBillingDate ? format(contract.nextBillingDate, "yyyy-MM-dd") : undefined,
    serviceAmount: String(Number(contract.serviceAmount)),
    billingCycle: contract.billingCycle,
    assigneeId: contract.assigneeId,
    hasMerchantFee: contract.hasMerchantFee,
    merchantFeeType: contract.merchantFeeType ?? undefined,
    merchantFeeRate: contract.merchantFeeRate ? String(Number(contract.merch