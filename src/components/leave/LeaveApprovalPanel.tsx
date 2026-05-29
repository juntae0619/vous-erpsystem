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
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="bg-[#2c3e6b] text-white">
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap w-12">연번</th>
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">신청자</th>
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">종류</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">기간</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">일수</th>
            <th className="px-4 py-3 text-left font-semibold">사유</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">처리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
      {requests.map((req, idx) => {
        const typeLabel =
          LEAVE_TYPE_LABELS[req.type as keyof typeof LEAVE_TYPE_LABELS] ?? req.type;
        const halfLabel = req.halfDayType ? ` (${HALF_MAP[req.halfDayType]})` : "";
        const start = format(new Date(req.startDate), "M월 d일", { locale: ko });
        const end = format(new Date(req.endDate), "M월 d일", { locale: ko });
        const dateLabel = start === end ? start : `${start} ~ ${end}`;
        const isRejecting = rejectingId === req.id;
        const isOwnRequest = currentUserId === req.user.id;

        return (
          <>
            <tr key={req.id} className="hover:bg-hint-of-sky transition-colors">
              <td className="px-4 py-3 text-center text-smoke-gray">{idx + 1}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="font-medium text-midnight-charcoal">
                  {req.user.name}
                  {isOwnRequest && <span className="ml-1.5 text-caption text-smoke-gray">(본인)</span>}
                </p>
                <p className="text-caption text-smoke-gray">{req.user.position} · {req.user.team}</p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-medium">{typeLabel}{halfLabel}</td>
              <td className="px-4 py-3 text-center whitespace-nowrap text-smoke-gray">{dateLabel}</td>
              <td className="px-4 py-3 text-center">{Number(req.days)}일</td>
              <td className="px-4 py-3 max-w-[200px] truncate text-smoke-gray">{req.reason}</td>
              <td className="px-4 py-3">
                {!isRejecting && (
                  <div className="flex items-center justify-center gap-1.5">
                    <Button size="sm" className="h-7 gap-1"
                      onClick={() => handleAction(req.id, "APPROVED")} disabled={loadingId === req.id}>
                      <Check size={12} /> 승인
                    </Button>
                    <Button variant="destructive" size="sm" className="h-7 gap-1"
                      onClick={() => setRejectingId(req.id)} disabled={loadingId === req.id}>
                      <X size={12} /> 반려
                    </Button>
                  </div>
                )}
              </td>
            </tr>
            {isRejecting && (
              <tr key={`${req.id}-reject`} className="bg-red-50">
                <td colSpan={7} className="px-4 py-3">
                  <div className="flex gap-2">
                    <Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="반려 사유 입력" className="h-9 flex-1 text-body-sm" autoFocus />
                    <Button variant="destructive"
                      onClick={() => handleAction(req.id, "REJECTED")} disabled={loadingId === req.id}>
                      반려 확인
                    </Button>
                    <Button variant="outline"
                      onClick={() => { setRejectingId(null); setRejectionReason(""); }} disabled={loadingId === req.id}>
                      취소
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </>
        );
      })}
        </tbody>
      </table>
    </div>
  );
}
