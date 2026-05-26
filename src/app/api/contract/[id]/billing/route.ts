import { ok, fail, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const createSchema = z.object({
  billingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceAmount: z.number().min(0),
  merchantFeeAmt: z.number().min(0).default(0),
  note: z.string().optional(),
});

// POST /api/contract/[id]/billing — 청구 생성
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireManager();
  if (error) return error;

  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return fail("존재하지 않는 계약입니다", 404);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  const data = parsed.data;

  const totalAmount = data.serviceAmount + data.merchantFeeAmt;

  const billing = await prisma.billing.create({
    data: {
      contractId: id,
      billingDate: new Date(data.billingDate),
      dueDate: new Date(data.dueDate),
      serviceAmount: data.serviceAmount,
      merchantFeeAmt: data.merchantFeeAmt,
      totalAmount,
      note: data.note ?? null,
    },
  });

  return ok(billing, 201);
}
