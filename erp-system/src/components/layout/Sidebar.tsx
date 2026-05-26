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
  Users,
  UserCircle,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";

const navItems = [
  {
    label: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "출퇴근 관리",
    href: "/attendance",
    icon: Clock,
  },
  {
    label: "휴가 관리",
    href: "/leave",
    icon: CalendarDays,
  },
  {
    label: "전자결재",
    href: "/approval",
    icon: FileText,
  },
  {
    label: "계약·수금 관리",
    href: "/contract",
    icon: Building2,
  },
  {
    label: "사용자 관리",
    href: "/users",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "감사 로그",
    href: "/admin/audit",
    icon: Shield,
    adminOnly: true,
  },
  {
    label: "내 프로필",
    href: "/profile",
    icon: UserCircle,
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
    <aside className="flex flex-col w-[220px] min-h-screen bg-white border-r border-[#e8e8e8] shrink-0">
      {/* 로고 */}
      <div className="flex items-center gap-2.5 px-5 h-[56px] border-b border-[#e8e8e8]">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#202023]">
          <span
            className="text-white text-[13px] font-bold"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            V
          </span>
        </div>
        <span
          className="text-[15px] font-bold text-[#090c1d] tracking-[-0.26px]"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
        >
          바우처 ERP
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
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
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group",
                isActive
                  ? "bg-[#edf6fd] text-[#7b68ee]"
                  : "text-[#292d34] hover:bg-[#e9ebf0] hover:text-[#090c1d]"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-[#7b68ee]" : "text-[#b3b3b3] group-hover:text-[#292d34]"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight size={12} className="text-[#7b68ee] opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t border-[#e8e8e8] p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#e9ebf0] text-[#292d34] text-[13px] font-semibold shrink-0">
            {userName?.[0] ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#090c1d] truncate tracking-[-0.15px]">
              {userName ?? "사용자"}
            </p>
            <p className="text-[11px] text-[#b3b3b3] truncate">
              {userPosition ?? userRole ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-[#b3b3b3] hover:bg-[#e9ebf0] hover:text-[#292d34] transition-colors"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
