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

const BILLING_CYCLE_OPTIONS = [
  { value: "QUARTERLY",   label: "분기 (3개월)" },
  { value: "SEMI_ANNUAL", label: "반기 (6개월)" },
  { value: "ANNUAL",      label: "연간 (12개월)" },
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
  contractId?: string; // 수정 모드
}

const schema = z.object({
  localGovName: z.string().min(1, "지자체명을 입력해주세요"),
  contractNumber: z.string().min(1, "계약번호를 입력해주세요"),
  contractName: z.string().min(1, "계약명을 입력해주세요"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  serviceAmount: z.string().min(1, "서비스 금액을 입력해주세요"),
  billingCycle: z.enum(["QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]),
  assigneeId: z.string().min(1, "담당자를 선택해주세요"),
  hasMerchantFee: z.boolean().default(false),
  merchantFeeType: z.enum(["RATE", "FIXED"]).optional(),
  merchantFeeRate: z.string().optional(),
  merchantFeeAmount: z.string().optional(),
  merchantFeeCycle: z.enum(["QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]).optional(),
  note: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const LABEL_CLS = "text-[13px] font-medium text-[#292d34]";
const INPUT_CLS = "h-9 text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]";

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
    <form onSubmit={(handleSubmit as any)(onSubmit)} className="max-w-2xl mx-auto space-y-5">
      <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl space-y-4">
        <h3 className="text-[15px] font-semibold text-[#090c1d]" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
          계약 기본 정보
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>지자체명</Label>
            <Input className={INPUT_CLS} {...register("localGovName")} placeholder="예) 서울시 종로구" />
            {errors.localGovName && <p className="text-[12px] text-destructive">{errors.localGovName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>계약번호</Label>
            <Input className={INPUT_CLS} {...register("contractNumber")} placeholder="예) 2024-001" />
            {errors.contractNumber && <p className="text-[12px] text-destructive">{errors.contractNumber.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>계약명</Label>
          <Input className={INPUT_CLS} {...register("contractName")} placeholder="계약명 입력" />
          {errors.contractName && <p className="text-[12px] text-destructive">{errors.contractName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>계약 시작일</Label>
            <Input className={INPUT_CLS} type="date" {...register("startDate")} />
            {errors.startDate && <p className="text-[12px] text-destructive">{errors.startDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>계약 종료일</Label>
            <Input className={INPUT_CLS} type="date" {...register("endDate")} />
            {errors.endDate && <p className="text-[12px] text-destructive">{errors.endDate.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>서비스 금액 (원)</Label>
            <Input className={INPUT_CLS} type="number" {...register("serviceAmount")} placeholder="0" />
            {errors.serviceAmount && <p className="text-[12px] text-destructive">{errors.serviceAmount.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>청구 주기</Label>
            <Select value={watch("billingCycle")} onValueChange={(v) => setValue("billingCycle", v as FormData["billingCycle"])}>
              <SelectTrigger className={INPUT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-[#e8e8e8]">
                {BILLING_CYCLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>담당자</Label>
          <Select value={watch("assigneeId") ?? ""} onValueChange={(v) => setValue("assigneeId", v ?? "")}>
            <SelectTrigger className={INPUT_CLS}><SelectValue placeholder="담당자 선택" /></SelectTrigger>
            <SelectContent className="rounded-xl border-[#e8e8e8]">
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-[13px]">
                  {a.name}{a.position ? ` (${a.position})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.assigneeId && <p className="text-[12px] text-destructive">{errors.assigneeId.message}</p>}
        </div>
      </Card>

      {/* 가맹점 수수료 */}
      <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasMerchantFee"
            className="w-4 h-4 accent-[#7b68ee]"
            {...register("hasMerchantFee")}
          />
          <label htmlFor="hasMerchantFee" className="text-[13px] font-semibold text-[#090c1d] cursor-pointer"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
            가맹점 수수료 있음
          </label>
        </div>

        {hasMerchantFee && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={LABEL_CLS}>수수료 유형</Label>
                <Select value={merchantFeeType ?? "RATE"} onValueChange={(v) => setValue("merchantFeeType", v as "RATE" | "FIXED")}>
                  <SelectTrigger className={INPUT_CLS}><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-[#e8e8e8]">
                    {FEE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL_CLS}>
                  {merchantFeeType === "FIXED" ? "수수료 금액 (원)" : "수수료율 (%)"}
                </Label>
                {merchantFeeType === "FIXED" ? (
                  <Input className={INPUT_CLS} type="number" {...register("merchantFeeAmount")} placeholder="0" />
                ) : (
                  <Input className={INPUT_CLS} type="number" step="0.01" {...register("merchantFeeRate")} placeholder="0.00" />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={LABEL_CLS}>수수료 청구 주기</Label>
              <Select onValueChange={(v) => setValue("merchantFeeCycle", v as FormData["merchantFeeCycle"])}>
                <SelectTrigger className={INPUT_CLS}><SelectValue placeholder="주기 선택" /></SelectTrigger>
                <SelectContent className="rounded-xl border-[#e8e8e8]">
                  {BILLING_CYCLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>

      {/* 비고 */}
      <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>비고</Label>
          <Textarea
            {...register("note")}
            placeholder="계약 관련 메모"
            className="text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee] resize-none min-h-[80px]"
          />
        </div>
      </Card>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-9 bg-[#202023] hover:bg-[#292d34] text-white text-[13px] rounded-lg"
      >
        {isSubmitting ? "저장 중..." : isEdit ? "수정 완료" : "계약 등록"}
      </Button>
    </form>
  );
}
