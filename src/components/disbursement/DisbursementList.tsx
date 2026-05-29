"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaxInvoiceStatusBadge } from "@/components/contract/ContractStatusBadge";
import {
  DisbursementForm,
  type DisbursementFormValues,
} from "@/components/disbursement/DisbursementForm";
import {
  DISBURSEMENT_TYPE_LABELS,
  type DisbursementTypeValue,
  type TaxInvoiceStatusValue,
} from "@/lib/disbursement-types";
import { formatKRW } from "@/lib/utils";

interface Assignee {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
}

export interface DisbursementItem {
  id: string;
  assigneeId: string;
  vendorName: string;
  itemType: string;
  description: string;
  amount: number;
  scheduledDate: string;
  paidDate: string | null;
  isPaid: boolean;
  taxInvoiceStatus: string;
  taxInvoiceNumber: string | null;
  taxInvoiceDate: string | null;
  note: string | null;
  assignee: Assignee;
}

interface Props {
  items: DisbursementItem[];
  assignees: { id: string; name: string; position: string | null }[];
  isManager: boolean;
  currentUserId: string;
}

function toFormValues(item: DisbursementItem): DisbursementFormValues {
  return {
    id: item.id,
    assigneeId: item.assigneeId,
    vendorName: item.vendorName,
    itemType: item.itemType as DisbursementTypeValue,
    description: item.description,
    amount: String(item.amount),
    scheduledDate: format(new Date(item.scheduledDate), "yyyy-MM-dd"),
    note: item.note ?? undefined,
    taxInvoiceStatus: item.taxInvoiceStatus as TaxInvoiceStatusValue,
    taxInvoiceNumber: item.taxInvoiceNumber ?? undefined,
    taxInvoiceDate: item.taxInvoiceDate
      ? format(new Date(item.taxInvoiceDate), "yyyy-MM-dd")
      : undefined,
    isPaid: item.isPaid,
    paidDate: item.paidDate
      ? format(new Date(item.paidDate), "yyyy-MM-dd")
      : undefined,
  };
}

export function DisbursementList({
  items,
  assignees,
  isManager,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<DisbursementItem | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function togglePaid(item: DisbursementItem) {
    setLoadingId(item.id);
    try {
      const res = await fetch(`/api/disbursement/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPaid: !item.isPaid,
          itemType: !item.isPaid ? "ALREADY_PAID" : "SCHEDULED",
          paidDate: !item.isPaid ? format(new Date(), "yyyy-MM-dd") : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "처리 실패");
        return;
      }
      toast.success(item.isPaid ? "미지급으로 변경되었습니다" : "지급 완료 처리되었습니다");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("지급 내역을 삭제하시겠습니까?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/disbursement/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "삭제 실패");
        return;
      }
      toast.success("삭제되었습니다");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  if (editingItem) {
    return (
      <DisbursementForm
        assignees={assignees}
        isManager={isManager}
        currentUserId={currentUserId}
        defaultValues={toFormValues(editingItem)}
        onCancel={() => setEditingItem(null)}
        onSuccess={() => setEditingItem(null)}
      />
    );
  }

  if (items.length === 0) {
    return (
      <Card className="py-10 text-center">
        <p className="text-body-sm text-smoke-gray">지급 내역이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="bg-[#2c3e6b] text-white">
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap w-12">연번</th>
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">거래처</th>
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">항목</th>
            <th className="px-4 py-3 text-left font-semibold">내용</th>
            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">금액</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">지급예정일</th>
            {isManager && <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">담당</th>}
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">계산서</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">상태</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, idx) => {
            const typeLabel = DISBURSEMENT_TYPE_LABELS[item.itemType as DisbursementTypeValue] ?? item.itemType;
            const scheduled = format(new Date(item.scheduledDate), "yyyy.MM.dd", { locale: ko });
            return (
              <tr key={item.id} className="hover:bg-hint-of-sky transition-colors">
                <td className="px-4 py-3 text-center text-smoke-gray">{idx + 1}</td>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-midnight-charcoal">{item.vendorName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="neutral">{typeLabel}</Badge>
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate text-smoke-gray" title={item.description}>
                  {item.description}
                  {item.note && <span className="ml-1 text-caption text-smoke-gray/70">({item.note})</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{formatKRW(item.amount)}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap text-smoke-gray">{scheduled}</td>
                {isManager && (
                  <td className="px-4 py-3 text-center whitespace-nowrap text-smoke-gray">
                    {item.assignee.name}
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <TaxInvoiceStatusBadge status={item.taxInvoiceStatus as TaxInvoiceStatusValue} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={item.isPaid ? "positive" : "attention"}>
                    {item.isPaid ? "지급완료" : "미지급"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      type="button"
                      variant={item.isPaid ? "outline" : "default"}
                      size="sm"
                      className="h-7 text-caption whitespace-nowrap"
                      disabled={loadingId === item.id}
                      onClick={() => togglePaid(item)}
                    >
                      {item.isPaid ? "미지급" : "지급완료"}
                    </Button>
                    <Button type="button" variant="outline" size="icon-sm"
                      onClick={() => setEditingItem(item)} disabled={loadingId === item.id}>
                      <Pencil size={13} />
                    </Button>
                    {!item.isPaid && (
                      <Button type="button" variant="ghost" size="icon-sm"
                        className="text-smoke-gray hover:text-rich-plum"
                        onClick={() => handleDelete(item.id)} disabled={loadingId === item.id}>
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
