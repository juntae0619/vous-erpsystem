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
  user: { name: string; team: string | null; position: string | null };
}

interface Props {
  requests: LeaveRequest[];
}

const TYPE_MAP: Record<string, string> = {
  ANNUAL: "연차", HALF_DAY: "반차", SICK: "병가", PUBLIC: "공가", SPECIAL: "경조사",
};
const HALF_MAP: Record<string, string> = { AM: "오전", PM: "오후" };

export function LeaveApprovalPanel({ requests }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  async function handleAction(id: string, action: "APPROVED" | "REJECTED") {
    if (action === "REJECTED" && !rejectionReason.trim()) {
      toast.error("반려 사유를 입력해주세요"); return;
    }
    setLoadingId(id);
    try {
      const res = await fetch(`/api/leave/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: action === "REJECTED" ? rejectionReason : undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "처리 실패"); return; }
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
      <Card className="p-6 shadow-card border-[#e8e8e8] rounded-xl text-center">
        <p className="text-[13px] text-[#b3b3b3]">승인 대기 중인 휴가 신청이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const typeLabel = TYPE_MAP[req.type] ?? req.type;
        const halfLabel = req.halfDayType ? ` (${HALF_MAP[req.halfDayType]})` : "";
        const start = format(new Date(req.startDate), "M월 d일", { locale: ko });
        const end = format(new Date(req.endDate), "M월 d일", { locale: ko });
        const dateLabel = start === end ? start : `${start} ~ ${end}`;
        const isRejecting = rejectingId === req.id;

        return (
          <Card key={req.id} className="p-4 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-start gap-3">
              {/* 사용자 아바타 */}
              <div className="w-8 h-8 rounded-full bg-[#e9ebf0] flex items-center justify-center text-[13px] font-semibold text-[#292d34] shrink-0">
                {req.user.name[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#090c1d]">{req.user.name}</span>
                  <span className="text-[11px] text-[#b3b3b3]">
                    {req.user.position} · {req.user.team}
                  </span>
                </div>
                <p className="text-[12px] text-[#292d34]">
                  {typeLabel}{halfLabel} · {dateLabel} ({Number(req.days)}일)
                </p>
                <p className="text-[12px] text-[#b3b3b3] mt-0.5">{req.reason}</p>

                {/* 반려 사유 입력 */}
                {isRejecting && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="반려 사유 입력"
                      className="h-8 text-[12px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 text-[12px] bg-red-500 hover:bg-red-600 text-white rounded-lg px-3"
                      onClick={() => handleAction(req.id, "REJECTED")}
                      disabled={loadingId === req.id}
                    >
                      반려
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-[12px] rounded-lg px-2"
                      onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                    >
                      취소
                    </Button>
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              {!isRejecting && (
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 rounded-lg hover:bg-[#edf6fd] text-[#b3b3b3] hover:text-[#7b68ee]"
                    onClick={() => handleAction(req.id, "APPROVED")}
                    disabled={loadingId === req.id}
                    title="승인"
                  >
                    <Check size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 rounded-lg hover:bg-red-50 text-[#b3b3b3] hover:text-red-500"
                    onClick={() => setRejectingId(req.id)}
                    disabled={loadingId === req.id}
                    title="반려"
                  >
                    <X size={13} />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
