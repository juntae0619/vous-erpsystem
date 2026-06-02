"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

interface Props {
  userRole?: string;
  userName?: string;
  userPosition?: string;
}

export function MobileSidebarWrapper({ userRole, userName, userPosition }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 페이지 이동 시 자동으로 닫기
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 라우트 변경 시 사이드바 닫기
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg shadow-md md:hidden"
        style={{ backgroundColor: "#1a7a5e" }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={18} color="white" /> : <Menu size={18} color="white" />}
      </button>

      {/* 모바일 오버레이 배경 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 사이드바 - 데스크탑은 항상 표시, 모바일은 슬라이드 */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 md:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar
          userRole={userRole}
          userName={userName}
          userPosition={userPosition}
        />
      </div>
    </>
  );
}
