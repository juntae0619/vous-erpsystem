"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Plus, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentStatusBadge } from "@/components/contract/ContractStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKRW } from "@/lib/utils";

interface Payment {
  id: string;
  paidAt: string;
  amount: number;
  note: string | null;
}

interface Billing {
  id: string;
  billingDate: string;
  dueDate: string;
  serviceAmount: number;
  merchantFeeAmt: number;
  totalAmount: number;
  taxInvoiceStatus: string;
  taxInvoiceNumber: string | null;
  paymentStatus: string;
  paidAmount: number;
  note: string | null;
  payments: Payment[];
}

interface Props {
  contractId: string;
  billings: Billing[];
  canManage: boolean;
}

const LABEL_CLS = "text-[13px] font-medium text-[#292d34]";
const INPUT_CLS = "h-9 text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]";

const billingSchema = z.object({
  billingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceAmount: z.string().min(1),
  merchantFeeAmt: z.string().default("0"),
  note: z.string().optional(),
});

const paymentSchema = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().min(1),
  note: z.string().optional(),
});

export function BillingPanel({ contractId, billings, canManage }: Props) {
  const router = useRouter();
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [paymentBillingId, setPaymentBillingId] = useState<string | null>(null);

  // 청구 등록 폼
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const billingForm = useForm<z.infer<typeof billingSchema>>({
    resolver: standardSchemaResolver(billingSchema) as any,
  });

  // 입금 등록 폼
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: standardSchemaResolver(paymentSchema) as any,
  });

  const submitBilling = async (data: z.infer<typeof billingSchema>) => {
    const res = await fetch(`/api/contract/${contractId}/billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        serviceAmount: parseFloat(data.serviceAmount),
        merchantFeeAmt: parseFloat(data.merchantFeeAmt || "0"),
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "청구 등록 실패"); return; }
    toast.success("청구가 등록되었습니다");
    setShowBillingForm(false);
    billingForm.reset();
    router.refresh();
  };

  const submitPayment = async (data: z.infer<typeof paymentSchema>) => {
    if (!paymentBillingId) return;
    const res = await fetch(`/api/billing/${paymentBillingId}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, amount: parseFloat(data.amount) }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "입금 등록 실패"); return; }
    toast.success("입금이 등록되었습니다");
    setPaymentBillingId(null);
    paymentForm.reset();
    router.refresh();
  };

  return (
    <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-[#090c1d]" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
          청구·수금 내역
        </h3>
        {canManage && !showBillingForm && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[12px] text-[#7b68ee] hover:bg-[#edf6fd] rounded-lg px-2"
            onClick={() => setShowBillingForm(true)}
          >
            <Plus size={12} className="mr-1" />
            청구 추가
          </Button>
        )}
      </div>

      {/* 청구 등록 폼 */}
      {showBillingForm && (
        <form onSubmit={billingForm.handleSubmit(submitBilling as any)} className="p-4 bg-[#f8f9fb] rounded-xl mb-4 space-y-3">
          <p className="text-[13px] font-medium text-[#292d34]">청구 추가</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] text-[#b3b3b3]">청구일</Label>
              <Input className={INPUT_CLS} type="date" {...billingForm.register("billingDate")} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] text-[#b3b3b3]">납부기한</Label>
              <Input className={INPUT_CLS} type="date" {...billingForm.register("dueDate")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] text-[#b3b3b3]">서비스 금액</Label>
              <Input className={INPUT_CLS} type="number" {...billingForm.register("serviceAmount")} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] text-[#b3b3b3]">가맹점 수수료</Label>
              <Input className={INPUT_CLS} type="number" {...billingForm.register("merchantFeeAmt")} placeholder="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={billingForm.formState.isSubmitting}>
              추가
            </Button>
            <Button type="button" variant="ghost" className="h-8 text-[12px] rounded-lg" onClick={() => { setShowBillingForm(false); billingForm.reset(); }}>
              취소
            </Button>
          </div>
        </form>
      )}

      {billings.length === 0 ? (
        <p className="text-[13px] text-[#b3b3b3] text-center py-4">수금 내역이 없습니다</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e8e8e8]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">청구일자</TableHead>
                <TableHead className="text-right whitespace-nowrap">청구금액</TableHead>
                <TableHead className="whitespace-nowrap">입금일자</TableHead>
                <TableHead className="text-right whitespace-nowrap">입금액</TableHead>
                <TableHead className="text-right whitespace-nowrap">잔액</TableHead>
                <TableHead className="whitespace-nowrap">비고</TableHead>
                <TableHead className="whitespace-nowrap">상태</TableHead>
                {canManage && <TableHead className="text-right whitespace-nowrap">관리</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {billings.map((billing) => {
                const balance = billing.totalAmount - billing.paidAmount;
                const lastPayment = billing.payments[billing.payments.length - 1];
                return (
                  <TableRow key={billing.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(billing.billingDate), "yyyy.MM.dd", { locale: ko })}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatKRW(billing.totalAmount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-[#292d34]">
                      {lastPayment ? format(new Date(lastPayment.paidAt), "yyyy.MM.dd", { locale: ko }) : "-"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-deep-violet">{formatKRW(billing.paidAmount)}</TableCell>
                    <TableCell className={`text-right whitespace-nowrap ${balance > 0 ? "text-rich-plum font-medium" : "text-smoke-gray"}`}>
                      {formatKRW(balance)}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-[#b3b3b3]" title={billing.note ?? ""}>
                      {billing.note ?? "-"}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={billing.paymentStatus as Parameters<typeof PaymentStatusBadge>[0]["status"]} />
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right whitespace-nowrap">
                        {billing.paymentStatus !== "PAID" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-[#7b68ee] hover:bg-[#edf6fd] rounded-lg px-2"
                            onClick={() => setPaymentBillingId(billing.id)}
                          >
                            <CreditCard size={11} className="mr-1" />
                            입금
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 입금 등록 폼 (행 선택 시) */}
      {paymentBillingId && (
        <form onSubmit={paymentForm.handleSubmit(submitPayment as any)} className="mt-4 p-4 bg-[#f8f9fb] rounded-xl space-y-3">
          <p className="text-[13px] font-medium text-[#292d34]">입금 등록</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] text-[#b3b3b3]">입금일자</Label>
              <Input className={INPUT_CLS} type="date" {...paymentForm.register("paidAt")} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] text-[#b3b3b3]">입금액</Label>
              <Input className={INPUT_CLS} type="number" {...paymentForm.register("amount")} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] text-[#b3b3b3]">비고</Label>
              <Input className={INPUT_CLS} {...paymentForm.register("note")} placeholder="선택" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={paymentForm.formState.isSubmitting}>입금 등록</Button>
            <Button type="button" variant="ghost" className="h-8 text-[12px] rounded-lg" onClick={() => { setPaymentBillingId(null); paymentForm.reset(); }}>
              취소
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
