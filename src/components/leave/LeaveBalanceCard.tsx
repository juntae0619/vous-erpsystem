"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  calculateAnnualLeaveDays,
  formatDateInput,
  getLeaveBalanceSummary,
  parseDateInput,
} from "@/lib/leave";

interface Props {
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carryOverDays: number;
  joinedAt: string;
  year: number;
}

export function LeaveBalanceCard({
  totalDays,
  usedDays,
  remainingDays,
  carryOverDays,
  joinedAt: initialJoinedAt,
  year,
}: Props) {
  const router = useRouter();
  const [joinedAt, setJoinedAt] = useState(initialJoinedAt);
  const [isSaving, setIsSaving] = useState(false);

  const previewDays = useMemo(() => {
    const parsed = parseDateInput(joinedAt);
    if (!parsed) return null;
    return calculateAnnualLeaveDays(parsed, year);
  }, [joinedAt, year]);

  const { granted, usedPercent } = getLeaveBalanceSummary(
    totalDays,
    usedDays,
    carryOverDays
  );

  async function handleApply() {
    const parsed = parseDateInput(joinedAt);
    if (!parsed) {
      toast.error("올바른 입사일을 입력해주세요");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/leave/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinedAt, year }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "연차 계산에 실패했습니다");
        return;
      }

      toast.success(`${year}년 연차 ${json.data.totalDays}일이 반영되었습니다`);
      router.refresh();
    } catch {
      toast.error("연차 계산 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="gap-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-section-title">연차 현황</h3>
        <span className="rounded-full bg-hint-of-sky px-2.5 py-1 text-caption font-medium text-midnight-charcoal">
          {year}년
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <div className="form-field">
          <Label htmlFor="joinedAt">입사일</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="joinedAt"
              type="date"
              value={joinedAt}
              max={formatDateInput(new Date())}
              onChange={(e) => setJoinedAt(e.target.value)}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              size="default"
              onClick={handleApply}
              disabled={isSaving || previewDays === null}
              className="h-9 shrink-0 gap-1.5 bg-primary px-4 text-primary-foreground shadow-btn hover:bg-midnight-charcoal disabled:bg-ash-gray disabled:text-smoke-gray disabled:opacity-100 disabled:shadow-none sm:min-w-[104px]"
            >
              <Calculator size={14} className="shrink-0" />
              {isSaving ? "계산 중..." : "계산하기"}
            </Button>
          </div>
          <p className="text-caption leading-relaxed text-smoke-gray">
            입사일 기준 근로기준법에 따라 {year}년 부여 연차를 계산합니다.
            {previewDays !== null && (
              <span className="ml-1 font-medium text-deep-violet">
                예상 {previewDays}일
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[var(--radius-buttons)] border border-border bg-canvas-white p-3 text-center">
            <p className="mb-1 text-caption text-smoke-gray">전체</p>
            <p className="text-kpi text-[18px]">{granted}</p>
            <p className="text-caption text-smoke-gray">일</p>
          </div>
          <div className="rounded-[var(--radius-buttons)] border border-border bg-canvas-white p-3 text-center">
            <p className="mb-1 text-caption text-smoke-gray">사용</p>
            <p className="text-kpi text-[18px] text-rich-plum">{usedDays}</p>
            <p className="text-caption text-smoke-gray">일</p>
          </div>
          <div className="rounded-[var(--radius-buttons)] border border-vivid-purple/20 bg-shadow-tint-blue p-3 text-center">
            <p className="mb-1 text-caption text-smoke-gray">잔여</p>
            <p className="text-kpi text-[18px] text-deep-violet">{remainingDays}</p>
            <p className="text-caption text-smoke-gray">일</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between">
          <span className="text-caption text-smoke-gray">사용률</span>
          <span className="text-caption font-medium text-midnight-charcoal">{usedPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-hint-of-sky">
          <div
            className="h-full rounded-full bg-deep-violet transition-all"
            style={{ width: `${Math.min(usedPercent, 100)}%` }}
          />
        </div>
      </div>

      {carryOverDays > 0 && (
        <p className="text-caption text-smoke-gray">
          이월 연차 {carryOverDays}일 포함
        </p>
      )}
    </Card>
  );
}
