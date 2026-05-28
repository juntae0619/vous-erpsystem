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
          variant="outline"
          className="gap-1.5"
          onClick={() => setShowUpload(true)}
        >
          <Upload size={14} />
          Excel 업로드
        </Button>
        <Link
          href="/contract/new"
          className={cn(buttonVariants(), "gap-1.5")}
        >
          <Plus size={14} />
          계약 등록
        </Link>
      </div>

      {showUpload && (
        <ContractExcelUpload onClose={() => setShowUpload(false)} />
      )}
    </>
  );
}
