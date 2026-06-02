"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ContractDataQuality } from "@/components/contract/ContractDataQuality";

type MailSettings = {
  smtpUser: string;
  mailTo: string;
  hasEnvPassword: boolean;
  isConfigured: boolean;
};

type MigratePreview = {
  total: number;
  newCount: number;
  existingCount: number;
  totalBillings: number;
};

export function ContractSettingsClient() {
  const [mail, setMail] = useState<MailSettings>({
    smtpUser: "",
    mailTo: "",
    hasEnvPassword: false,
    isConfigured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [preview, setPreview] = useState<MigratePreview | null>(null);

  useEffect(() => {
    fetch("/api/contract/mail-settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setMail(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveMail = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/contract/mail-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpUser: mail.smtpUser,
          mailTo: mail.mailTo,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "저장 실패");
        return;
      }
      setMail(json.data);
      toast.success("메일 설정 저장됨");
    } finally {
      setSaving(false);
    }
  };

  const testMail = async () => {
    const res = await fetch("/api/contract/send-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });
    const json = await res.json();
    if (!res.ok) toast.error(json.error ?? "테스트 실패");
    else toast.success("테스트 메일 발송됨");
  };

  const previewMigrate = async () => {
    setMigrating(true);
    try {
      const res = await fetch("/api/contract/migrate-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "미리보기 실패");
        return;
      }
      setPreview(json.data);
    } finally {
      setMigrating(false);
    }
  };

  const runMigrate = async () => {
    if (!confirm("레거시 앱(:5000) 데이터를 ERP DB로 가져옵니다. 기존 계약번호는 건너뜁니다. 계속할까요?")) {
      return;
    }
    setMigrating(true);
    try {
      const res = await fetch("/api/contract/migrate-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, force: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "가져오기 실패");
        return;
      }
      toast.success(
        `계약 ${json.data.createdContracts}건, 청구 ${json.data.createdBillings}건 등록 (건너뜀 ${json.data.skippedContracts}건)`
      );
      setPreview(null);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-smoke-gray">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <ContractDataQuality />

      <Card className="p-5 space-y-4">
        <h2 className="font-heading text-section-title">메일 설정</h2>
        <p className="text-caption text-smoke-gray">
          보내는·받는 주소는 여기서 저장합니다. SMTP 비밀번호는 서버{" "}
          <code className="text-xs">CONTRACT_SMTP_PASS</code> (또는{" "}
          <code className="text-xs">SMTP_PASS</code>) 환경변수로만 설정하세요.
          Gmail은 앱 비밀번호(16자리)를 사용합니다.
        </p>
        <div className="space-y-3">
          <div>
            <Label>보내는 계정</Label>
            <Input
              type="email"
              value={mail.smtpUser}
              onChange={(e) => setMail((m) => ({ ...m, smtpUser: e.target.value }))}
              placeholder="example@naver.com"
            />
          </div>
          <div>
            <Label>받는 주소</Label>
            <Input
              type="email"
              value={mail.mailTo}
              onChange={(e) => setMail((m) => ({ ...m, mailTo: e.target.value }))}
            />
          </div>
          <p className="text-caption">
            env 비밀번호:{" "}
            <span className={mail.hasEnvPassword ? "text-green-700" : "text-rich-plum"}>
              {mail.hasEnvPassword ? "설정됨" : "미설정"}
            </span>
            {" · "}
            발송 가능:{" "}
            <span className={mail.isConfigured ? "text-green-700" : "text-rich-plum"}>
              {mail.isConfigured ? "예" : "아니오"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveMail} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
          <Button variant="outline" onClick={testMail}>
            테스트 메일 보내기
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-heading text-section-title">레거시 앱 데이터 가져오기</h2>
        <p className="text-caption text-smoke-gray">
          포트 5000 계약·수금 앱에서 계약·청구·입금 내역을 ERP DB로 이전합니다.
          서버에서 실행 시 <code className="text-xs">LEGACY_CONTRACT_APP_URL=http://127.0.0.1:5000</code> 을 사용하세요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={previewMigrate} disabled={migrating} className="gap-1.5">
            {migrating ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            미리보기
          </Button>
          <Button onClick={runMigrate} disabled={migrating} className="gap-1.5">
            <Download size={14} />
            가져오기 실행
          </Button>
        </div>
        {preview && (
          <div className="rounded-lg bg-hint-of-sky p-3 text-body-sm">
            <p>전체 {preview.total}건 · 신규 {preview.newCount}건 · 기존 {preview.existingCount}건</p>
            <p>청구·입금 내역 {preview.totalBillings}건</p>
          </div>
        )}
      </Card>
    </div>
  );
}
