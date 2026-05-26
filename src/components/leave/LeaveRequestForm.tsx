"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  LEAVE_TYPE_OPTIONS,
  leaveTypeSchema,
  type LeaveTypeValue,
} from "@/lib/leave-types";

const HALF_DAY_OPTIONS = [
  { value: "AM", label: "오전 반차" },
  { value: "PM", label: "오후 반차" },
] as const;

const schema = z.object({
  type: leaveTypeSchema,
  halfDayType: z.enum(["AM", "PM"]).optional(),
  reason: z.string().min(2, "사유를 입력해주세요"),
});
type FormData = z.infer<typeof schema>;

export function LeaveRequestForm() {
  const router = useRouter();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { type: "ANNUAL" },
  });

  const leaveType = watch("type");
  const isHalfDay = leaveType === "HALF_DAY";

  const onSubmit = async (data: FormData) => {
    if (!startDate) { toast.error("시작일을 선택해주세요"); return; }
    if (!isHalfDay && !endDate) { toast.error("종료일을 선택해주세요"); return; }
    if (isHalfDay && data.halfDayType === undefined) {
      toast.error("반차 구분을 선택해주세요"); return;
    }

    const effectiveEnd = isHalfDay ? startDate : endDate!;

    try {
      const res = await fetch("/api/leave/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(effectiveEnd, "yyyy-MM-dd"),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error ?? "신청에 실패했습니다");
        return;
      }

      toast.success("휴가 신청이 완료되었습니다");
      reset();
      setStartDate(undefined);
      setEndDate(undefined);
      router.refresh();
    } catch {
      toast.error("신청 중 오류가 발생했습니다");
    }
  };

  return (
    <Card className="gap-4">
      <h3 className="font-heading text-section-title">휴가 신청</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="form-field">
          <Label>휴가 종류</Label>
          <Select
            value={leaveType}
            onValueChange={(v) => setValue("type", v as LeaveTypeValue)}
          >
            <SelectTrigger className="form-input h-9 w-full justify-between rounded-[var(--radius-buttons)] border-border bg-canvas-white text-body-sm">
              <SelectValue placeholder="휴가 종류 선택">
                {LEAVE_TYPE_OPTIONS.find((o) => o.value === leaveType)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border">
              {LEAVE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-body-sm">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isHalfDay && (
          <div className="form-field">
            <Label>반차 구분</Label>
            <Select onValueChange={(v) => setValue("halfDayType", v as "AM" | "PM")}>
              <SelectTrigger className="form-input h-9 w-full justify-between rounded-[var(--radius-buttons)] border-border bg-canvas-white text-body-sm">
                <SelectValue placeholder="오전/오후 선택" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {HALF_DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-body-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={`grid gap-3 ${isHalfDay ? "grid-cols-1" : "grid-cols-2"}`}>
          <div className="form-field">
            <Label>{isHalfDay ? "날짜" : "시작일"}</Label>
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger
                className="form-input flex w-full items-center justify-start border bg-canvas-white font-normal data-[empty=true]:text-smoke-gray"
                data-empty={!startDate}
              >
                <CalendarIcon size={13} className="mr-2 shrink-0 text-smoke-gray" />
                {startDate ? format(startDate, "yyyy.MM.dd", { locale: ko }) : "날짜 선택"}
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-xl border-border bg-canvas-white p-0 shadow-card" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => { setStartDate(d); setStartOpen(false); }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {!isHalfDay && (
            <div className="form-field">
              <Label>종료일</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger
                  className="form-input flex w-full items-center justify-start border bg-canvas-white font-normal data-[empty=true]:text-smoke-gray"
                  data-empty={!endDate}
                >
                  <CalendarIcon size={13} className="mr-2 shrink-0 text-smoke-gray" />
                  {endDate ? format(endDate, "yyyy.MM.dd", { locale: ko }) : "날짜 선택"}
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-xl border-border bg-canvas-white p-0 shadow-card" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => { setEndDate(d); setEndOpen(false); }}
                    disabled={(d) => startDate ? d < startDate : d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="form-field">
          <Label>사유</Label>
          <Textarea
            {...register("reason")}
            placeholder="휴가 사유를 입력해주세요"
            className="min-h-[80px] resize-none rounded-[var(--radius-buttons)] border-border text-body-sm focus-visible:ring-ring"
          />
          {errors.reason && (
            <p className="text-caption text-destructive">{errors.reason.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "신청 중..." : "휴가 신청"}
        </Button>
      </form>
    </Card>
  );
}
