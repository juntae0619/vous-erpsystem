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
  password: z.string().min(1, "비밀번호를 입력해주세요"),
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
    <div className="flex min-h-screen items-center justify-center bg-hint-of-sky">
      <div className="w-full max-w-[400px] px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-dark-onyx">
            <span className="font-heading text-xl font-bold text-white">V</span>
          </div>
          <h1 className="font-heading text-subheading">VOUS ERP</h1>
          <p className="mt-1 text-body-sm text-smoke-gray">업무 통합 관리 시스템</p>
        </div>

        <Card>
          <h2 className="mb-6 font-heading text-page-title">로그인</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="form-field">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-caption text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="form-field">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-caption text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-caption text-smoke-gray">
          계정 문의는 시스템 관리자에게 연락해주세요
        </p>
      </div>
    </div>
  );
}
