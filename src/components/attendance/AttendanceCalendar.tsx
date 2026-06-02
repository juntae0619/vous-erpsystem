"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  getDaysInMonth,
  getDay,
  startOfMonth,
  isWeekend,
  isSameDay,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
import { attendanceStatusMap, formatTime, formatWorkMinutes } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workMinutes: number | null;
}

interface AttendanceCalendarProps {
  userId?: string; // 관리자가 특정 직원 조회할 때
}

export function AttendanceCalendar({ userId }: AttendanceCalendarProps) {
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (userId) params.set("userId", userId);
      const res = await fetch(`/api/attendance/monthly?${params}`);
      const json = await res.json();
      if (json.ok) {
        setRecords(json.data.records);
        setSummary(json.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month, userId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 월 변경 시 API 재조회
  useEffect(() => { fetchMonthly(); }, [fetchMonthly]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  // 달력 셀 구성
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const firstDayOfWeek = getDay(startOfMonth(new Date(year, month - 1))); // 0=Sun
  const cells = Array.from({ length: firstDayOfWeek + daysInMonth }, (_, i) =>
    i < firstDayOfWeek ? null : i - firstDayOfWeek + 1
  );

  function getRecord(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return records.find((r) => r.date.startsWith(dateStr)) ?? null;
  }

  return (
    <div className="space-y-4">
      {/* 달력 헤더 */}
      <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-[16px] font-semibold text-[#090c1d] tracking-[-0.26px]"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            {year}년 {month}월
          </h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="w-7 h-7 rounded-lg hover:bg-[#e9ebf0] text-[#b3b3b3]"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="w-7 h-7 rounded-lg hover:bg-[#e9ebf0] text-[#b3b3b3]"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-2">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
            <div
              key={d}
              className={`text-center text-caption font-medium py-1 ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-[#b3b3b3]"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const date = new Date(year, month - 1, day);
            const isToday = isSameDay(date, today);
            const isFuture = date > today;
            const isWknd = isWeekend(date);
            const record = getRecord(day);
            const statusInfo = record ? attendanceStatusMap[record.status] : null;

            return (
              <button
                key={day}
                onClick={() => record && setSelected(record)}
                className={`
                  relative flex flex-col items-center justify-start py-1.5 rounded-lg text-caption transition-all
                  ${isToday ? "bg-[#7b68ee] text-white" : "hover:bg-[#e9ebf0]"}
                  ${record ? "cursor-pointer" : "cursor-default"}
                `}
              >
                <span
                  className={`font-medium ${
                    isToday
                      ? "text-white"
                      : isFuture
                      ? "text-[#e8e8e8]"
                      : isWknd && !record
                      ? "text-[#d0d0d0]"
                      : "text-[#292d34]"
                  }`}
                >
                  {day}
                </span>
                {statusInfo && !isToday && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      statusInfo.color.replace("text-", "bg-").replace("-700", "-500")
                    }`}
                  />
                )}
                {isToday && record?.checkIn && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex gap-3 mt-4 pt-3 border-t border-[#e8e8e8]">
          {Object.entries(attendanceStatusMap).map(([, info]) => (
            <div key={info.label} className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${info.color.replace("text-", "bg-").replace("-700", "-500")}`}
              />
              <span className="text-caption text-[#b3b3b3]">{info.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 요약 통계 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { key: "normal",     label: "정상", color: "text-green-600" },
          { key: "late",       label: "지각", color: "text-yellow-600" },
          { key: "earlyLeave", label: "조퇴", color: "text-orange-600" },
          { key: "absent",     label: "결근", color: "text-red-600"  },
          { key: "onLeave",    label: "휴가", color: "text-blue-600" },
        ].map(({ key, label, color }) => (
          <Card key={key} className="p-3 shadow-card border-[#e8e8e8] rounded-xl text-center">
            <p className="text-caption text-[#b3b3b3]">{label}</p>
            <p className={`text-[20px] font-bold mt-0.5 ${color}`}
               style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
              {summary[key] ?? 0}
            </p>
          </Card>
        ))}
      </div>

      {/* 선택된 날 상세 */}
      {selected && (
        <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-body-sm font-semibold text-[#090c1d]">
              {format(parseISO(selected.date), "M월 d일 (EEE)", { locale: ko })} 상세
            </p>
            <Badge
              className={`text-caption px-2 py-0.5 rounded-full border-0 ${
                attendanceStatusMap[selected.status]?.bg
              } ${attendanceStatusMap[selected.status]?.color}`}
            >
              {attendanceStatusMap[selected.status]?.label}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-caption text-[#b3b3b3]">출근</p>
              <p className="text-[16px] font-semibold text-[#090c1d]">
                {selected.checkIn ? formatTime(selected.checkIn) : "-"}
              </p>
            </div>
            <div>
              <p className="text-caption text-[#b3b3b3]">퇴근</p>
              <p className="text-[16px] font-semibold text-[#090c1d]">
                {selected.checkOut ? formatTime(selected.checkOut) : "-"}
              </p>
            </div>
            <div>
              <p className="text-caption text-[#b3b3b3]">근무시간</p>
              <p className="text-[16px] font-semibold text-[#090c1d]">
                {formatWorkMinutes(selected.workMinutes)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
