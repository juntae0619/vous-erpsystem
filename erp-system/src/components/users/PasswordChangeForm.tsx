"use client";

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
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
    newPassword:     z.string().min(8, "새 비밀번호는 8자 이상이어야 합니다"),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "새 비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const LABEL_CLS = "text-[13px] font-medium text-[#292d34]";
const INPUT_CLS = "h-9 text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]";

export function PasswordChangeForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: standardSchemaResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/profile/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); return; }
    toast.success("비밀번호가 변경되었습니다");
    reset();
  };

  return (
    <Card className="p-6 shadow-card border-[#e8e8e8] rounded-xl">
      <h3
        className="text-[15px] font-semibold text-[#090c1d] mb-5"
        style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
      >
        비밀번호 변경
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>현재 비밀번호</Label>
          <Input className={INPUT_CLS} type="password" {...register("currentPassword")} />
          {errors.currentPassword && (
            <p className="text-[12px] text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>새 비밀번호</Label>
          <Input className={INPUT_CLS} type="password" placeholder="8자 이상" {...register("newPassword")} />
          {errors.newPassword && (
            <p className="text-[12px] text-destructive">{errors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>새 비밀번호 확인</Label>
          <Input className={INPUT_CLS} type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-[12px] text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-9 bg-[#202023] hover:bg-[#292d34] text-white text-[13px] rounded-lg"
        >
          {isSubmitting ? "변경 중..." : "비밀번호 변경"}
        </Button>
      </form>
    </Card>
  );
}
