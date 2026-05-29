import { ok, fail, requireAuth, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { billingCycleSchema, merchantSettlementCycleSchema } from "@/lib/billing-cycle";
import { z } from "zod/v4";

// GET /api/contract/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, position: true } },
      billings: {
        include: {
          payments: true,
          _count: { select: { payments: true } },
        },
        orderBy: { billingDate: "desc" },
      },
    },
  });
  if (!contract) return fail("존재하지 않는 계약입니다", 404);
  return ok(contract);
}

const updateSchema = z.object({
  localGovName: z.string().min(1).optional(),
  deptContact: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contractName: z.string().min(1).optional(),
  contractMethod: z.string().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  commencementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  serviceAmount: z.number().min(0).optional(),
  billingMethod: z.string().optional().nullable(),
  requiredDocs: z.string().optional().nullable(),
  billingCycle: billingCycleSchema.optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["ACTIVE", "ENDED", "RENEWAL_PENDING"]).optional(),
  hasMerchantFee: z.boolean().optional(),
  merchantFeeType: z.enum(["RATE", "FIXED"]).optional().nullable(),
  merchantFeeRate: z.number().optional().nullable(),
  merchantFeeAmount: z.number().optional().nullable(),
  merchantFeeCycle: merchantSettlementCycleSchema.optional().nullable(),
  note: z.string().optional(),
});

// PUT /api/contract/[id] — 계약 수정 (매니저+)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireManager();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  const data = parsed.data;

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return fail("존재하지 않는 계약입니다", 404);

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      ...(data.localGovName && { localGovName: data.localGovName }),
      ...(data.deptContact !== undefined && { deptContact: data.deptContact }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
      ...(data.contractName && { contractName: data.contractName }),
      ...(data.contractMethod !== undefined && { contractMethod: data.contractMethod }),
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.commencementDate !== undefined && {
        commencementDate: data.commencementDate ? new Date(data.commencementDate) : null,
      }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
      ...(data.serviceAmount !== undefined && { serviceAmount: data.serviceAmount }),
      ...(data.billingMethod !== undefined && { billingMethod: data.billingMethod }),
      ...(data.requiredDocs !== undefined && { requiredDocs: data.requiredDocs }),
      ...(data.billingCycle && { billingCycle: data.billingCycle }),
      ...(data.assigneeId && { assigneeId: data.assigneeId }),
      ...(data.status && { status: data.status }),
      ...(data.hasMerchantFee !== undefined && { hasMerchantFee: data.hasMerchantFee }),
      ...(data.merchantFeeType !== undefined && { merchantFeeType: data.merchantFeeType }),
      ...(data.merchantFeeRate !== undefined && { merchantFeeRate: data.merchantFeeRate }),
      ...(data.merchantFeeAmount !== undefined && { merchantFeeAmount: data.merchantFeeAmount }),
      ...(data.merchantFeeCycle !== undefined && { merchantFeeCycle: data.merchantFeeCycle }),
      ...(data.note !== undefined && { note: data.note }),
    },
  });

  return ok(updated);
}
