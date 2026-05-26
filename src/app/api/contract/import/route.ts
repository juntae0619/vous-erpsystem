import { ok, fail, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  BILLING_CYCLE_IMPORT_LABELS,
  BILLING_CYCLE_IMPORT_MAP,
  MERCHANT_SETTLEMENT_IMPORT_LABELS,
  MERCHANT_SETTLEMENT_IMPORT_MAP,
  billingCycleSchema,
  merchantSettlementCycleSchema,
} from "@/lib/billing-cycle";
import { z } from "zod/v4";

/* ── 수수료유형 매핑 ─────────────────────────────────────── */
const FEE_TYPE_MAP: Record<string, string> = {
  수수료율: "RATE",
  정액: "FIXED",
};

/* ── 행 스키마 ────────────────────────────────────────────── */
const rowSchema = z.object({
  localGovName: z.string().min(1, "지자체명 필수"),
  contractNumber: z.string().min(1, "계약번호 필수"),
  contractName: z.string().min(1, "계약명 필수"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "계약시작일: YYYY-MM-DD 형식"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "계약종료일: YYYY-MM-DD 형식"),
  serviceAmount: z.number({ error: "서비스금액 숫자 필수" }).min(0),
  billingCycle: billingCycleSchema,
  assigneeId: z.string().min(1, "담당자를 찾을 수 없음"),
  hasMerchantFee: z.boolean(),
  merchantFeeType: z.enum(["RATE", "FIXED"]).optional(),
  merchantFeeRate: z.number().optional(),
  merchantFeeAmount: z.number().optional(),
  merchantFeeCycle: merchantSettlementCycleSchema.optional(),
  note: z.string().optional(),
});

