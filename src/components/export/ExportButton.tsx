"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ExportButtonProps {
  href: string;
  label?: string;
  className?: string;
}

export function ExportButton({ href, label = "Excel", className }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "내보내기 실패");
        return;
      }

      const disposition = res.headers.get("content-disposition") ?? "";
      let fileName = label + ".xlsx";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
      if (match) {
        fileName = decodeURIComponent(match[1].replace(/['"]/g, ""));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${fileName} 다운로드 완료`);
    } catch {
      toast.error("내보내기 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={`gap-1.5 ${className ?? ""}`}
      onClick={handleExport}
      disabled={loading}
    >
      <Download size={14} />
      {loading ? "처리 중..." : label}
    </Button>
  );
}
