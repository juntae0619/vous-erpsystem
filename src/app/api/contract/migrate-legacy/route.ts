import { ok, fail, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  fetchLegacyContracts,
  LEGACY_APP_PASSWORD,
  LEGACY_APP_URL,
  paymentStatus,
  toPrismaBillingCycle,
} from "@/lib/legacy-contract-app";
import { z } from "zod/v4";

const bodySchema = z.object({
  dryRun: z.boolean().default(true),
  force: z.boolean().default(false),
  baseUrl: z.string().url().optional(),
  password: z.string().optional(),
});

// POST /api/contract/migrate-legacy — 레거시 :5000 앱 데이터 이전 (ADMIN)
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  }

  const { dryRun, force, baseUrl, password } = parsed.data;

  const assignee = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!assignee) return fail("활성 ADMIN 사용자가 없습니다", 400);

  let contracts;
  try {
    contracts = await fetchLegacyContracts({
      baseUrl: baseUrl ?? LEGACY_APP_URL,
      password: password ?? LEGACY_APP_PASSWORD,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "레거시 앱 연결 실패";
    return fail(msg, 502);
  }

  const existingNumbers = new Set(
    (
      await prisma.contract.findMany({
        where: {
          contractNumber: { in: contracts.map((c) => c.contractNumber) },
        },
        select: { contractNumber: true },
      })
    ).map((c) => c.contractNumber)
  );

  const preview = contracts.map((c) => ({
    contractNumber: c.contractNumber,
    localGovName: c.localGovName,
    contractName: c.contractName,
    serviceAmount: c.serviceAmount,
    billingCount: c.billings.length,
    exists: existingNumbers.has(c.contractNumber),
  }));

  if (dryRun) {
    return ok({
      dryRun: true,
      total: contracts.length,
      newCount: preview.filter((p) => !p.exists).length,
      existingCount: preview.filter((p) => p.exists).length,
      totalBillings: contracts.reduce((s, c) => s + c.billings.length, 0),
      preview,
    });
  }

  let createdContracts = 0;
  let skippedContracts = 0;
  let createdBillings = 0;

  await prisma.$transaction(async (tx) => {
    for (const legacy of contracts) {
      const existing = await tx.contract.findUnique({
        where: { contractNumber: legacy.contractNumber },
      });

      if (existing && !force) {
        skippedContracts++;
        continue;
      }

      let contractId = existing?.id;

      if (existing && force) {
        await tx.payment.deleteMany({
          where: { billing: { contractId: existing.id } },
        });
        await tx.billing.deleteMany({ where: { contractId: existing.id } });
        await tx.contract.delete({ where: { id: existing.id } });
        contractId = undefined;
      }

      if (!contractId) {
        const created = await tx.contract.create({
          data: {
            region: legacy.region,
            localGovName: legacy.localGovName,
            contractNumber: legacy.contractNumber,
            contractName: legacy.contractName,
            department: legacy.department,
            managerName: legacy.managerName,
            contactPhone: legacy.contactPhone,
            contractMethod: legacy.contractMethod,
            startDate: new Date(legacy.contractDate),
            commencementDate: legacy.commencementDate
              ? new Date(legacy.commencementDate)
              : null,
            endDate: new Date(legacy.endDate),
            nextBillingDate: legacy.nextBillingDate
              ? new Date(legacy.nextBillingDate)
              : null,
            serviceAmount: legacy.serviceAmount,
            billingMethod: legacy.billingMethod,
            billingCycle: toPrismaBillingCycle(legacy.billingCycle),
            assigneeId: assignee.id,
            voucherName: legacy.voucherName,
            hasMerchantFee: legacy.hasMerchantFee,
            merchantFeeType: legacy.merchantFeeType,
            merchantFeeRate: legacy.merchantFeeRate,
            note: legacy.note,
          },
        });
        contractId = created.id;
        createdContracts++;
      }

      for (const bill of legacy.billings) {
        const totalAmount = bill.totalAmount;
        const paidAmount = bill.paidAmount;
        const billing = await tx.billing.create({
          data: {
            contractId: contractId!,
            billingDate: new Date(bill.billingDate),
            dueDate: new Date(bill.paidAt ?? bill.billingDate),
            serviceAmount: bill.serviceAmount,
            merchantFeeAmt: bill.vatAmount,
            totalAmount,
            paidAmount,
            paymentStatus: paymentStatus(totalAmount, paidAmount),
            billMonth: bill.billMonth,
            billPeriod: bill.billPeriod,
            billPeriodRange:
              bill.periodStart && bill.periodEnd
                ? `${bill.periodStart} ~ ${bill.periodEnd}`
                : null,
            merchantSales: bill.merchantSales,
            note: bill.note,
          },
        });
        createdBillings++;

        if (paidAmount > 0 && bill.paidAt) {
          await tx.payment.create({
            data: {
              billingId: billing.id,
              paidAt: new Date(bill.paidAt),
              amount: paidAmount,
            },
          });
        }
      }
    }
  });

  await writeAuditLog({
    userId: session!.user.id,
    action: "CONTRACT_LEGACY_MIGRATE",
    resource: "Contract",
    details: { createdContracts, skippedContracts, createdBillings, force },
  });

  return ok({
    dryRun: false,
    createdContracts,
    skippedContracts,
    createdBillings,
  });
}
