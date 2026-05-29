"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BILLING_CYCLE_OPTIONS,
  MERCHANT_SETTLEMENT_CYCLE_OPTIONS,
  billingCycleSchema,
  merchantSettlementCycleSchema,
  type BillingCycleValue,
  type MerchantSettlementCycleValue,
} from "@/lib/billing-cycle";

const REQUIRED_DOCS = [
  "선금신청서 외",
  "보증보험",
  "전자계산서",
  "사업자등록증",
  "통장사본",
  "완납증명서",
];

const CONTRACT_METHOD_OPTIONS = [
  { value: "수의계약", label: "수의계약" },
  { value: "일반경쟁", label: "일반경쟁" },
  { value: "제한경쟁", label: "제한경쟁" },
  { value: "지명경쟁", label: "지명경쟁" },
] as const;

const BILLING_METHOD_OPTIONS = [
  { value: "정률", label: "정률" },
  { value: "정액", label: "정액" },
] as const;

const FEE_TYPE_OPTIONS = [
  { value: "RATE",  label: "수수료율 (%)" },
  { value: "FIXED", label: "정액" },
] as const;

interface Assignee {
  id: string;
  name: string;
  position: string | null;
}

interface Props {
  assignees: Assignee[];
  defaultValues?: Partial<FormData>;
  contractId?: string;
}

