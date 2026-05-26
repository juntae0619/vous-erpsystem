import { z } from "zod/v4";

export const LEAVE_TYPE_VALUES = [
  "ANNUAL",
  "HALF_DAY",
  "SICK",
  "PUBLIC",
  "SPECIAL",
  "SUMMER",
] as const;

export type LeaveTypeValue = (typeof LEAVE_TYPE_VALUES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveTypeValue, string> = {
  ANNUAL: "연차",
  HALF_DAY: "반차",
  SICK: "병가",
  PUBLIC: "공가",
  SPECIAL: "경조사",
  SUMMER: "여름휴가",
};

export const LEAVE_TYPE_OPTIONS = LEAVE_TYPE_VALUES.map((value) => ({
  value,
  label: LEAVE_TYPE_LABELS[value],
}));

export const leaveTypeSchema = z.enum(LEAVE_TYPE_VALUES);
