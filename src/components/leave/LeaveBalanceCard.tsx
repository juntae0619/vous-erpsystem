"use client";

import { Card } from "@/components/ui/card";

interface Props {
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carryOverDays: number;
}

export function LeaveBalanceCard({ totalDays, usedDays, remainingDays, carryOverDays }: Props) {
  const usedPercent = totalDays > 0 ? Math.round((usedDays / (totalDays + carryOverDays)) * 100) : 0;

  return (
    <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-[15px] font-semibold text-[#090c1d]"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
        >
          연차 현황
        </h3>
        <span className="text-[12px] text-[#b3b3b3]">{new Date().getFullYear()}년</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center p-3 rounded-xl bg-[#f8f9fb]">
          <p className="text-[11px] text-[#b3b3b3] mb-1">전체</p>
          <p className="text-[22px] font-bold text-[#292d34]" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
            {totalDays + carryOverDays}
          </p>
          <p className="text-[11px] text-[#b3b3b3]">일</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-[#fff7ed]">
          <p className="text-[11px] text-[#b3b3b3] mb-1">사용</p>
          <p className="text-[22px] font-bold text-orange-500" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
            {usedDays}
          </p>
          <p className="text-[11px] text-[#b3b3b3]">일</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-[#edf6fd]">
          <p className="text-[11px] text-[#b3b3b3] mb-1">잔여</p>
          <p className="text-[22px] font-bold text-[#7b68ee]" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
            {remainingDays}
          </p>
          <p className="text-[11px] text-[#b3b3b3]">일</p>
        </div>
      </div>

      {/* 진행 바 */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-[#b3b3b3]">사용률</span>
          <span className="text-[11px] font-medium text-[#292d34]">{usedPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#e9ebf0] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#7b68ee] transition-all"
            style={{ width: `${Math.min(usedPercent, 100)}%` }}
          />
        </div>
      </div>

      {carryOverDays > 0 && (
        <p className="text-[11px] text-[#b3b3b3] mt-3">
          ✦ 이월 연차 {carryOverDays}일 포함
        </p>
      )}
    </Card>
  );
}
