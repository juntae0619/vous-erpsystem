"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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

const DOC_TYPE_OPTIONS = [
  { value: "GENERAL",  label: "일반결재" },
  { value: "EXPENSE",  label: "지출결의서" },
  { value: "CONTRACT", label: "계약결재" },
  { value: "REPORT",   label: "업무보고" },
] as const;

const STEP_ROLE_OPTIONS = [
  { value: "MANAGER",  label: "팀장" },
  { value: "DIRECTOR", label: "이사" },
  { value: "CEO",      label: "대표" },
] as const;

interface Approver {
  id: string;
  name: string;
  position: string | null;
  role: string;
}

interface Props {
  approvers: Approver[]; // 결재자로 지정 가능한 사용자 목록 (MANAGER+)
}

const schema = z.object({
  type: z.enum(["GENERAL", "EXPENSE", "CONTRACT", "REPORT"]),
  title: z.string().min(2, "제목을 입력해주세요").max(100),
  content: z.string().min(5, "내용을 입력해주세요"),
  expenseAmount: z.string().optional(),
  expenseItems: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface ApprovalLineItem {
  role: "MANAGER" | "DIRECTOR" | "CEO";
  approverId?: string;
}

const LABEL_CLS = "text-[13px] font-medium text-[#292d34]";
const INPUT_CLS = "h-9 text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]";

export function ApprovalDocumentForm({ approvers }: Props) {
  const router = useRouter();
  const [approvalLine, setApprovalLine] = useState<ApprovalLineItem[]>([
    { role: "MANAGER" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { type: "GENERAL" },
  });

  const docType = watch("type");
  const isExpense = docType === "EXPENSE";

  function addStep() {
    if (approvalLine.length >= 3) return;
    const usedRoles = new Set(approvalLine.map((l) => l.role));
    const nextRole = (["MANAGER", "DIRECTOR", "CEO"] as const).find((r) => !usedRoles.has(r));
    if (nextRole) setApprovalLine([...approvalLine, { role: nextRole }]);
  }

  function removeStep(idx: number) {
    if (approvalLine.length <= 1) return;
    setApprovalLine(approvalLine.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, patch: Partial<ApprovalLineItem>) {
    setApprovalLine(approvalLine.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  const submit = async (data: FormData, isDraft: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          expenseAmount: data.expenseAmount ? parseFloat(data.expenseAmount) : undefined,
          approvalLine,
          isDraft,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "제출에 실패했습니다"); return; }
      toast.success(isDraft ? "임시저장되었습니다" : "결재요청이 제출되었습니다");
      router.push("/approval");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="max-w-2xl mx-auto space-y-5">
      {/* 문서 종류 */}
      <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl space-y-4">
        <h3 className="text-[15px] font-semibold text-[#090c1d]" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
          문서 정보
        </h3>

        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>문서 종류</Label>
          <Select
            value={docType}
            onValueChange={(v) => setValue("type", v as FormData["type"])}
          >
            <SelectTrigger className={INPUT_CLS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#e8e8e8]">
              {DOC_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>제목</Label>
          <Input className={INPUT_CLS} {...register("title")} placeholder="결재 문서 제목" />
          {errors.title && <p className="text-[12px] text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>내용</Label>
          <Textarea
            {...register("content")}
            placeholder="결재 내용을 입력하세요"
            className="text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee] resize-none min-h-[150px]"
          />
          {errors.content && <p className="text-[12px] text-destructive">{errors.content.message}</p>}
        </div>

        {/* 지출결의서 추가 필드 */}
        {isExpense && (
          <>
            <div className="space-y-1.5">
              <Label className={LABEL_CLS}>지출 금액 (원)</Label>
              <Input
                className={INPUT_CLS}
                type="number"
                {...register("expenseAmount")}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className={LABEL_CLS}>지출 항목</Label>
              <Textarea
                {...register("expenseItems")}
                placeholder="항목명 / 금액 형태로 입력하세요&#10;예) 교통비 / 50,000원"
                className="text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee] resize-none min-h-[80px]"
              />
            </div>
          </>
        )}
      </Card>

      {/* 결재선 설정 */}
      <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#090c1d]" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
            결재선
          </h3>
          {approvalLine.length < 3 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[12px] text-[#7b68ee] hover:bg-[#edf6fd] rounded-lg px-2"
              onClick={addStep}
            >
              <Plus size={12} className="mr-1" />
              결재자 추가
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {approvalLine.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#edf6fd] text-[#7b68ee] text-[11px] font-bold shrink-0">
                {idx + 1}
              </div>

              <Select
                value={item.role}
                onValueChange={(v) => updateLine(idx, { role: v as ApprovalLineItem["role"] })}
              >
                <SelectTrigger className="h-9 w-28 text-[13px] border-[#e8e8e8] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#e8e8e8]">
                  {STEP_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={item.approverId ?? ""}
                onValueChange={(v) => updateLine(idx, { approverId: v || undefined })}
              >
                <SelectTrigger className="flex-1 h-9 text-[13px] border-[#e8e8e8] rounded-lg">
                  <SelectValue placeholder="결재자 선택 (선택)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#e8e8e8]">
                  {approvers
                    .filter((a) => {
                      if (item.role === "MANAGER") return a.role === "MANAGER" || a.role === "ADMIN";
                      if (item.role === "DIRECTOR") return a.role === "MANAGER" || a.role === "ADMIN";
                      return a.role === "ADMIN";
                    })
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-[13px]">
                        {a.name} {a.position ? `(${a.position})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {approvalLine.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 shrink-0 rounded-lg hover:bg-red-50 text-[#b3b3b3] hover:text-red-500"
                  onClick={() => removeStep(idx)}
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-9 text-[13px] border-[#e8e8e8] rounded-lg text-[#292d34]"
          disabled={submitting}
          onClick={handleSubmit((data) => submit(data, true))}
        >
          임시저장
        </Button>
        <Button
          type="button"
          className="flex-1 h-9 bg-[#202023] hover:bg-[#292d34] text-white text-[13px] rounded-lg"
          disabled={submitting}
          onClick={handleSubmit((data) => submit(data, false))}
        >
          {submitting ? "제출 중..." : "결재 요청"}
        </Button>
      </div>
    </form>
  );
}
