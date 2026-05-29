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
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="bg-[#2c3e6b] text-white">
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap w-12">연번</th>
            {showUser && <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">신청자</th>}
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">종류</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">기간</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">일수</th>
            <th className="px-4 py-3 text-left font-semibold">사유</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">상태</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((req, idx) => {
            const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
            const typeLabel = LEAVE_TYPE_LABELS[req.type as keyof typeof LEAVE_TYPE_LABELS] ?? req.type;
            const halfLabel = req.halfDayType ? ` (${HALF_DAY_MAP[req.halfDayType]})` : "";
            const start = format(new Date(req.startDate), "yyyy.MM.dd", { locale: ko });
            const end = format(new Date(req.endDate), "yyyy.MM.dd", { locale: ko });
            const dateLabel = start === end ? start : `${start} ~ ${end}`;
            return (
              <tr key={req.id} className="hover:bg-hint-of-sky transition-colors">
                <td className="px-4 py-3 text-center text-smoke-gray">{idx + 1}</td>
                {showUser && req.user && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-midnight-charcoal">{req.user.name}</p>
                    <p className="text-caption text-smoke-gray">{req.user.team}</p>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap font-medium text-midnight-charcoal">
                  {typeLabel}{halfLabel}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap text-smoke-gray">{dateLabel}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">{Number(req.days)}일</td>
                <td className="px-4 py-3 max-w-[180px]">
                  <p className="truncate text-smoke-gray">{req.reason}</p>
                  {req.status === "REJECTED" && req.rejectionReason && (
                    <p className="text-caption text-rich-plum">반려: {req.rejectionReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  {req.status === "PENDING" && !showUser && (
                    <Button variant="ghost" size="icon-sm"
                      className="text-smoke-gray hover:text-rich-plum"
                      onClick={() => handleCancel(req.id)} disabled={deletingId === req.id}>
                      <Trash2 size={13} />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
