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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-canvas-white px-6">
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-smoke-gray hover:text-midnight-charcoal"
            onClick={() => router.back()}
          >
            <ChevronLeft size={16} />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-heading text-page-title">{title}</h1>
          {subtitle && (
            <p className="truncate text-caption text-smoke-gray">{subtitle}</p>
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
