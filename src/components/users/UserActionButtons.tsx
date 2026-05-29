"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, KeyRound, Power } from "lucide-react";

interface UserActionButtonsProps {
  userId: string;
  isActive: boolean;
}

export function UserActionButtons({ userId, isActive }: UserActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) { toast.error("변경에 실패했습니다"); return; }
      toast.success(isActive ? "계정이 비활성화되었습니다" : "계정이 활성화되었습니다");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    const newPw = prompt("새 비밀번호를 입력해주세요 (8자 이상)");
    if (!newPw || newPw.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    const res = await fetch(`/api/users/${userId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: newPw }),
    });
    if (!res.ok) { toast.error("초기화에 실패했습니다"); return; }
    toast.success("비밀번호가 초기화되었습니다");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-[#b3b3b3] hover:bg-[#e9ebf0]"
          />
        }
      >
        <MoreHorizontal size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl border-[#e8e8e8] shadow-card">
        <DropdownMenuItem
          onClick={() => (window.location.href = `/users/${userId}`)}
          className="flex items-center gap-2 text-body-sm cursor-pointer rounded-lg"
        >
          <Pencil size={13} className="text-[#b3b3b3]" />
          정보 수정
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={resetPassword}
          className="flex items-center gap-2 text-body-sm cursor-pointer rounded-lg"
        >
          <KeyRound size={13} className="text-[#b3b3b3]" />
          비밀번호 초기화
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#e8e8e8]" />
        <DropdownMenuItem
          onClick={toggleActive}
          className={`flex items-center gap-2 text-body-sm cursor-pointer rounded-lg ${
            isActive ? "text-red-500" : "text-green-600"
          }`}
        >
          <Power size={13} />
          {isActive ? "계정 비활성화" : "계정 활성화"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
