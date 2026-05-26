"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const baseSchema = z.object({
  name:     z.string().min(1, "이름을 입력해주세요"),
  email:    z.string().email("올바른 이메일을 입력해주세요"),
  role:     z.enum(["ADMIN", "MANAGER", "USER"]),
  team:     z.string().optional(),
  position: z.string().optional(),
  phone:    z.string().optional(),
  joinedAt: z.string().optional(),
});

const createSchema = baseSchema.extend({
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
});

const editSchema = baseSchema;

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

interface UserFormProps {
  mode: "create" | "edit";
  userId?: string;
  defaultValues?: Partial<CreateForm>;
}

const LABEL_CLS = "text-[13px] font-medium text-[#292d34]";
const INPUT_CLS = "h-9 text-[13px] border-[#e8e8e8] rounded-lg focus-visible:ring-[#7b68ee]";

export function UserForm({ mode, userId, defaultValues }: UserFormProps) {
  const router = useRouter();
  const schema = mode === "create" ? createSchema : editSchema;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: standardSchemaResolver(schema as any),
    defaultValues: {
      role: "USER",
      joinedAt: new Date().toISOString().split("T")[0],
      ...defaultValues,
    },
  });

  const onSubmit = async (data: CreateForm) => {
    const url  = mode === "create" ? "/api/users" : `/api/users/${userId}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "저장에 실패했습니다");
      return;
    }

    toast.success(mode === "create" ? "사용자가 생성되었습니다" : "사용자 정보가 수정되었습니다");
    router.push("/users");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="p-6 shadow-card border-[#e8e8e8] rounded-xl">
        <h3
          className="text-[15px] font-semibold text-[#090c1d] mb-5"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
        >
          기본 정보
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* 이름 */}
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>이름 *</Label>
            <Input className={INPUT_CLS} placeholder="홍길동" {...register("name")} />
            {errors.name && <p className="text-[12px] text-destructive">{errors.name.message}</p>}
          </div>

          {/* 이메일 */}
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>이메일 *</Label>
            <Input
              className={INPUT_CLS}
              type="email"
              placeholder="user@company.com"
              disabled={mode === "edit"}
              {...register("email")}
            />
            {errors.email && <p className="text-[12px] text-destructive">{errors.email.message}</p>}
          </div>

          {/* 비밀번호 (생성 시만) */}
          {mode === "create" && (
            <div className="space-y-1.5">
              <Label className={LABEL_CLS}>비밀번호 *</Label>
              <Input
                className={INPUT_CLS}
                type="password"
                placeholder="8자 이상"
                {...register("password")}
              />
              {(errors as any).password && (
                <p className="text-[12px] text-destructive">{(errors as any).password.message}</p>
              )}
            </div>
          )}

          {/* 역할 */}
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>권한 *</Label>
            <Select
              defaultValue={watch("role")}
              onValueChange={(v) => setValue("role", v as any)}
            >
              <SelectTrigger className={INPUT_CLS}>
                <SelectValue placeholder="권한 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">사용자</SelectItem>
                <SelectItem value="MANAGER">중간관리자</SelectItem>
                <SelectItem value="ADMIN">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 팀 */}
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>팀</Label>
            <Input className={INPUT_CLS} placeholder="바우처팀" {...register("team")} />
          </div>

          {/* 직책 */}
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>직책</Label>
            <Input className={INPUT_CLS} placeholder="대리" {...register("position")} />
          </div>

          {/* 연락처 */}
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>연락처</Label>
            <Input className={INPUT_CLS} placeholder="010-0000-0000" {...register("phone")} />
          </div>

          {/* 입사일 */}
          <div className="space-y-1.5">
            <Label className={LABEL_CLS}>입사일</Label>
            <Input className={INPUT_CLS} type="date" {...register("joinedAt")} />
          </div>
        </div>
      </Card>

      {/* 버튼 */}
      <div className="flex gap-2 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1 h-9 border-[#e8e8e8] text-[#292d34] rounded-lg text-[13px]"
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "저장 중..." : mode === "create" ? "계정 생성" : "저장"}
        </Button>
      </div>
    </form>
  );
}
