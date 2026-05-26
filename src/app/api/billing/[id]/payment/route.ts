import { ok, fail, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const paymentSchema = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(1, "금액을 입력해주세요"),
  note: z.string().optional(),
});

// POST /api/billing/[id]/payment — 입금 내역 등록
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireManager();
  if (error) return error;

  const { id } = await params;
  const billing = await prisma.billing.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!billing) return fail("존재하지 않는 청구입니다", 404);

  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  const data = parsed.data;

  // 기존 입금액 + 새 입금액
  const alreadyPaid = billing.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const newPaidTotal = alreadyPaid + data.amount;
  const totalAmount = Number(billing.totalAmount);

  let paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  if (newPaidTotal >= totalAmount) paymentStatus = "PAID";
  else if (newPaidTotal > 0) paymentStatus = "PARTIAL";
  else paymentStatus = "UNPAID";

  const payment = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        billingId: id,
        paidAt: new Date(data.paidAt),
        amount: data.amount,
        note: data.note ?? null,
      },
    });

    await tx.billing.update({
      where: { id },
      data: {
        paidAmount: newPaidTotal,
        paymentStatus,
      },
    });

    return payment;
  });

  return ok(payment, 201);
}
