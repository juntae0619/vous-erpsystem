import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  canAccessDisbursement,
  disbursementForbidden,
  isManagerRole,
  parseYearMonth,
  resolvePaidFields,
  toDateOnly,
} from "@/lib/disbursement-access";
import {
  createDisbursementSchema,
  serializeDisbursement,
} from "@/lib/disbursement-types";
import { Prisma } from "@/generated/prisma/client";

// GET /api/disbursement?assigneeId=&isPaid=&year=&month=&vendorName=
export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const assigneeId = searchParams.get("assigneeId") ?? undefined;
  const isPaidParam = searchParams.get("isPaid");
  const vendorName = searchParams.get("vendorName") ?? undefined;
  const yearMonth = parseYearMonth(searchParams);

  const where: Prisma.DisbursementWhereInput = {};

  if (isManagerRole(session!.user.role)) {
    if (assigneeId) where.assigneeId = assigneeId;
  } else {
    where.assigneeId = session!.user.id;
  }

  if (isPaidParam === "true") where.isPaid = true;
  if (isPaidParam === "false") where.isPaid = false;

  if (vendorName) {
    where.vendorName = { contains: vendorName, mode: "insensitive" };
  }

  if (yearMonth) {
    where.scheduledDate = {
      gte: yearMonth.start,
      lte: yearMonth.end,
    };
  }

  const items = await prisma.disbursement.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, team: true, position: true } },
    },
    orderBy: [{ isPaid: "asc" }, { scheduledDate: "asc" }],
  });

  const serialized = items.map(serializeDisbursement);

  const statsWhere = { ...where };
  const [scheduledSum, paidSum, unpaidCount] = await Promise.all([
    prisma.disbursement.aggregate({
      where: statsWhere,
      _sum: { amount: true },
    }),
    prisma.disbursement.aggregate({
      where: { ...statsWhere, isPaid: true },
      _sum: { amount: true },
    }),
    prisma.disbursement.count({
      where: { ...statsWhere, isPaid: false },
    }),
  ]);

  return ok({
    items: serialized,
    stats: {
      totalAmount: Number(scheduledSum._sum.amount ?? 0),
      paidAmount: Number(paidSum._sum.amount ?? 0),
      unpaidAmount:
        Number(scheduledSum._sum.amount ?? 0) - Number(paidSum._sum.amount ?? 0),
      unpaidCount,
    },
  });
}

// POST /api/disbursement
export async function POST(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = createDisbursementSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }

  const data = parsed.data;
  const assigneeId = isManagerRole(session!.user.role)
    ? data.assigneeId
    : session!.user.id;

  if (!canAccessDisbursement(session!, assigneeId)) {
    return disbursementForbidden();
  }

  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee) return fail("담당자를 찾을 수 없습니다", 404);

  const paidFields = resolvePaidFields(data.isPaid, data.paidDate);

  const created = await prisma.disbursement.create({
    data: {
      assigneeId,
      vendorName: data.vendorName,
      itemType: data.itemType,
      description: data.description,
      amount: data.amount,
      scheduledDate: new Date(data.scheduledDate),
      note: data.note,
      taxInvoiceStatus: data.taxInvoiceStatus ?? "NOT_ISSUED",
      taxInvoiceNumber: data.taxInvoiceNumber ?? null,
      taxInvoiceDate: toDateOnly(data.taxInvoiceDate),
      ...paidFields,
    },
    include: {
      assignee: { select: { id: true, name: true, team: true, position: true } },
    },
  });

  return ok(serializeDisbursement(created), 201);
}
