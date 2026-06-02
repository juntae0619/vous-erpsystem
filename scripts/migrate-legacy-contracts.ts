import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  fetchLegacyContracts,
  LEGACY_APP_PASSWORD,
  LEGACY_APP_URL,
  paymentStatus,
  toPrismaBillingCycle,
} from "../src/lib/legacy-contract-app";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function createPrisma() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 환경변수가 필요합니다");
  }

  const prisma = createPrisma();

  const xlsxPath = resolve(process.cwd(), "legacy-export.xlsx");
  let xlsxBuffer: Buffer | undefined;
  try {
    xlsxBuffer = readFileSync(xlsxPath);
    console.log(`Excel 보조 데이터: ${xlsxPath}`);
  } catch {
    console.log("legacy-export.xlsx 없음 — 레거시 앱 HTML만 사용");
  }

  console.log(`레거시 앱 연결: ${LEGACY_APP_URL}`);
  const contracts = await fetchLegacyContracts({
    baseUrl: LEGACY_APP_URL,
    password: LEGACY_APP_PASSWORD,
    xlsxBuffer,
  });

  console.log(`조회된 계약: ${contracts.length}건`);
  const totalBillings = contracts.reduce((s, c) => s + c.billings.length, 0);
  console.log(`청구·입금 내역: ${totalBillings}건`);

  if (dryRun) {
    for (const c of contracts) {
      console.log(
        `- ${c.contractNumber} | ${c.localGovName} | 청구 ${c.billings.length}건 | ${c.serviceAmount.toLocaleString()}원`
      );
    }
    console.log("\n(dry-run 완료 — DB 변경 없음)");
    await prisma.$disconnect();
    return;
  }

  const assignee = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!assignee) throw new Error("활성 ADMIN 사용자가 없습니다");

  let createdContracts = 0;
  let skippedContracts = 0;
  let createdBillings = 0;

  await prisma.$transaction(async (tx) => {
    for (const legacy of contracts) {
      const existing = await tx.contract.findUnique({
        where: { contractNumber: legacy.contractNumber },
        include: { _count: { select: { billings: true } } },
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

  console.log(`\n마이그레이션 완료`);
  console.log(`- 신규 계약: ${createdContracts}건`);
  console.log(`- 건너뜀(기존): ${skippedContracts}건`);
  console.log(`- 청구 내역: ${createdBillings}건`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
