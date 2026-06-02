"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContractAlertBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const sendAlert = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contract/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "발송 실패");
        return;
      }
      if (json.data.sent) {
        toast.success(`알림 메일 발송 (${json.data.count}건)`);
      } else {
        toast.info(json.data.message ?? "발송 대상 없음");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-[#f8f9fb] px-4 py-3">
      <Button
        type="button"
        className="gap-1.5 h-9"
        disabled={loading}
        onClick={sendAlert}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        📧 지금 메일 보내기
      </Button>
      <p className="text-caption text-smoke-gray">
        청구 예정일이 <strong>15일 이내</strong>인 계약을 메일 설정의 받는 주소로 발송합니다.
      </p>
    </div>
  );
}
