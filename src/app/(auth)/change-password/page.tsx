"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const schema = z
  .object({
    newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: standardSchemaResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/change-initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: data.newPassword }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.message ?? "오류가 발생했습니다");
        return;
      }

      toast.success("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      // 세션 갱신을 위해 로그아웃 후 로그인 페이지로
      await signOut({ callbackUrl: "/login" });
    } catch {
      toast.error("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hint-of-sky">
      <div className="w-full max-w-[400px] px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-dark-onyx">
            <span className="font-heading text-xl font-bold text-white">V</span>
          </div>
          <h1 className="font-heading text-subheading">VOUS ERP</h1>
          <p className="mt-1 text-body-sm text-smoke-gray">비밀번호를 변경해주세요</p>
        </div>

        <Card>
          <h2 className="mb-2 font-heading text-page-title">초기 비밀번호 변경</h2>
          <p className="mb-6 text-body-sm text-smoke-gray">
            보안을 위해 최초 로그인 시 비밀번호를 변경해야 합니다.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="form-field">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="8자 이상 입력"
                autoComplete="new-password"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-caption text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="form-field">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-caption text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
