"use client";

import Link from "next/link";
import Image from "next/image";
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
  Shield,
  BookUser,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

type NavGroup = {
  group?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "근태",
    items: [
      { label: "출퇴근 관리", href: "/attendance", icon: Clock },
      { label: "휴가 관리",   href: "/leave",      icon: CalendarDays },
    ],
  },
  {
    group: "업무",
    items: [
      { label: "전자결재",     href: "/approval",         icon: FileText },
      { label: "계약·수금",   href: "/contract",          icon: Building2 },
      { label: "지급 관리",   href: "/disbursement",      icon: Wallet },
      { label: "지자체 연락처", href: "/local-gov-contacts", icon: BookUser },
    ],
  },
  {
    group: "시스템",
    items: [
      { label: "사용자 관리", href: "/users",       icon: Users,      adminOnly: true },
      { label: "감사 로그",   href: "/admin/audit", icon: Shield,     adminOnly: true },
      { label: "내 프로필",   href: "/profile",     icon: UserCircle },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userPosition?: string;
}

export function Sidebar({ userRole, userName, userPosition }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="flex min-h-screen w-[230px] shrink-0 flex-col"
      style={{ backgroundColor: "#f0ede6" }}
    >
      {/* 로고 */}
      <Link
        href="/dashboard"
        className="flex flex-col items-center px-5 pt-6 pb-4 transition-opacity hover:opacity-80"
      >
        <Image
          src="/logo.png"
          alt="VOUCHER SERVICE"
          width={120}
          height={120}
          className="object-contain"
          priority
        />
      </Link>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || userRole === "ADMIN"
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.group && (
                <p
                  className="mb-1 px-3 text-caption font-semibold uppercase tracking-wider"
                  style={{ color: "#8a9490" }}
                >
                  {group.group}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-all",
                        isActive
                          ? "text-white shadow-sm"
                          : "hover:bg-black/5"
                      )}
                      style={
                        isActive
                          ? { backgroundColor: "#1a7a5e", color: "#fff" }
                          : { color: "#2d4a3e" }
                      }
                    >
                      <Icon
                        size={16}
                        className="shrink-0"
                        style={{ color: isActive ? "#fff" : "#1a9e7e" }}
                      />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* 하단 유저 */}
      <div
        className="border-t px-3 py-4"
        style={{ borderColor: "#ddd8ce" }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-body-sm font-bold text-white"
            style={{ backgroundColor: "#1a7a5e" }}
          >
            {userName?.[0] ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold" style={{ color: "#1a2e28" }}>
              {userName ?? "사용자"}
            </p>
            <p className="truncate text-caption" style={{ color: "#8a9490" }}>
              {userPosition ?? userRole ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-body-sm font-medium transition-colors hover:bg-black/5"
          style={{ color: "#8a9490" }}
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
