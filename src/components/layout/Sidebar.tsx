"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  FileText,
  Building2,
  Wallet,
  Users,
  UserCircle,
  LogOut,
  ChevronRight,
  Shield,
  BookUser,
} from "lucide-react";

const navItems = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "출퇴근 관리", href: "/attendance", icon: Clock },
  { label: "휴가 관리", href: "/leave", icon: CalendarDays },
  { label: "전자결재", href: "/approval", icon: FileText },
  { label: "계약·수금 관리", href: "/contract", icon: Building2 },
  { label: "지급 관리", href: "/disbursement", icon: Wallet },
  { label: "지자체 연락처", href: "/local-gov-contacts", icon: BookUser },
  { label: "사용자 관리", href: "/users", icon: Users, adminOnly: true },
  { label: "감사 로그", href: "/admin/audit", icon: Shield, adminOnly: true },
  { label: "내 프로필", href: "/profile", icon: UserCircle },
];

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userPosition?: string;
}

export function Sidebar({ userRole, userName, userPosition }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-[220px] shrink-0 flex-col border-r border-border bg-canvas-white">
      <Link
        href="/dashboard"
        className="flex h-14 items-center gap-2.5 border-b border-border px-5 transition-colors hover:bg-hint-of-sky"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-buttons)] bg-dark-onyx">
          <span className="font-heading text-body-sm font-bold text-white">V</span>
        </div>
        <span className="font-heading text-body-sm font-bold tracking-body text-deep-space-charcoal">
          VOUS ERP
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          if (item.adminOnly && userRole !== "ADMIN") return null;

          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-[var(--radius-buttons)] px-3 py-2 text-body-sm font-medium transition-all",
                isActive
                  ? "nav-link-active"
                  : "nav-link hover:bg-hint-of-sky"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive
                    ? "text-deep-violet"
                    : "text-smoke-gray group-hover:text-midnight-charcoal"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight size={12} className="text-deep-violet opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-1 flex items-center gap-2.5 rounded-[var(--radius-buttons)] px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hint-of-sky text-body-sm font-semibold text-midnight-charcoal">
            {userName?.[0] ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold tracking-body-sm text-deep-space-charcoal">
              {userName ?? "사용자"}
            </p>
            <p className="truncate text-caption text-smoke-gray">
              {userPosition ?? userRole ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="nav-link flex w-full items-center gap-2.5 rounded-[var(--radius-buttons)] px-3 py-2 text-body-sm text-smoke-gray hover:bg-hint-of-sky"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
