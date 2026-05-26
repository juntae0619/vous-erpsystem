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
    <div className="space-y-2">
      {items.map((item) => {
        const typeLabel =
          DISBURSEMENT_TYPE_LABELS[item.itemType as DisbursementTypeValue] ??
          item.itemType;
        const scheduled = format(new Date(item.scheduledDate), "yyyy.MM.dd", {
          locale: ko,
        });

        return (
          <Card key={item.id} className="gap-3 overflow-visible p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-body-sm font-semibold text-deep-space-charcoal">
                    {item.vendorName}
                  </span>
                  <Badge variant="neutral">{typeLabel}</Badge>
                  <Badge variant={item.isPaid ? "positive" : "attention"}>
                    {item.isPaid ? "지급완료" : "미지급"}
                  </Badge>
                  <TaxInvoiceStatusBadge
                    status={item.taxInvoiceStatus as TaxInvoiceStatusValue}
                  />
                </div>
                <p className="text-body-sm text-midnight-charcoal">{item.description}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption text-smoke-gray">
                  <span>{formatKRW(item.amount)}</span>
                  <span>예정일 {scheduled}</span>
                  {item.isPaid && item.paidDate && (
                    <span>
                      지급일{" "}
                      {format(new Date(item.paidDate), "yyyy.MM.dd", { locale: ko })}
                    </span>
                  )}
                  {isManager && (
                    <span>
                      담당 {item.assignee.name}
                      {item.assignee.team ? ` · ${item.assignee.team}` : ""}
                    </span>
                  )}
                  {item.taxInvoiceNumber && (
                    <span>계산서 {item.taxInvoiceNumber}</span>
                  )}
                </div>
                {item.note && (
                  <p className="mt-1 text-caption text-smoke-gray">{item.note}</p>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                <Button
                  type="button"
                  variant={item.isPaid ? "outline" : "default"}
                  size="sm"
                  className="h-8 text-caption"
                  disabled={loadingId === item.id}
                  onClick={() => togglePaid(item)}
                >
                  {item.isPaid ? "미지급으로" : "지급완료"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() => setEditingItem(item)}
                  disabled={loadingId === item.id}
                >
                  <Pencil size={13} />
                </Button>
                {!item.isPaid && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-smoke-gray hover:text-rich-plum"
                    onClick={() => handleDelete(item.id)}
                    disabled={loadingId === item.id}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
