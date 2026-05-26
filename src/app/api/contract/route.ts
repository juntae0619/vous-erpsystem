import { ok, fail, requireAuth, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

// GET /api/contract?status=&page=&limit=
export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { localGovName: { contains: search, mode: "insensitive" } },
      { contractName: { contains: search, mode: "insensitive" } },
      { contractNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, contracts] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        _count: { select: { billings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ contracts, total, page, limit });
}

const createSchema = z.object({
  localGovName: z.string().min(1, "지자체명을 입력해주세요"),
  contractNumber: z.string().min(1, "계약번호를 입력해주세요"),
  contractName: z.string().min(1, "계약명을 입력해주세요"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceAmount: z.number().min(0),
  billingCycle: z.enum(["QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]),
  assigneeId: z.string().min(1),
  hasMerchantFee: z.boolean().default(false),
  merchantFeeType: z.enum(["RATE", "FIXED"]).optional(),
  merchantFeeRate: z.number().optional(),
  merchantFeeAmount: z.number().optional(),
  merchantFeeCycle: z.enum(["QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]).optional(),
  note: z.string().optional(),
});

// POST /api/contract — 계약 등록 (매니저+)
export async function POST(req: Request) {
  const { session, error } = await requireManager();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }
  const data = parsed.data;

  // 계약번호 중복 확인
  const existing = await prisma.contract.findUnique({
    where: { contractNumber: data.contractNumber },
  });
  if (existing) return fail("이미 존재하는 계약번호입니다", 409);

  const contract = await prisma.contract.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      merchantFeeType: data.hasMerchantFee ? data.merchantFeeType ?? null : null,
      merchantFeeRate: data.hasMerchantFee && data.merchantFeeRate ? data.merchantFeeRate : null,
      merchantFeeAmount: data.hasMerchantFee && data.merchantFeeAmount ? data.merchantFeeAmount : null,
      merchantFeeCycle: data.hasMerchantFee ? data.merchantFeeCycle ?? null : null,
    },
  });

  await writeAuditLog({
    userId: session!.user.id,
    action: "CONTRACT_CREATED",
    resource: "Contract",
    resourceId: contract.id,
    details: { contractName: data.contractName, contractNumber: data.contractNumber },
  });

  return ok(contract, 201);
}