/* ── 요청 바디 스키마 ─────────────────────────────────────── */
const bodySchema = z.object({
  rows: z.array(
    z.object({
      지자체명: z.string().optional(),
      계약번호: z.string().optional(),
      계약명: z.string().optional(),
      계약시작일: z.string().optional(),
      계약종료일: z.string().optional(),
      "서비스금액(원)": z.union([z.string(), z.number()]).optional(),
      청구주기: z.string().optional(),
      담당자명: z.string().optional(),
      가맹점수수료: z.string().optional(),
      수수료유형: z.string().optional(),
      "수수료율(%)": z.union([z.string(), z.number()]).optional(),
      "수수료금액(원)": z.union([z.string(), z.number()]).optional(),
      가맹점정산주기: z.string().optional(),
      수수료청구주기: z.string().optional(),
      비고: z.string().optional(),
    })
  ),
  dryRun: z.boolean().default(false),
});

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function toNum(v: unknown): number | undefined {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? undefined : n;
}
function excelDateToISO(v: unknown): string {
  const s = toStr(v);
  // 이미 YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, "-");
  // Excel serial number (숫자로 파싱된 경우)
  const n = parseFloat(s);
  if (!isNaN(n) && n > 40000) {
    const d = new Date(Math.round((n - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return s;
}

// POST /api/contract/import
export async function POST(req: Request) {
  const { session, error } = await requireManager();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return fail("요청 본문이 없습니다", 400);

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  }
  const { rows, dryRun } = parsed.data;
  if (rows.length === 0) return fail("데이터가 없습니다", 400);
  if (rows.length > 200) return fail("한 번에 최대 200건까지 등록할 수 있습니다", 400);

  /* ── 담당자 이름 → ID 조회 ──────────────────────────────── */
  const assigneeNames = [...new Set(rows.map((r) => toStr(r["담당자명"])).filter(Boolean))];
  const users = await prisma.user.findMany({
    where: { name: { in: assigneeNames }, isActive: true },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.name, u.id]));

  /* ── 기존 계약번호 일괄 조회 (중복 검사) ────────────────── */
  const contractNumbers = rows.map((r) => toStr(r["계약번호"])).filter(Boolean);
  const existingContracts = await prisma.contract.findMany({
    where: { contractNumber: { in: contractNumbers } },
    select: { contractNumber: true },
  });
  const existingSet = new Set(existingContracts.map((c) => c.contractNumber));

  /* ── 행별 검증 ────────────────────────────────────────────── */
  type RowResult = {
    rowIndex: number;
    valid: boolean;
    errors: string[];
    data?: z.infer<typeof rowSchema>;
    contractNumber: string;
  };

  const results: RowResult[] = rows.map((raw, idx) => {
    const errors: string[] = [];

    const contractNumber = toStr(raw["계약번호"]);
    if (existingSet.has(contractNumber)) {
      errors.push("이미 존재하는 계약번호");
    }

    const assigneeName = toStr(raw["담당자명"]);
    const assigneeId = userMap.get(assigneeName) ?? "";
    if (!assigneeId) errors.push(`담당자 '${assigneeName}'을 찾을 수 없음`);

    const cycleKey = toStr(raw["청구주기"]);
    const billingCycle = BILLING_CYCLE_IMPORT_MAP[cycleKey];
    if (!billingCycle) {
      errors.push(`청구주기: ${BILLING_CYCLE_IMPORT_LABELS}`);
    }

    const hasMerchantFee = toStr(raw["가맹점수수료"]).toUpperCase() === "Y";
    const feeTypeKey = toStr(raw["수수료유형"]);
    const merchantFeeType = FEE_TYPE_MAP[feeTypeKey];

    const merchantCycleKey =
      toStr(raw["가맹점정산주기"]) || toStr(raw["수수료청구주기"]);
    const merchantFeeCycle = hasMerchantFee
      ? MERCHANT_SETTLEMENT_IMPORT_MAP[merchantCycleKey]
      : undefined;
    if (hasMerchantFee && merchantCycleKey && !merchantFeeCycle) {
      errors.push(`가맹점정산주기: ${MERCHANT_SETTLEMENT_IMPORT_LABELS}`);
    }

    const candidate = {
      localGovName: toStr(raw["지자체명"]),
      contractNumber,
      contractName: toStr(raw["계약명"]),
      startDate: excelDateToISO(raw["계약시작일"]),
      endDate: excelDateToISO(raw["계약종료일"]),
      serviceAmount: toNum(raw["서비스금액(원)"]) ?? -1,
      billingCycle,
      assigneeId,
      hasMerchantFee,
      merchantFeeType: hasMerchantFee && merchantFeeType ? merchantFeeType as "RATE" | "FIXED" : undefined,
      merchantFeeRate: hasMerchantFee ? toNum(raw["수수료율(%)"]) : undefined,
      merchantFeeAmount: hasMerchantFee ? toNum(raw["수수료금액(원)"]) : undefined,
      merchantFeeCycle,
      note: toStr(raw["비고"]) || undefined,
    };

    const validation = rowSchema.safeParse(candidate);
    if (!validation.success) {
      validation.error.issues.forEach((i) => errors.push(i.message));
    }

    return {
      rowIndex: idx + 2, // 1=헤더, 2~=데이터
      valid: errors.length === 0,
      errors,
      data: validation.success ? validation.data : undefined,
      contractNumber,
    };
  });

  /* ── dryRun: 검증 결과만 반환 ────────────────────────────── */
  if (dryRun) {
    return ok({
      total: rows.length,
      validCount: results.filter((r) => r.valid).length,
      invalidCount: results.filter((r) => !r.valid).length,
      results: results.map(({ rowIndex, valid, errors, contractNumber }) => ({
        rowIndex, valid, errors, contractNumber,
      })),
    });
  }

  /* ── 실제 저장 ───────────────────────────────────────────── */
  const validRows = results.filter((r) => r.valid && r.data);
  if (validRows.length === 0) {
    return fail("유효한 행이 없습니다", 400);
  }

  const created: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      const d = row.data!;
      const c = await tx.contract.create({
        data: {
          localGovName: d.localGovName,
          contractNumber: d.contractNumber,
          contractName: d.contractName,
          startDate: new Date(d.startDate),
          endDate: new Date(d.endDate),
          serviceAmount: d.serviceAmount,
          billingCycle: d.billingCycle,
          assigneeId: d.assigneeId,
          hasMerchantFee: d.hasMerchantFee,
          merchantFeeType: d.merchantFeeType ?? null,
          merchantFeeRate: d.merchantFeeRate ?? null,
          merchantFeeAmount: d.merchantFeeAmount ?? null,
          merchantFeeCycle: d.merchantFeeCycle ?? null,
          note: d.note ?? null,
        },
      });
      created.push(c.id);
    }
  });

  // 감사 로그
  await writeAuditLog({
    userId: session!.user.id,
    action: "CONTRACT_BULK_IMPORT",
    resource: "Contract",
    details: { count: created.length },
  });

  return ok({
    created: created.length,
    skipped: results.filter((r) => !r.valid).length,
    errors: results
      .filter((r) => !r.valid)
      .map(({ rowIndex, errors, contractNumber }) => ({ rowIndex, errors, contractNumber })),
  });
}
