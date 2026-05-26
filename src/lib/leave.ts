/**
 * 근로기준법 기준 연차 산정 (간소화)
 * - 1년 미만: 매월 1일 (최대 11일)
 * - 1년 이상: 15일 + 2년마다 1일 가산 (최대 25일)
 */

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 기준일 기준 완료된 근속 연수 */
export function getYearsOfService(joinedAt: Date, referenceDate: Date): number {
  const joined = startOfDay(joinedAt);
  const ref = startOfDay(referenceDate);

  let years = ref.getFullYear() - joined.getFullYear();
  const monthDiff = ref.getMonth() - joined.getMonth();
  const dayDiff = ref.getDate() - joined.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }

  return Math.max(0, years);
}

/** 1년 미만 월별 발생 일수 (최대 11일) */
export function countAccrualMonths(joinedAt: Date, endDate: Date): number {
  const joined = startOfDay(joinedAt);
  const end = startOfDay(endDate);

  if (end < joined) return 0;

  let months =
    (end.getFullYear() - joined.getFullYear()) * 12 +
    (end.getMonth() - joined.getMonth());

  if (end.getDate() >= joined.getDate()) {
    months += 1;
  }

  return Math.max(0, months);
}

/** 해당 연도 기준 부여 연차 일수 */
export function calculateAnnualLeaveDays(
  joinedAt: Date,
  year: number,
  asOf: Date = new Date()
): number {
  const joined = startOfDay(joinedAt);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  if (joined > yearEnd) return 0;

  const effectiveAsOf =
    asOf > yearEnd ? yearEnd : asOf < yearStart ? yearStart : asOf;

  if (effectiveAsOf < joined) return 0;

  const yearsOnYearStart = getYearsOfService(joined, yearStart);

  if (yearsOnYearStart >= 1) {
    let days = 15;
    if (yearsOnYearStart >= 3) {
      days += Math.floor((yearsOnYearStart - 1) / 2);
    }
    return Math.min(days, 25);
  }

  return Math.min(countAccrualMonths(joined, effectiveAsOf), 11);
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLeaveBalanceSummary(
  totalDays: number,
  usedDays: number,
  carryOverDays: number
) {
  const granted = totalDays + carryOverDays;
  const remaining = granted - usedDays;
  const usedPercent =
    granted > 0 ? Math.round((usedDays / granted) * 100) : 0;

  return { granted, remaining, usedPercent };
}
