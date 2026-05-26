import { fail } from "@/lib/api";
import type { Session } from "next-auth";

export function isManagerRole(role?: string) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canAccessDisbursement(
  session: Session,
  assigneeId: string
): boolean {
  if (isManagerRole(session.user.role)) return true;
  return session.user.id === assigneeId;
}

export function disbursementForbidden() {
  return fail("권한이 없습니다", 403);
}

export function parseYearMonth(searchParams: URLSearchParams) {
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  if (!year || !month) return null;

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) return null;

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

export function toDateOnly(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

export function resolvePaidFields(
  isPaid: boolean | undefined,
  paidDate: string | null | undefined
) {
  if (isPaid === undefined) return {};

  if (isPaid) {
    return {
      isPaid: true,
      itemType: "ALREADY_PAID" as const,
      paidDate: paidDate ? new Date(paidDate) : new Date(),
    };
  }

  return {
    isPaid: false,
    itemType: "SCHEDULED" as const,
    paidDate: null,
  };
}
