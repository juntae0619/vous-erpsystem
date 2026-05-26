"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ExportButton } from "@/components/export/ExportButton";
import { ContractExcelUpload } from "@/components/contract/ContractExcelUpload";
import { cn } from "@/lib/utils";

interface Props {
  exportHref: string;
}

export function ContractPageActions({ exportHref }: Props) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <ExportButton href={exportHref} label="Excel" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[12px] border border-[#e8e8e8] rounded-lg px-3 gap-1.5 hover:bg-[#f0eeff] hover:border-[#c4bdff] text-[#292d34]"
          onClick={() => setShowUpload(true)}
        >
          <Upload size={13} />
          Excel 업로드
        </Button>
        <Link
          href="/contract/new"
          className={cn(
            buttonVariants(),
            "h-8 bg-[#202023] hover:bg-[#292d34] text-white text-[13px] rounded-lg px-3 gap-1.5"
          )}
        >
          <Plus size={13} />
          계약 등록
        </Link>
      </div>

      {showUpload && (
        <ContractExcelUpload onClose={() => setShowUpload(false)} />
      )}
    </>
  );
}
