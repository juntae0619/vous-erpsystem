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
import { buttonVariants } from "@/components/ui/button";
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

const LEAVE_TYPE_OPTIONS = [
  { value: "ANNUAL",   label: "연차" },
  { value: "HALF_DAY", label: "반차" },
  { value: "SICK",     label: "병가" },
  { value: "PUBLIC",   label: "공가" },
  { value: "SPECIAL",  label: "경조사" },
] as const;

const HALF_DAY_OPTIONS = [
  { value: "AM", label: "오전 반차" },
  { value: "PM", label: "오후 반차" },
] as const;

const schema = z.object({
  type: z.enum(["ANNUAL", "HALF_DAY", "SICK", "PUBLIC", "SPECIAL"]),
  halfDayType: z.enum(["AM", "PM"]).optional(),
  reason: z.string().min(2, "사유를 입력해주세요"),
});
type FormData = z.infer<typeof schema>;

const LABEL_CLS = "text-[13px] font-medium text-[#292d34]";
const INPUT_CLS = "h-9 text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]";

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

    const res = await fetch("/api/leave/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(effectiveEnd, "yyyy-MM-dd"),
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "신청에 실패했습니다"); return; }
    toast.success("휴가 신청이 완료되었습니다");
    reset();
    setStartDate(undefined);
    setEndDate(undefined);
    router.refresh();
  };

  return (
    <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
      <h3
        className="text-[15px] font-semibold text-[#090c1d] mb-4"
        style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
      >
        휴가 신청
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 휴가 종류 */}
        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>휴가 종류</Label>
          <Select
            value={leaveType}
            onValueChange={(v) => setValue("type", v as FormData["type"])}
          >
            <SelectTrigger className={INPUT_CLS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#e8e8e8]">
              {LEAVE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-[13px]">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 반차 구분 */}
        {isHalfDay && (
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>반차 구분</Label>
            <Select
              onValueChange={(v) => setValue("halfDayType", v as "AM" | "PM")}
            >
              <SelectTrigger className={INPUT_CLS}>
                <SelectValue placeholder="오전/오후 선택" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#e8e8e8]">
                {HALF_DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-[13px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 날짜 */}
        <div className={`grid gap-3 ${isHalfDay ? "grid-cols-1" : "grid-cols-2"}`}>
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>{isHalfDay ? "날짜" : "시작일"}</Label>
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger
                className={`${INPUT_CLS} w-full flex items-center justify-start font-normal bg-white border border-[#e8e8e8] ${!startDate ? "text-[#b3b3b3]" : "text-[#292d34]"}`}
              >
                <CalendarIcon size={13} className="mr-2 text-[#b3b3b3]" />
                {startDate ? format(startDate, "yyyy.MM.dd", { locale: ko }) : "날짜 선택"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl border-[#e8e8e8] shadow-card" align="start">
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
            <div className="space-y-1.5">
              <Label className={LABEL_CLS}>종료일</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger
                  className={`${INPUT_CLS} w-full flex items-center justify-start font-normal bg-white border border-[#e8e8e8] ${!endDate ? "text-[#b3b3b3]" : "text-[#292d34]"}`}
                >
                  <CalendarIcon size={13} className="mr-2 text-[#b3b3b3]" />
                  {endDate ? format(endDate, "yyyy.MM.dd", { locale: ko }) : "날짜 선택"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl border-[#e8e8e8] shadow-card" align="start">
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

        {/* 사유 */}
        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>사유</Label>
          <Textarea
            {...register("reason")}
            placeholder="휴가 사유를 입력해주세요"
            className="text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee] resize-none min-h-[80px]"
          />
          {errors.reason && (
            <p className="text-[12px] text-destructive">{errors.reason.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-9 bg-[#202023] hover:bg-[#292d34] text-white text-[13px] rounded-lg"
        >
          {isSubmitting ? "신청 중..." : "휴가 신청"}
        </Button>
      </form>
    </Card>
  );
}
