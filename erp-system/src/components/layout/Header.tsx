"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
}

export function Header({ title, subtitle, showBack, actions }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between h-[56px] px-6 bg-white border-b border-[#e8e8e8] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-[#e9ebf0] text-[#b3b3b3] hover:text-[#292d34] shrink-0"
            onClick={() => router.back()}
          >
            <ChevronLeft size={16} />
          </Button>
        )}
        <div className="min-w-0">
          <h1
            className="text-[16px] font-semibold text-[#090c1d] tracking-[-0.26px] leading-tight truncate"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-[#b3b3b3] tracking-[-0.14px] truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <NotificationBell />
      </div>
    </header>
  );
}
