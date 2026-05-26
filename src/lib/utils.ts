import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 한국 원화 포맷
export function formatKRW(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return amount.toLocaleString("ko-KR") + "원";
}

// 날짜 포맷
export function formatDate(
  date: Date | string | null | undefined,
  fmt = "yyyy-MM-dd"
): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, fmt, { locale: ko });
  } catch {
    return "-";
  }
}

// 시간 포맷 HH:mm
export function formatTime(date: Date | string | null | undefined): string {
  return formatDate(date, "HH:mm");
}

// 분 → "H시간 M분"
export function formatWorkMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// 역할 한글
export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "관리자",
    MANAGER: "중간관리자",
    USER: "사용자",
  };
  return map[role] ?? role;
}

// 출퇴근 상태 색상 맵
export const attendanceStatusMap: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  NORMAL:      { label: "정상", color: "text-green-700",  bg: "bg-green-50"  },
  LATE:        { label: "지각", color: "text-yellow-700", bg: "bg-yellow-50" },
  EARLY_LEAVE: { label: "조퇴", color: "text-orange-700", bg: "bg-orange-50" },
  ABSENT:      { label: "결근", color: "text-red-700",    bg: "bg-red-50"    },
  ON_LEAVE:    { label: "휴가", color: "text-blue-700",   bg: "bg-blue-50"   },
};

// 휴가 종류 한글
export const leaveTypeMap: Record<string, string> = {
  ANNUAL:   "연차",
  HALF_DAY: "반차",
  SICK:     "병가",
  PUBLIC:   "공가",
  SPECIAL:  "경조사",
};
