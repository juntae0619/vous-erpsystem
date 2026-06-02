import { ok, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/contract/data-quality
export async function GET() {
  const { error } = await requireManager();
  if (error) return error;

  const [zeroAmount, syntheticNumber, noBillings, totalContracts] =
    await Promise.all([
      prisma.contract.findMany({
        where: { serviceAmount: 0 },
        select: {
          id: true,
          contractNumber: true,
          localGovName: true,
          contractName: true,
        },
        orderBy: { localGovName: "asc" },
      }),
      prisma.contract.findMany({
        where: {
          OR: [
            { contractNumber: { startsWith: "LEGACY-" } },
            { contractNumber: { startsWith: "IMPORT-" } },
          ],
        },
        select: {
          id: true,
          contractNumber: true,
          localGovName: true,
          contractName: true,
        },
        orderBy: { contractNumber: "asc" },
      }),
      prisma.contract.findMany({
        where: { billings: { none: {} } },
        select: {
          id: true,
          contractNumber: true,
          localGovName: true,
          contractName: true,
          serviceAmount: true,
        },
        orderBy: { localGovName: "asc" },
        take: 50,
      }),
      prisma.contract.count(),
    ]);

  return ok({
    totalContracts,
    zeroAmountCount: zeroAmount.length,
    syntheticNumberCount: syntheticNumber.length,
    noBillingsCount: noBillings.length,
    zeroAmount,
    syntheticNumber,
    noBillings: noBillings.map((c) => ({
      ...c,
      serviceAmount: Number(c.serviceAmount),
    })),
  });
}