const schema = z.object({
  localGovName: z.string().min(1, "기관명을 입력해주세요"),
  contractNumber: z.string().min(1, "계약번호를 입력해주세요"),
  deptContact: z.string().optional(),
  contactPhone: z.string().optional(),
  contractName: z.string().min(1, "계약명을 입력해주세요"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  contractMethod: z.string().optional(),
  commencementDate: z.string().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  serviceAmount: z.string().min(1, "계약금액을 입력해주세요"),
  billingMethod: z.string().optional(),
  billingCycle: billingCycleSchema,
  assigneeId: z.string().min(1, "담당자를 선택해주세요"),
  hasMerchantFee: z.boolean().default(false),
  merchantFeeType: z.enum(["RATE", "FIXED"]).optional(),
  merchantFeeRate: z.string().optional(),
  merchantFeeAmount: z.string().optional(),
  merchantFeeCycle: merchantSettlementCycleSchema.optional(),
  note: z.string().optional(),
});
type FormData = z.infer<typeof schema>;
export type ContractFormData = FormData;

export function ContractForm({ assignees, defaultValues, contractId }: Props) {
  const router = useRouter();
  const isEdit = !!contractId;
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: standardSchemaResolver(schema) as any,
    defaultValues: { billingCycle: "QUARTERLY", ...defaultValues },
  });

  const [checkedDocs, setCheckedDocs] = useState<string[]>(() => {
    try {
      const raw = (defaultValues as Record<string, unknown>)?.requiredDocs as string | undefined;
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  function toggleDoc(doc: string) {
    setCheckedDocs((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]
    );
  }

  const hasMerchantFee = watch("hasMerchantFee");
  const merchantFeeType = watch("merchantFeeType");

  const onSubmit = async (data: FormData) => {
    const url = isEdit ? `/api/contract/${contractId}` : "/api/contract";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        serviceAmount: parseFloat(data.serviceAmount),
        merchantFeeRate: data.merchantFeeRate ? parseFloat(data.merchantFeeRate) : undefined,
        merchantFeeAmount: data.merchantFeeAmount ? parseFloat(data.merchantFeeAmount) : undefined,
        requiredDocs: JSON.stringify(checkedDocs),
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "저장에 실패했습니다"); return; }
    toast.success(isEdit ? "계약이 수정되었습니다" : "계약이 등록되었습니다");
    router.push(isEdit ? `/contract/${contractId}` : "/contract");
    router.refresh();
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={(handleSubmit as any)(onSubmit)} className="section-stack mx-auto max-w-2xl">
      <Card className="gap-4">
        <h3 className="font-heading text-section-title">계약 기본 정보</h3>

        {/* 기관명 + 계약번호 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <Label>기관명</Label>
            <Input {...register("localGovName")} placeholder="예) 경상남도 거창군청" />
            {errors.localGovName && <p className="text-caption text-destructive">{errors.localGovName.message}</p>}
          </div>
          <div className="form-field">
            <Label>계약번호</Label>
            <Input {...register("contractNumber")} placeholder="예) 2024-001" />
            {errors.contractNumber && <p className="text-caption text-destructive">{errors.contractNumber.message}</p>}
          </div>
        </div>

        {/* 담당부서(담당자) + 연락처 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <Label>담당부서(담당자)</Label>
            <Input {...register("deptContact")} placeholder="예) 재무과 홍길동" />
          </div>
          <div className="form-field">
            <Label>연락처</Label>
            <Input {...register("contactPhone")} placeholder="예) 055-000-0000" />
          </div>
        </div>

        {/* 계약명 */}
        <div className="form-field">
          <Label>계약명</Label>
          <Input {...register("contractName")} placeholder="계약명 입력" />
          {errors.contractName && <p className="text-caption text-destructive">{errors.contractName.message}</p>}
        </div>

        {/* 계약일 + 계약방법 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <Label>계약일</Label>
            <Input type="date" {...register("startDate")} />
            {errors.startDate && <p className="text-caption text-destructive">{errors.startDate.message}</p>}
          </div>
          <div className="form-field">
            <Label>계약방법</Label>
            <Select value={watch("contractMethod") ?? ""} onValueChange={(v) => setValue("contractMethod", v || undefined)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {CONTRACT_METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-body-sm">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 착수일 + 완수일 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <Label>착수일</Label>
            <Input type="date" {...register("commencementDate")} />
          </div>
          <div className="form-field">
            <Label>완수일</Label>
            <Input type="date" {...register("endDate")} />
            {errors.endDate && <p className="text-caption text-destructive">{errors.endDate.message}</p>}
          </div>
        </div>

        {/* 계약금액 */}
        <div className="form-field">
          <Label>계약금액 (원)</Label>
          <Input type="number" {...register("serviceAmount")} placeholder="0" />
          {errors.serviceAmount && <p className="text-caption text-destructive">{errors.serviceAmount.message}</p>}
        </div>

        {/* 청구방법 + 청구주기 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <Label>청구방법</Label>
            <Select value={watch("billingMethod") ?? ""} onValueChange={(v) => setValue("billingMethod", v || undefined)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {BILLING_METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-body-sm">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <Label>청구주기</Label>
            <Select value={watch("billingCycle")} onValueChange={(v) => setValue("billingCycle", v as BillingCycleValue)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {BILLING_CYCLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-body-sm">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 담당자 (내부 직원) */}
        <div className="form-field">
          <Label>담당자 (내부)</Label>
          <Select value={watch("assigneeId") ?? ""} onValueChange={(v) => setValue("assigneeId", v ?? "")}>
            <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
            <SelectContent className="rounded-xl border-border">
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-body-sm">
                  {a.name}{a.position ? ` (${a.position})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.assigneeId && <p className="text-caption text-destructive">{errors.assigneeId.message}</p>}
        </div>
      </Card>

      {/* 가맹점 수수료 */}
      <Card className="gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasMerchantFee"
            className="h-4 w-4 accent-deep-violet"
            {...register("hasMerchantFee")}
          />
          <label htmlFor="hasMerchantFee" className="cursor-pointer font-heading text-body-sm font-semibold text-deep-space-charcoal">
            가맹점 수수료 있음
          </label>
        </div>

        {hasMerchantFee && (
          <div className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field">
                <Label>수수료 유형</Label>
                <Select value={merchantFeeType ?? "RATE"} onValueChange={(v) => setValue("merchantFeeType", v as "RATE" | "FIXED")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
                    {FEE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-body-sm">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-field">
                <Label>
                  {merchantFeeType === "FIXED" ? "수수료 금액 (원)" : "수수료율 (%)"}
                </Label>
                {merchantFeeType === "FIXED" ? (
                  <Input type="number" {...register("merchantFeeAmount")} placeholder="0" />
                ) : (
                  <Input type="number" step="0.01" {...register("merchantFeeRate")} placeholder="0.00" />
                )}
              </div>
            </div>
            <div className="form-field">
              <Label>가맹점 정산 주기</Label>
              <Select onValueChange={(v) => setValue("merchantFeeCycle", v as MerchantSettlementCycleValue)}>
                <SelectTrigger><SelectValue placeholder="주기 선택" /></SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {MERCHANT_SETTLEMENT_CYCLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-body-sm">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>

      {/* 청구 시 필요서류 */}
      <Card className="gap-4">
        <h3 className="font-heading text-section-title">청구 시 필요서류</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REQUIRED_DOCS.map((item) => (
            <label key={item} className="flex items-center gap-2 cursor-pointer text-body-sm text-midnight-charcoal">
              <input
                type="checkbox"
                className="h-4 w-4 accent-deep-violet"
                checked={checkedDocs.includes(item)}
                onChange={() => toggleDoc(item)}
              />
              {item}
            </label>
          ))}
        </div>
      </Card>

      {/* 비고 */}
      <Card>
        <div className="form-field">
          <Label>비고</Label>
          <Textarea
            {...register("note")}
            placeholder="계약 관련 메모"
            className="min-h-[80px] resize-none rounded-[var(--radius-buttons)] border-border text-body-sm focus-visible:ring-ring"
          />
        </div>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "저장 중..." : isEdit ? "수정 완료" : "계약 등록"}
      </Button>
    </form>
  );
}
