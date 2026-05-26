import { Badge } from "@/components/ui/badge";

export type ContractStatus = "ACTIVE" | "ENDED" | "RENEWAL_PENDING";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
export type TaxInvoiceStatus = "NOT_ISSUED" | "ISSUED" | "REVISED";

const CONTRACT_STATUS: Record<ContractStatus, { label: string; className: string }> = {
  ACTIVE:           { label: "진행중",    className: "bg-[#f0fdf4] text-green-600 border-green-200" },
  ENDED:            { label: "종료",      className: "bg-[#f8f9fb] text-[#b3b3b3] border-[#e8e8e8]" },
  RENEWAL_PENDING:  { label: "갱신예정",  className: "bg-[#fff7ed] text-orange-600 border-orange-200" },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  UNPAID:  { label: "미입금", className: "bg-[#fef2f2] text-red-600 border-red-200" },
  PARTIAL: { label: "부분",   className: "bg-[#fff7ed] text-orange-600 border-orange-200" },
  PAID:    { label: "완납",   className: "bg-[#f0fdf4] text-green-600 border-green-200" },
  OVERDUE: { label: "연체",   className: "bg-[#fef2f2] text-red-700 border-red-300 font-bold" },
};

const TAX_STATUS: Record<TaxInvoiceStatus, { label: string; className: string }> = {
  NOT_ISSUED: { label: "미발행", className: "bg-[#f8f9fb] text-[#b3b3b3] border-[#e8e8e8]" },
  ISSUED:     { label: "발행",   className: "bg-[#edf6fd] text-blue-600 border-blue-200" },
  REVISED:    { label: "수정발행", className: "bg-[#fff7ed] text-orange-600 border-orange-200" },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const c = CONTRACT_STATUS[status];
  return <Badge className={`text-[11px] px-2 py-0.5 border rounded-full font-medium ${c.className}`}>{c.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const c = PAYMENT_STATUS[status];
  return <Badge className={`text-[11px] px-2 py-0.5 border rounded-full font-medium ${c.className}`}>{c.label}</Badge>;
}

export function TaxInvoiceStatusBadge({ status }: { status: TaxInvoiceStatus }) {
  const c = TAX_STATUS[status];
  return <Badge className={`text-[11px] px-2 py-0.5 border rounded-full font-medium ${c.className}`}>{c.label}</Badge>;
}
