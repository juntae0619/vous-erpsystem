import { z } from "zod/v4";

export const BILLING_CYCLE_VALUES = [
  "DAYS_10",
  "DAYS_15",
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
] as const;

export type BillingCycleValue = (typeof BILLING_CYCLE_VALUES)[number];

export const BILLING_CYCLE_MAP: Record<BillingCycleValue, string> = {
  DAYS_10: "10일",
  DAYS_15: "15일",
  MONTHLY: "한달",
  QUARTERLY: "분기",
  SEMI_ANNUAL: "반기",
  ANNUAL: "연간",
};

export const BILLING_CYCLE_OPTIONS = [
  { value: "DAYS_10", label: "10일" },
  { value: "DAYS_15", label: "15일" },
  { value: "MONTHLY", label: "한달" },
  { value: "QUARTERLY", label: "분기 (3개월)" },
  { value: "SEMI_ANNUAL", label: "반기 (6개월)" },
  { value: "ANNUAL", label: "연간 (12개월)" },
] as const;

export const billingCycleSchema = z.enum(BILLING_CYCLE_VALUES);

export const MERCHANT_SETTLEMENT_CYCLE_VALUES = [
  "DAYS_10",
  "DAYS_15",
  "MONTHLY",
] as const satisfies readonly BillingCycleValue[];

export type MerchantSettlementCycleValue =
  (typeof MERCHANT_SETTLEMENT_CYCLE_VALUES)[number];

export const MERCHANT_SETTLEMENT_CYCLE_OPTIONS = [
  { value: "DAYS_10", label: "10일" },
  { value: "DAYS_15", label: "15일" },
  { value: "MONTHLY", label: "한달" },
] as const;

export const merchantSettlementCycleSchema = z.enum(MERCHANT_SETTLEMENT_CYCLE_VALUES);

export const BILLING_CYCLE_IMPORT_MAP: Record<string, BillingCycleValue> = {
  "10일": "DAYS_10",
  "15일": "DAYS_15",
  한달: "MONTHLY",
  분기: "QUARTERLY",
  반기: "SEMI_ANNUAL",
  연간: "ANNUAL",
};

export const BILLING_CYCLE_IMPORT_LABELS = "10일|15일|한달|분기|반기|연간";

export const MERCHANT_SETTLEMENT_IMPORT_MAP: Record<
  string,
  MerchantSettlementCycleValue
> = {
  "10일": "DAYS_10",
  "15일": "DAYS_15",
  한달: "MONTHLY",
};

export const MERCHANT_SETTLEMENT_IMPORT_LABELS = "10일|15일|한달";

export function toMerchantSettlementCycle(
  value: string | null | undefined
): MerchantSettlementCycleValue | undefined {
  if (!value) return undefined;
  return (MERCHANT_SETTLEMENT_CYCLE_VALUES as readonly string[]).includes(value)
    ? (value as MerchantSettlementCycleValue)
    : undefined;
}
