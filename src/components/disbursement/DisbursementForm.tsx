"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DISBURSEMENT_TYPE_OPTIONS,
  disbursementTypeSchema,
  taxInvoiceStatusSchema,
  type DisbursementTypeValue,
  type TaxInvoiceStatusValue,
} from "@/lib/disbursement-types";

interface Assignee {
  id: string;
  name: string;
  position: string | null;
}

export interface DisbursementFormValues {
  id?: string;
  assigneeId: string;
  vendorName: string;
  itemType: DisbursementTypeValue;
  description: string;
  amount: string;
  scheduledDate: string;
  note?: string;
  taxInvoiceStatus: TaxInvoiceStatusValue;
  taxInvoiceNumber?: string;
  taxInvoiceDate?: string;
  isPaid: boolean;
  paidDate?: string;
}

interface Props {
  assignees: Assignee[];
  isManager: boolean;
  currentUserId: string;
  defaultValues?: Partial<DisbursementFormValues>;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const TAX_INVOICE_OPTIONS = [
  { value: "NOT_ISSUED", label: "미발행" },
  { value: "ISSUED", label: "발행완료" },
  { value: "REVISED", label: "수정발행" },
] as const;

const schema = z.object({
  assigneeId: z.string().min(1, "담당자를 선택해주세요"),
  vendorName: z.string().min(1, "거래처명을 입력해주세요"),
  itemType: disbursementTypeSchema,
  description: z.string().min(1, "내용을 입력해주세요"),
  amount: z.string().min(1, "금액을 입력해주세요"),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
  taxInvoiceStatus: taxInvoiceStatusSchema,
  taxInvoiceNumber: z.string().optional(),
  taxInvoiceDate: z.string().optional(),
  isPaid: z.boolean(),
  paidDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function DisbursementForm({
  assignees,
  isManager,
  currentUserId,
  defaultValues,
  onCancel,
  onSuccess,
}: Props) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: standardSchemaResolver(schema) as any,
    defaultValues: {
      assigneeId: currentUserId,
      itemType: "SCHEDULED",
      taxInvoiceStatus: "NOT_ISSUED",
      isPaid: false,
      scheduledDate: today,
      ...defaultValues,
    },
  });

  const isPaid = watch("isPaid");
  const itemType = watch("itemType");
  const taxInvoiceStatus = watch("taxInvoiceStatus");

  const onSubmit = async (data: FormData) => {
    const itemType = data.itemType;
    const isPaid = itemType === "ALREADY_PAID" ? true : data.isPaid;

    const payload = {
      assigneeId: isManager ? data.assigneeId : currentUserId,
      vendorName: data.vendorName,
      itemType,
      description: data.description,
      amount: parseFloat(data.amount.replace(/,/g, "")),
      scheduledDate: data.scheduledDate,
      note: data.note || undefined,
      taxInvoiceStatus: data.taxInvoiceStatus,
      taxInvoiceNumber: data.taxInvoiceNumber || null,
      taxInvoiceDate: data.taxInvoiceDate || null,
      isPaid,
      paidDate: isPaid ? data.paidDate || today : null,
    };

    const url = isEdit
      ? `/api/disbursement/${defaultValues!.id}`
      : "/api/disbursement";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "저장에 실패했습니다");
      return;
    }

    toast.success(isEdit ? "수정되었습니다" : "지급 내역이 등록되었습니다");
    router.refresh();
    onSuccess?.();
  };

  return (
    <Card className="gap-4">
      <h3 className="font-heading text-section-title">
        {isEdit ? "지급 내역 수정" : "지급 내역 등록"}
      </h3>

      <form
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmit={(handleSubmit as any)(onSubmit)}
        className="flex flex-col gap-4"
      >
        {isManager && (
          <div className="form-field">
            <Label>담당자</Label>
            <Select
              value={watch("assigneeId")}
              onValueChange={(v) => {
                if (v) setValue("assigneeId", v);
              }}
            >
              <SelectTrigger className="form-input h-9 w-full">
                <SelectValue placeholder="담당자 선택" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.position ? ` (${a.position})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigneeId && (
              <p className="text-caption text-destructive">{errors.assigneeId.message}</p>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="form-field">
            <Label>거래처명</Label>
            <Input
              className="form-input h-9"
              placeholder="거래처명"
              {...register("vendorName")}
            />
            {errors.vendorName && (
              <p className="text-caption text-destructive">{errors.vendorName.message}</p>
            )}
          </div>

          <div className="form-field">
            <Label>지급 유형</Label>
            <Select
              value={itemType}
              onValueChange={(v) => {
                if (!v) return;
                setValue("itemType", v as DisbursementTypeValue);
                setValue("isPaid", v === "ALREADY_PAID");
                if (v === "ALREADY_PAID" && !watch("paidDate")) {
                  setValue("paidDate", today);
                }
              }}
            >
              <SelectTrigger className="form-input h-9 w-full">
                <SelectValue placeholder="지급 유형 선택">
                  {DISBURSEMENT_TYPE_OPTIONS.find((o) => o.value === itemType)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {DISBURSEMENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="form-field">
          <Label>내용</Label>
          <Input
            className="form-input h-9"
            placeholder="지급 내용"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-caption text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="form-field">
            <Label>금액 (원)</Label>
            <Input
              className="form-input h-9"
              inputMode="numeric"
              placeholder="0"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-caption text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="form-field">
            <Label>지급 예정일</Label>
            <Input
              type="date"
              className="form-input h-9"
              {...register("scheduledDate")}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-hint-of-sky/40 p-4">
          <p className="mb-3 text-body-sm font-semibold text-midnight-charcoal">
            세금계산서 (매입)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="form-field">
              <Label>상태</Label>
              <Select
                value={taxInvoiceStatus}
                onValueChange={(v) => {
                  if (v) setValue("taxInvoiceStatus", v as TaxInvoiceStatusValue);
                }}
              >
                <SelectTrigger className="form-input h-9 w-full bg-canvas-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {TAX_INVOICE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label>계산서 번호</Label>
              <Input
                className="form-input h-9 bg-canvas-white"
                placeholder="선택 입력"
                {...register("taxInvoiceNumber")}
              />
            </div>
            <div className="form-field">
              <Label>발행일</Label>
              <Input
                type="date"
                className="form-input h-9 bg-canvas-white"
                {...register("taxInvoiceDate")}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
              {...register("isPaid")}
            />
            <span className="text-body-sm font-medium text-midnight-charcoal">
              지급 완료
            </span>
          </label>
          {isPaid && (
            <div className="form-field mt-3 max-w-[200px]">
              <Label>실지급일</Label>
              <Input
                type="date"
                className="form-input h-9"
                defaultValue={defaultValues?.paidDate ?? today}
                {...register("paidDate")}
              />
            </div>
          )}
        </div>

        <div className="form-field">
          <Label>비고</Label>
          <Textarea
            className="min-h-[72px] resize-none rounded-[var(--radius-buttons)] border-border text-body-sm"
            placeholder="비고 (선택)"
            {...register("note")}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "저장 중..." : isEdit ? "수정" : "등록"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
