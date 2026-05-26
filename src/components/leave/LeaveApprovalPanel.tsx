"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createdAt: string;
  user: { id: string; name: string; team: string | null; position: string | null };
}

interface Props {
  requests: LeaveRequest[];
  currentUserId?: string;
}

const HALF_MAP: Record<string, string> = { AM: "오전", PM: "오후" };

export function LeaveApprovalPanel({ requests, currentUserId }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  async function handleAction(id: string, action: "APPROVED" | "REJECTED") {
    if (action === "REJECTED" && !rejectionReason.trim()) {
      toast.error("반려 사유를 입력해주세요");
      return;
    }
    setLoadingId(id);
    try {
      const res = await fetch(`/api/leave/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "REJECTED" ? rejectionReason : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "처리 실패");
        return;
      }
      toast.success(action === "APPROVED" ? "승인되었습니다" : "반려되었습니다");
      setRejectingId(null);
      setRejectionReason("");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <Card className="py-8 text-center">
        <p className="text-body-sm text-smoke-gray">승인 대기 중인 휴가 신청이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const typeLabel =
          LEAVE_TYPE_LABELS[req.type as keyof typeof LEAVE_TYPE_LABELS] ?? req.type;
        const halfLabel = req.halfDayType ? ` (${HALF_MAP[req.halfDayType]})` : "";
        const start = format(new Date(req.startDate), "M월 d일", { locale: ko });
        const end = format(new Date(req.endDate), "M월 d일", { locale: ko });
        const dateLabel = start === end ? start : `${start} ~ ${end}`;
        const isRejecting = rejectingId === req.id;
        const isOwnRequest = currentUserId === req.user.id;

        return (
          <Card key={req.id} className="gap-3 overflow-visible p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hint-of-sky text-body-sm font-semibold text-midnight-charcoal">
                {req.user.name[0]}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-body-sm font-semibold text-deep-space-charcoal">
                    {req.user.name}
                  </span>
                  <span className="text-caption text-smoke-gray">
                    {req.user.position} · {req.user.team}
                  </span>
                  {isOwnRequest && (
                    <span className="rounded-full bg-hint-of-sky px-2 py-0.5 text-caption text-smoke-gray">
                      본인 신청
                    </span>
                  )}
                </div>
                <p className="text-body-sm text-midnight-charcoal">
                  {typeLabel}
                  {halfLabel} · {dateLabel} ({Number(req.days)}일)
                </p>
                <p className="mt-0.5 text-caption text-smoke-gray">{req.reason}</p>
              </div>
            </div>

            {isRejecting ? (
              <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="반려 사유 입력"
                  className="h-9 flex-1 text-body-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 sm:flex-none"
                    onClick={() => handleAction(req.id, "REJECTED")}
                    disabled={loadingId === req.id}
                  >
                    반려 확인
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectionReason("");
                    }}
                    disabled={loadingId === req.id}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 border-t border-border pt-3">
                <Button
                  className="flex-1"
                  onClick={() => handleAction(req.id, "APPROVED")}
                  disabled={loadingId === req.id}
                >
                  <Check size={14} />
                  승인
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setRejectingId(req.id)}
                  disabled={loadingId === req.id}
                >
                  <X size={14} />
                  반려
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
