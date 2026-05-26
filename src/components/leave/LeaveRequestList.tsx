"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LEAVE_TYPE_LABELS } from "@/lib/leave-types";

interface LeaveRequest {
  id: string;
  type: string;
  halfDayType: string | null;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  user?: { name: string; team: string | null };
  approver?: { name: string } | null;
}

interface Props {
  requests: LeaveRequest[];
  showUser?: boolean; // 관리자 뷰에서 사용자명 표시
}

const HALF_DAY_MAP: Record<string, string> = {
  AM: "오전",
  PM: "오후",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "pending" | "positive" | "attention" }> = {
  PENDING:  { label: "대기", variant: "pending" },
  APPROVED: { label: "승인", variant: "positive" },
  REJECTED: { label: "반려", variant: "attention" },
};

export function LeaveRequestList({ requests, showUser = false }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    if (!confirm("휴가 신청을 취소하시겠습니까?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/leave/requests/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "취소 실패"); return; }
      toast.success("휴가 신청이 취소되었습니다");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <Card className="py-10 text-center">
        <p className="text-body-sm text-smoke-gray">휴가 신청 내역이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
        const typeLabel = LEAVE_TYPE_LABELS[req.type as keyof typeof LEAVE_TYPE_LABELS] ?? req.type;
        const halfLabel = req.halfDayType ? ` (${HALF_DAY_MAP[req.halfDayType]})` : "";
        const start = format(new Date(req.startDate), "yyyy.MM.dd", { locale: ko });
        const end = format(new Date(req.endDate), "yyyy.MM.dd", { locale: ko });
        const dateLabel = start === end ? start : `${start} ~ ${end}`;

        return (
          <Card key={req.id}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-body-sm font-semibold text-deep-space-charcoal">
                    {typeLabel}{halfLabel}
                  </span>
                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                  {showUser && req.user && (
                    <span className="text-caption text-smoke-gray">
                      {req.user.name} · {req.user.team}
                    </span>
                  )}
                </div>
                <p className="text-caption text-midnight-charcoal">
                  {dateLabel} · {Number(req.days)}일
                </p>
                <p className="mt-0.5 truncate text-caption text-smoke-gray">{req.reason}</p>
                {req.status === "REJECTED" && req.rejectionReason && (
                  <p className="mt-1 text-caption text-rich-plum">반려 사유: {req.rejectionReason}</p>
                )}
                {req.approver && req.status === "APPROVED" && (
                  <p className="mt-1 text-caption text-smoke-gray">승인: {req.approver.name}</p>
                )}
              </div>

              {req.status === "PENDING" && !showUser && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-smoke-gray hover:text-rich-plum"
                  onClick={() => handleCancel(req.id)}
                  disabled={deletingId === req.id}
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
