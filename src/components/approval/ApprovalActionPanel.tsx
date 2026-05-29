"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  documentId: string;
  canApprove: boolean;
  currentUserRole: string;
  isCurrentStep: boolean;
}

export function ApprovalActionPanel({ documentId, canApprove, currentUserRole, isCurrentStep }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!canApprove || !isCurrentStep) return null;

  async function submit(a: "APPROVED" | "REJECTED", finalDecision = false) {
    if (a === "REJECTED" && !comment.trim()) {
      toast.error("반려 사유를 입력해주세요"); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/approval/${documentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: a, comment, isFinalDecision: finalDecision }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "처리 실패"); return; }
      if (a === "APPROVED") {
        toast.success(finalDecision ? "전결 처리되었습니다" : "승인되었습니다");
      } else {
        toast.success("반려되었습니다");
      }
      router.refresh();
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  return (
    <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
      <h3
        className="text-[15px] font-semibold text-[#090c1d] mb-4"
        style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
      >
        결재 처리
      </h3>

      {action === "REJECTED" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-body-sm font-medium text-[#292d34]">반려 사유</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="반려 사유를 입력해주세요"
              className="text-body-sm border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee] resize-none min-h-[80px]"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => submit("REJECTED")}
              disabled={loading}
            >
              반려 확인
            </Button>
            <Button
              variant="outline"
              className="h-9 text-body-sm border-[#e8e8e8] rounded-lg"
              onClick={() => { setAction(null); setComment(""); }}
              disabled={loading}
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 의견 입력 (선택) */}
          <div className="space-y-1.5">
            <Label className="text-body-sm font-medium text-[#292d34]">의견 (선택)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="결재 의견을 남겨주세요 (선택)"
              className="text-body-sm border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee] resize-none min-h-[60px]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              className="flex-1"
              onClick={() => submit("APPROVED")}
              disabled={loading}
            >
              <Check size={13} className="mr-1.5" />
              승인
            </Button>
            {/* 전결 버튼은 MANAGER 이상에게만 표시 */}
            {(currentUserRole === "MANAGER" || currentUserRole === "ADMIN") && (
              <Button
                variant="outline"
                className="flex-1 h-9 text-body-sm border-[#7b68ee] text-[#7b68ee] hover:bg-[#edf6fd] rounded-lg"
                onClick={() => submit("APPROVED", true)}
                disabled={loading}
              >
                <FastForward size={13} className="mr-1.5" />
                전결
              </Button>
            )}
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => setAction("REJECTED")}
              disabled={loading}
            >
              <X size={13} className="mr-1.5" />
              반려
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
