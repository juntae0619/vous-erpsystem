import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeDisbursement } from "@/lib/disbursement-types";
import { DisbursementPageContent } from "@/components/disbursement/DisbursementPageContent";
import type { DisbursementItem } from "@/components/disbursement/DisbursementList";
import { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "지급 관리" };

interface PageProps {
  searchParams: Promise<{
    assigneeId?: string;
    isPaid?: string;
    year?: string;
    month?: string;
    vendorName?: string;
  }>;
}

export default async function DisbursementPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const userId = session.user.id;
  const isManager =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const where: Prisma.DisbursementWhereInput = {
    scheduledDate: { gte: start, lte: end },
  };

  if (isManager) {
    if (params.assigneeId) where.assigneeId = params.assigneeId;
  } else {
    where.assigneeId = userId;
  }

  if (params.isPaid === "true") where.isPaid = true;
  if (params.isPaid === "false") where.isPaid = false;

  if (params.vendorName) {
    where.vendorName = { contains: params.vendorName, mode: "insensitive" };
  }

  const [items, statsAgg, paidAgg, unpaidCount, assignees] = await Promise.all([
    prisma.disbursement.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, team: true, position: true },
        },
      },
      orderBy: [{ isPaid: "asc" }, { scheduledDate: "asc" }],
    }),
    prisma.disbursement.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.disbursement.aggregate({
      where: { ...where, isPaid: true },
      _sum: { amount: true },
    }),
    prisma.disbursement.count({
      where: { ...where, isPaid: false },
    }),
    isManager
      ? prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true, position: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalAmount = Number(statsAgg._sum.amount ?? 0);
  const paidAmount = Number(paidAgg._sum.amount ?? 0);

  const serializedItems = items.map(
    (item) => serializeDisbursement(item) as DisbursementItem
  );

  return (
    <DisbursementPageContent
      items={serializedItems}
      stats={{
        totalAmount,
        paidAmount,
        unpaidAmount: totalAmount - paidAmount,
        unpaidCount,
      }}
      assignees={assignees}
      isManager={isManager}
      currentUserId={userId}
      filterDefaults={{
        assigneeId: params.assigneeId,
        year,
        month,
        unpaidOnly: params.isPaid === "false",
      }}
    />
  );
}
