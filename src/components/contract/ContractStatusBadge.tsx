import { Badge } from "@/components/ui/badge";

export type ContractStatus = "ACTIVE" | "ENDED" | "RENEWAL_PENDING";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
export type TaxInvoiceStatus = "NOT_ISSUED" | "ISSUED" | "REVISED";

const CONTRACT_STATUS: Record<ContractStatus, { label: string; variant: "positive" | "neutral" | "pending" }> = {
  ACTIVE: { label: "진행중", variant: "positive" },
  ENDED: { label: "종료", variant: "neutral" },
  RENEWAL_PENDING: { label: "갱신예정", variant: "pending" },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; variant: "attention" | "pending" | "positive" | "neutral" }> = {
  UNPAID: { label: "미입금", variant: "attention" },
  PARTIAL: { label: "부분", variant: "pending" },
  PAID: { label: "완납", variant: "positive" },
  OVERDUE: { label: "연체", variant: "attention" },
};

const TAX_STATUS: Record<TaxInvoiceStatus, { label: string; variant: "neutral" | "info" | "pending" }> = {
  NOT_ISSUED: { label: "미발행", variant: "neutral" },
  ISSUED: { label: "발행", variant: "info" },
  REVISED: { label: "수정발행", variant: "pending" },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const c = CONTRACT_STATUS[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const c = PAYMENT_STATUS[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function TaxInvoiceStatusBadge({ status }: { status: TaxInvoiceStatus }) {
  const c = TAX_STATUS[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
