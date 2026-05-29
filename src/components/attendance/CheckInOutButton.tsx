"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, AlertCircle } from "lucide-react";
import { formatTime, formatWorkMinutes, attendanceStatusMap } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AttendanceRecord {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workMinutes: number | null;
}

interface CheckInOutButtonProps {
  initialRecord: AttendanceRecord | null;
  onUpdate?: (record: AttendanceRecord) => void;
}

export function CheckInOutButton({ initialRecord, onUpdate }: CheckInOutButtonProps) {
  const [record, setRecord] = useState<AttendanceRecord | null>(initialRecord);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const statusInfo = record ? attendanceStatusMap[record.status] : null;

  async function handleCheckIn() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/check-in", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      setRecord(json.data.record);
      onUpdate?.(json.data.record);
      if (json.data.isLate) {
        toast.warning("지각으로 기록되었습니다");
      } else {
        toast.success("출근 완료! 좋은 하루 되세요 😊");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/check-out", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      setRecord(json.data.record);
      onUpdate?.(json.data.record);
      if (json.data.isEarlyLeave) {
        toast.warning("조퇴로 기록되었습니다");
      } else {
        toast.success(`퇴근 완료! 수고하셨습니다 🎉 (${formatWorkMinutes(json.data.workMinutes)} 근무)`);
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#edf6fd]">
            <Clock size={15} className="text-[#7b68ee]" />
          </div>
          <div>
            <p
              className="text-body-sm font-semibold text-[#090c1d] tracking-[-0.15px]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              오늘 근태
            </p>
            <p className="text-caption text-[#b3b3b3]">
              {format(now, "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </p>
          </div>
        </div>
        {statusInfo && (
          <Badge
            className={`text-caption px-2.5 py-1 rounded-full font-medium border-0 ${statusInfo.bg} ${statusInfo.color}`}
          >
            {statusInfo.label}
          </Badge>
        )}
      </div>

      {/* 출퇴근 시간 표시 */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-[#e9ebf0] rounded-lg p-3 text-center">
          <p className="text-caption text-[#b3b3b3] mb-1">출근</p>
          <p
            className="text-[20px] font-bold text-[#090c1d] tracking-[-0.5px]"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            {record?.checkIn ? formatTime(record.checkIn) : "--:--"}
          </p>
        </div>
        <div className="flex-1 bg-[#e9ebf0] rounded-lg p-3 text-center">
          <p className="text-caption text-[#b3b3b3] mb-1">퇴근</p>
          <p
            className="text-[20px] font-bold text-[#090c1d] tracking-[-0.5px]"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            {record?.checkOut ? formatTime(record.checkOut) : "--:--"}
          </p>
        </div>
        <div className="flex-1 bg-[#e9ebf0] rounded-lg p-3 text-center">
          <p className="text-caption text-[#b3b3b3] mb-1">근무시간</p>
          <p
            className="text-[16px] font-bold text-[#090c1d] tracking-[-0.5px]"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            {record?.workMinutes ? formatWorkMinutes(record.workMinutes) : "-"}
          </p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <Button
          onClick={handleCheckIn}
          disabled={loading || !!record?.checkIn}
          className="flex-1 gap-2 disabled:opacity-40"
        >
          <LogIn size={14} />
          출근
        </Button>
        <Button
          onClick={handleCheckOut}
          disabled={loading || !record?.checkIn || !!record?.checkOut}
          variant="outline"
          className="flex-1 h-10 border-[#e8e8e8] text-[#292d34] hover:bg-[#e9ebf0] text-body-sm font-medium rounded-lg gap-2 disabled:opacity-40"
        >
          <LogOut size={14} />
          퇴근
        </Button>
      </div>

      {!record?.checkIn && (
        <p className="flex items-center gap-1.5 text-caption text-[#b3b3b3] mt-3">
          <AlertCircle size={12} />
          출근 버튼을 눌러 오늘 근무를 시작하세요
        </p>
      )}
    </Card>
  );
}
