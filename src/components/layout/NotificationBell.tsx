"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HEADER_ICON_BTN_CLASS } from "@/components/layout/header-icon-styles";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  APPROVAL_SUBMITTED: "📋",
  APPROVAL_APPROVED: "✅",
  APPROVAL_REJECTED: "❌",
  LEAVE_APPROVED: "🏖️",
  LEAVE_REJECTED: "🚫",
  BILLING_OVERDUE: "⚠️",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.data.notifications);
      setUnreadCount(json.data.unreadCount);
    } catch {
      // silent
    }
  }, []);

  // 초기 로드 + 30초마다 폴링
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 알림 로드
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // 외부 클릭으로 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PUT" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) await markOneRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        className={`${HEADER_ICON_BTN_CLASS} relative`}
        aria-label="알림"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
      >
        <Bell size={22} strokeWidth={2} />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-[10px] font-bold bg-[#ff6b6b] text-white border-2 border-[#1a7a5e] rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[340px] bg-white border border-[#e8e8e8] rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8]">
            <span
              className="text-body-sm font-semibold text-[#090c1d]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              알림
              {unreadCount > 0 && (
                <span className="ml-1.5 text-caption font-medium text-[#7b68ee]">
                  {unreadCount}개 미읽음
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-caption text-[#7b68ee] hover:text-[#6a58de] transition-colors"
              >
                <CheckCheck size={13} />
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto text-[#e8e8e8] mb-2" />
                <p className="text-body-sm text-[#b3b3b3]">새 알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[#f0f0f0] last:border-0 transition-colors hover:bg-[#f8f9fb] flex items-start gap-3 ${
                    !n.isRead ? "bg-[#faf9ff]" : ""
                  }`}
                >
                  <span className="text-[18px] shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-body-sm truncate ${!n.isRead ? "font-semibold text-[#090c1d]" : "font-medium text-[#292d34]"}`}>
                        {n.title}
                      </p>
                      {n.link && <ExternalLink size={11} className="shrink-0 text-[#b3b3b3]" />}
                    </div>
                    <p className="text-caption text-[#b3b3b3] mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-caption text-[#d0d0d0] mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ko })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#7b68ee] shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
