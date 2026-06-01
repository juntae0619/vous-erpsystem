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
    <header className="flex h-14 shrink-0 items-center justify-between px-6" style={{ backgroundColor: "#1a7a5e" }}>
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-white/70 hover:text-white"
            onClick={() => router.back()}
          >
            <ChevronLeft size={16} />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-heading text-page-title text-white">{title}</h1>
          {subtitle && (
            <p className="truncate text-caption text-white/70">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <NotificationBell />
      </div>
    </header>
  );
}
