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
import { PaymentStatusBadge, TaxInvoiceStatusBadge } from "@/components/contract/ContractStatusBadge";
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
        <p className="text-[13px] text-[#b3b3b3] text-center py-4">청구 내역이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {billings.map((billing) => (
            <div key={billing.id} className="border border-[#e8e8e8] rounded-xl overflow-hidden">
              {/* 청구 헤더 */}
              <div className="p-3 bg-[#f8f9fb] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[#292d34]">
                    {format(new Date(billing.billingDate), "yyyy.MM.dd", { locale: ko })} 청구
                  </span>
                  <PaymentStatusBadge status={billing.paymentStatus as Parameters<typeof PaymentStatusBadge>[0]["status"]} />
                  <TaxInvoiceStatusBadge status={billing.taxInvoiceStatus as Parameters<typeof TaxInvoiceStatusBadge>[0]["status"]} />
                </div>
                <span className="text-[13px] font-semibold text-[#090c1d]">
                  {formatKRW(billing.totalAmount)}
                </span>
              </div>

              {/* 청구 상세 */}
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-[#b3b3b3]">서비스금액</p>
                    <p className="text-[12px] font-medium text-[#292d34]">{formatKRW(billing.serviceAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#b3b3b3]">수수료</p>
                    <p className="text-[12px] font-medium text-[#292d34]">{formatKRW(billing.merchantFeeAmt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#b3b3b3]">입금액</p>
                    <p className="text-caption font-medium text-deep-violet">{formatKRW(billing.paidAmount)}</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#b3b3b3]">
                  납부기한: {format(new Date(billing.dueDate), "yyyy.MM.dd", { locale: ko })}
                </p>

                {/* 입금 내역 */}
                {billing.payments.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-[#e8e8e8]">
                    {billing.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-[12px]">
                        <span className="text-[#292d34]">
                          {format(new Date(p.paidAt), "MM.dd", { locale: ko })} 입금
                          {p.note && <span className="text-[#b3b3b3] ml-1">({p.note})</span>}
                        </span>
                        <span className="font-medium text-deep-violet">+{formatKRW(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 입금 등록 폼 */}
                {paymentBillingId === billing.id ? (
                  <form onSubmit={paymentForm.handleSubmit(submitPayment as any)} className="pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input className="h-8 text-[12px] border-[#e8e8e8] rounded-lg" type="date" {...paymentForm.register("paidAt")} />
                      <Input className="h-8 text-[12px] border-[#e8e8e8] rounded-lg" type="number" {...paymentForm.register("amount")} placeholder="금액" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={paymentForm.formState.isSubmitting}>
                        입금 등록
                      </Button>
                      <Button type="button" variant="ghost" className="h-7 text-[11px] rounded-lg px-2" onClick={() => { setPaymentBillingId(null); paymentForm.reset(); }}>
                        취소
                      </Button>
                    </div>
                  </form>
                ) : (
                  canManage && billing.paymentStatus !== "PAID" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-[#7b68ee] hover:bg-[#edf6fd] rounded-lg px-2 w-full"
                      onClick={() => setPaymentBillingId(billing.id)}
                    >
                      <CreditCard size={11} className="mr-1" />
                      입금 등록
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
