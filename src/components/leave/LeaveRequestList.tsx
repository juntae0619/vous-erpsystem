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

const TYPE_MAP: Record<string, string> = {
  ANNUAL: "연차",
  HALF_DAY: "반차",
  SICK: "병가",
  PUBLIC: "공가",
  SPECIAL: "경조사",
};

const HALF_DAY_MAP: Record<string, string> = {
  AM: "오전",
  PM: "오후",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:  { label: "대기", className: "bg-[#fff7ed] text-orange-600 border-orange-200" },
  APPROVED: { label: "승인", className: "bg-[#edf6fd] text-[#7b68ee] border-[#d4d0f9]" },
  REJECTED: { label: "반려", className: "bg-[#fef2f2] text-red-600 border-red-200" },
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
      <Card className="p-8 shadow-card border-[#e8e8e8] rounded-xl text-center">
        <p className="text-[13px] text-[#b3b3b3]">휴가 신청 내역이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
        const typeLabel = TYPE_MAP[req.type] ?? req.type;
        const halfLabel = req.halfDayType ? ` (${HALF_DAY_MAP[req.halfDayType]})` : "";
        const start = format(new Date(req.startDate), "yyyy.MM.dd", { locale: ko });
        const end = format(new Date(req.endDate), "yyyy.MM.dd", { locale: ko });
        const dateLabel = start === end ? start : `${start} ~ ${end}`;

        return (
          <Card key={req.id} className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#090c1d]">
                    {typeLabel}{halfLabel}
                  </span>
                  <Badge
                    className={`text-[11px] px-2 py-0.5 border rounded-full font-medium ${status.className}`}
                  >
                    {status.label}
                  </Badge>
                  {showUser && req.user && (
                    <span className="text-[12px] text-[#b3b3b3]">
                      {req.user.name} · {req.user.team}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#292d34]">
                  {dateLabel} · {Number(req.days)}일
                </p>
                <p className="text-[12px] text-[#b3b3b3] mt-0.5 truncate">{req.reason}</p>
                {req.status === "REJECTED" && req.rejectionReason && (
                  <p className="text-[12px] text-red-500 mt-1">반려 사유: {req.rejectionReason}</p>
                )}
                {req.approver && req.status === "APPROVED" && (
                  <p className="text-[11px] text-[#b3b3b3] mt-1">승인: {req.approver.name}</p>
                )}
              </div>

              {req.status === "PENDING" && !showUser && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 shrink-0 rounded-lg hover:bg-red-50 text-[#b3b3b3] hover:text-red-500"
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
