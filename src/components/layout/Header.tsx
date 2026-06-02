"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { HEADER_ICON_BTN_CLASS } from "@/components/layout/header-icon-styles";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export { HEADER_ICON_BTN_CLASS };

export function HeaderIconLink({
  href,
  children,
  "aria-label": ariaLabel,
}: {
  href: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link href={href} className={HEADER_ICON_BTN_CLASS} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
}

export function Header({ title, subtitle, showBack, actions }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between pl-14 pr-6 md:pl-6" style={{ backgroundColor: "#1a7a5e" }}>
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-white/80 hover:bg-white/15 hover:text-white"
            onClick={() => router.back()}
          >
            <ChevronLeft size={20} />
          </Button>
        )}
        <div className="min-w-0">
          <h1
            className="truncate font-heading font-bold"
            style={{ color: "#fff", fontSize: "1.125rem", letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-caption" style={{ color: "rgba(255,255,255,0.75)" }}>{subtitle}</p>
          )}
        </div>
      </div>

      <div className={cn("flex shrink-0 items-center", actions ? "gap-2.5" : "")}>
        {actions}
        <NotificationBell />
      </div>
    </header>
  );
}
