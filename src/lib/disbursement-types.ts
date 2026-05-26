import { z } from "zod/v4";

export const DISBURSEMENT_TYPE_VALUES = ["ALREADY_PAID", "SCHEDULED"] as const;

export type DisbursementTypeValue = (typeof DISBURSEMENT_TYPE_VALUES)[number];

export const DISBURSEMENT_TYPE_LABELS: Record<DisbursementTypeValue, string> = {
  ALREADY_PAID: "기지급",
  SCHEDULED: "지급예정",
};

export const DISBURSEMENT_TYPE_OPTIONS = DISBURSEMENT_TYPE_VALUES.map((value) => ({
  value,
  label: DISBURSEMENT_TYPE_LABELS[value],
}));

export const disbursementTypeSchema = z.enum(DISBURSEMENT_TYPE_VALUES);

export const TAX_INVOICE_STATUS_VALUES = ["NOT_ISSUED", "ISSUED", "REVISED"] as const;

export type TaxInvoiceStatusValue = (typeof TAX_INVOICE_STATUS_VALUES)[number];

export const taxInvoiceStatusSchema = z.enum(TAX_INVOICE_STATUS_VALUES);

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createDisbursementSchema = z.object({
  assigneeId: z.string().min(1, "담당자를 선택해주세요"),
  vendorName: z.string().min(1, "거래처명을 입력해주세요"),
  itemType: disbursementTypeSchema,
  description: z.string().min(1, "내용을 입력해주세요"),
  amount: z.number().min(1, "금액을 입력해주세요"),
  scheduledDate: dateStringSchema,
  note: z.string().optional(),
  taxInvoiceStatus: taxInvoiceStatusSchema.optional(),
  taxInvoiceNumber: z.string().optional().nullable(),
  taxInvoiceDate: dateStringSchema.optional().nullable(),
  isPaid: z.boolean().optional(),
  paidDate: dateStringSchema.optional().nullable(),
});

export const updateDisbursementSchema = z.object({
  assigneeId: z.string().min(1).optional(),
  vendorName: z.string().min(1).optional(),
  itemType: disbursementTypeSchema.optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(1).optional(),
  scheduledDate: dateStringSchema.optional(),
  note: z.string().optional().nullable(),
  taxInvoiceStatus: taxInvoiceStatusSchema.optional(),
  taxInvoiceNumber: z.string().optional().nullable(),
  taxInvoiceDate: dateStringSchema.optional().nullable(),
  isPaid: z.boolean().optional(),
  paidDate: dateStringSchema.optional().nullable(),
});

export function serializeDisbursement<T extends {
  amount: unknown;
  scheduledDate: Date;
  paidDate: Date | null;
  taxInvoiceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>(row: T) {
  return {
    ...row,
    amount: Number(row.amount),
    scheduledDate: row.scheduledDate.toISOString(),
    paidDate: row.paidDate?.toISOString() ?? null,
    taxInvoiceDate: row.taxInvoiceDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
