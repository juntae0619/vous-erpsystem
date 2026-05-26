"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: standardSchemaResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsPending(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("이메일 또는 비밀번호가 올바르지 않습니다");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("로그인 중 오류가 발생했습니다");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e9ebf0]">
      <div className="w-full max-w-[400px] px-4">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#202023] mb-4">
            <span className="text-white text-xl font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
              V
            </span>
          </div>
          <h1
            className="text-[26px] font-bold text-[#090c1d] tracking-[-0.91px] leading-[1.25]"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            바우처 ERP
          </h1>
          <p className="text-[14px] text-[#b3b3b3] mt-1 tracking-[-0.15px]">
            업무 통합 관리 시스템
          </p>
        </div>

        {/* 로그인 카드 */}
        <Card className="p-6 shadow-card border-[#e8e8e8] rounded-xl">
          <h2
            className="text-[16px] font-semibold text-[#090c1d] mb-6 tracking-[-0.26px]"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
          >
            로그인
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-[13px] font-medium text-[#292d34] tracking-[-0.15px]"
              >
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                className="h-9 text-[14px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee] placeholder:text-[#b3b3b3]"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[12px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[13px] font-medium text-[#292d34] tracking-[-0.15px]"
              >
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-9 text-[14px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-[12px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-9 bg-[#202023] hover:bg-[#292d34] text-white text-[14px] font-medium rounded-lg tracking-[-0.15px] shadow-btn transition-colors"
            >
              {isPending ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-[12px] text-[#b3b3b3] mt-6">
          계정 문의는 시스템 관리자에게 연락해주세요
        </p>
      </div>
    </div>
  );
}
