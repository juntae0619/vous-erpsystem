import { ok, fail, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateSchema = z.object({
  taxInvoiceStatus: z.enum(["NOT_ISSUED", "ISSUED", "REVISED"]).optional(),
  taxInvoiceNumber: z.string().optional().nullable(),
  taxInvoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: z.string().optional(),
});

// PUT /api/billing/[id] — 청구 정보 수정 (세금계산서 상태 등)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireManager();
  if (error) return error;

  const { id } = await params;
  const billing = await prisma.billing.findUnique({ where: { id } });
  if (!billing) return fail("존재하지 않는 청구입니다", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  const data = parsed.data;

  const updated = await prisma.billing.update({
    where: { id },
    data: {
      ...(data.taxInvoiceStatus && { taxInvoiceStatus: data.taxInvoiceStatus }),
      ...(data.taxInvoiceNumber !== undefined && { taxInvoiceNumber: data.taxInvoiceNumber }),
      ...(data.taxInvoiceDate !== undefined && {
        taxInvoiceDate: data.taxInvoiceDate ? new Date(data.taxInvoiceDate) : null,
      }),
      ...(data.note !== undefined && { note: data.note }),
    },
  });

  return ok(updated);
}
