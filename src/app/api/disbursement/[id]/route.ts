import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  canAccessDisbursement,
  disbursementForbidden,
  isManagerRole,
  resolvePaidFields,
  toDateOnly,
} from "@/lib/disbursement-access";
import {
  serializeDisbursement,
  updateDisbursementSchema,
} from "@/lib/disbursement-types";

type RouteParams = { params: Promise<{ id: string }> };

async function getDisbursementOrFail(id: string) {
  const item = await prisma.disbursement.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, team: true, position: true } },
    },
  });
  if (!item) return { item: null, error: fail("존재하지 않는 지급 내역입니다", 404) };
  return { item, error: null };
}

// GET /api/disbursement/[id]
export async function GET(_req: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { item, error: notFound } = await getDisbursementOrFail(id);
  if (notFound) return notFound;

  if (!canAccessDisbursement(session!, item!.assigneeId)) {
    return disbursementForbidden();
  }

  return ok(serializeDisbursement(item!));
}

// PUT /api/disbursement/[id]
export async function PUT(req: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { item, error: notFound } = await getDisbursementOrFail(id);
  if (notFound) return notFound;

  if (!canAccessDisbursement(session!, item!.assigneeId)) {
    return disbursementForbidden();
  }

  const body = await req.json();
  const parsed = updateDisbursementSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }

  const data = parsed.data;

  if (
    data.assigneeId &&
    !isManagerRole(session!.user.role) &&
    data.assigneeId !== session!.user.id
  ) {
    return disbursementForbidden();
  }

  if (data.assigneeId && isManagerRole(session!.user.role)) {
    const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
    if (!assignee) return fail("담당자를 찾을 수 없습니다", 404);
  }

  const paidFields = resolvePaidFields(data.isPaid, data.paidDate);

  const updated = await prisma.disbursement.update({
    where: { id },
    data: {
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(data.vendorName !== undefined && { vendorName: data.vendorName }),
      ...(data.itemType !== undefined && { itemType: data.itemType }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.scheduledDate !== undefined && {
        scheduledDate: new Date(data.scheduledDate),
      }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.taxInvoiceStatus !== undefined && {
        taxInvoiceStatus: data.taxInvoiceStatus,
      }),
      ...(data.taxInvoiceNumber !== undefined && {
        taxInvoiceNumber: data.taxInvoiceNumber,
      }),
      ...(data.taxInvoiceDate !== undefined && {
        taxInvoiceDate: toDateOnly(data.taxInvoiceDate),
      }),
      ...paidFields,
    },
    include: {
      assignee: { select: { id: true, name: true, team: true, position: true } },
    },
  });

  return ok(serializeDisbursement(updated));
}

// DELETE /api/disbursement/[id] — 미지급 건만
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { item, error: notFound } = await getDisbursementOrFail(id);
  if (notFound) return notFound;

  if (!canAccessDisbursement(session!, item!.assigneeId)) {
    return disbursementForbidden();
  }

  if (item!.isPaid) {
    return fail("지급 완료된 내역은 삭제할 수 없습니다", 409);
  }

  await prisma.disbursement.delete({ where: { id } });
  return ok({ message: "삭제되었습니다" });
}
