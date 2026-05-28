"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface LocalGovContactData {
  id: string;
  region: string;
  city: string;
  cardName: string | null;
  allowedItems: string | null;
  department: string | null;
  contactName: string | null;
  jobDuty: string | null;
  phone: string | null;
  email: string | null;
  cardBinNo: string | null;
}

const schema = z.object({
  region: z.string().min(1, "지역을 입력해주세요"),
  city: z.string().min(1, "시/군을 입력해주세요"),
  cardName: z.string().optional(),
  allowedItems: z.string().optional(),
  department: z.string().optional(),
  contactName: z.string().optional(),
  jobDuty: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  cardBinNo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  contact: LocalGovContactData | null; // null이면 추가 모드
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FORM: FormData = {
  region: "", city: "", cardName: "", allowedItems: "",
  department: "", contactName: "", jobDuty: "", phone: "", email: "", cardBinNo: "",
};

function toFormValues(contact: LocalGovContactData): FormData {
  return {
    region: contact.region,
    city: contact.city,
    cardName: contact.cardName ?? "",
    allowedItems: contact.allowedItems ?? "",
    department: contact.department ?? "",
    contactName: contact.contactName ?? "",
    jobDuty: contact.jobDuty ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    cardBinNo: contact.cardBinNo ?? "",
  };
}

export function LocalGovContactEditDialog({ contact, open, onOpenChange }: Props) {
  const isEdit = !!contact;
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: standardSchemaResolver(schema) as any,
  });

  useEffect(() => {
    if (open) {
      reset(contact ? toFormValues(contact) : EMPTY_FORM);
    }
  }, [contact, open, reset]);

  const onSubmit = async (data: FormData) => {
    const body = {
      ...data,
      cardName: data.cardName || null,
      allowedItems: data.allowedItems || null,
      department: data.department || null,
      contactName: data.contactName || null,
      jobDuty: data.jobDuty || null,
      phone: data.phone || null,
      email: data.email || null,
      cardBinNo: data.cardBinNo || null,
    };

    const res = isEdit
      ? await fetch(`/api/local-gov-contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/local-gov-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? (isEdit ? "수정에 실패했습니다" : "추가에 실패했습니다"));
      return;
    }

    toast.success(isEdit ? "연락처가 수정되었습니다" : "연락처가 추가되었습니다");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "연락처 수정" : "연락처 추가"}</DialogTitle>
        </DialogHeader>

        <form
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSubmit={(handleSubmit as any)(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="form-field">
              <Label>지역</Label>
              <Input className="form-input h-9" {...register("region")} />
              {errors.region && (
                <p className="text-caption text-destructive">{errors.region.message}</p>
              )}
            </div>
            <div className="form-field">
              <Label>시/군</Label>
              <Input className="form-input h-9" {...register("city")} />
              {errors.city && (
                <p className="text-caption text-destructive">{errors.city.message}</p>
              )}
            </div>
          </div>

          <div className="form-field">
            <Label>카드명</Label>
            <Input className="form-input h-9" {...register("cardName")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="form-field">
              <Label>부서</Label>
              <Input className="form-input h-9" {...register("department")} />
            </div>
            <div className="form-field">
              <Label>담당자</Label>
              <Input className="form-input h-9" {...register("contactName")} />
            </div>
          </div>

          <div className="form-field">
            <Label>담당업무</Label>
            <Input className="form-input h-9" {...register("jobDuty")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="form-field">
              <Label>연락처</Label>
              <Input className="form-input h-9" {...register("phone")} />
            </div>
            <div className="form-field">
              <Label>이메일</Label>
              <Input className="form-input h-9" type="email" {...register("email")} />
            </div>
          </div>

          <div className="form-field">
            <Label>카드 빈번호</Label>
            <Input className="form-input h-9 font-mono" {...register("cardBinNo")} />
          </div>

          <DialogFooter className="mt-2 border-t-0 bg-transparent p-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : isEdit ? "저장" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
