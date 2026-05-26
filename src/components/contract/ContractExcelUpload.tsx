"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Upload, Download, X, CheckCircle2, XCircle,
  FileSpreadsheet, AlertTriangle, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── 타입 ──────────────────────────────────────────────────── */
type RawRow = Record<string, unknown>;

interface ValidationResult {
  rowIndex: number;
  valid: boolean;
  errors: string[];
  contractNumber: string;
}

interface PreviewState {
  rows: RawRow[];
  validCount: number;
  invalidCount: number;
  results: ValidationResult[];
  validated: boolean;
}

/* ── 컴포넌트 ──────────────────────────────────────────────── */
export function ContractExcelUpload({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [importResult, setImportResult] = useState<{
    created: number; skipped: number;
    errors: { rowIndex: number; contractNumber: string; errors: string[] }[];
  } | null>(null);

  /* ── Excel 파싱 ─────────────────────────────────────────── */
  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rows.length === 0) {
      toast.error("데이터 행이 없습니다");
      return;
    }
    if (rows.length > 200) {
      toast.error("한 번에 최대 200건까지 업로드할 수 있습니다");
      return;
    }

    // dryRun 검증
    setLoading(true);
    try {
      const res = await fetch("/api/contract/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "검증 실패"); return; }

      setPreview({
        rows,
        validCount: json.data.validCount,
        invalidCount: json.data.invalidCount,
        results: json.data.results,
        validated: true,
      });
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── 드래그 앤 드롭 ──────────────────────────────────────── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!file.name.match(/\.xlsx?$/i)) {
        toast.error(".xlsx 또는 .xls 파일만 업로드할 수 있습니다");
        return;
      }
      parseFile(file);
    },
    [parseFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      parseFile(file);
      e.target.value = "";
    },
    [parseFile]
  );

  /* ── 가져오기 실행 ─────────────────────────────────────────── */
  const handleImport = async () => {
    if (!preview || preview.validCount === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contract/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows, dryRun: false }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "가져오기 실패"); return; }
      setImportResult(json.data);
      setStep("result");
      toast.success(`${json.data.created}건 등록 완료`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  /* ── 템플릿 다운로드 ───────────────────────────────────────── */
  const downloadTemplate = async () => {
    const res = await fetch("/api/contract/template");
    if (!res.ok) { toast.error("템플릿 다운로드 실패"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "계약_일괄등록_템플릿.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── 렌더링 ──────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 16px 64px rgba(0,0,0,0.18)" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e8e8]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#7b68ee]" />
            <h2
              className="text-[15px] font-semibold text-[#090c1d]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              Excel로 계약 일괄 등록
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#b3b3b3] hover:bg-[#e9ebf0] hover:text-[#292d34] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* 스텝 표시기 */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-[#f0f0f0] bg-[#fafafa]">
          {[
            { key: "upload", label: "파일 선택" },
            { key: "preview", label: "미리보기·검증" },
            { key: "result", label: "등록 결과" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-[#d0d0d0]" />}
              <span
                className={`text-[12px] font-medium px-2 py-0.5 rounded-md ${
                  step === s.key
                    ? "bg-[#7b68ee] text-white"
                    : "text-[#b3b3b3]"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ─── STEP 1: 파일 선택 ─── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* 템플릿 다운로드 안내 */}
              <div className="flex items-center justify-between p-3.5 bg-[#f8f9fb] rounded-xl border border-[#e8e8e8]">
                <div>
                  <p className="text-[13px] font-medium text-[#292d34]">
                    먼저 템플릿을 내려받으세요
                  </p>
                  <p className="text-[12px] text-[#b3b3b3] mt-0.5">
                    헤더 형식을 변경하지 말고 데이터만 입력해주세요
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[12px] border border-[#e8e8e8] rounded-lg px-3 gap-1.5 hover:bg-white"
                  onClick={downloadTemplate}
                >
                  <Download size={13} />
                  템플릿 다운로드
                </Button>
              </div>

              {/* 드래그 앤 드롭 영역 */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center gap-3
                  h-44 rounded-xl border-2 border-dashed cursor-pointer transition-all
                  ${isDragging
                    ? "border-[#7b68ee] bg-[#f0eeff]"
                    : "border-[#e8e8e8] bg-[#fafafa] hover:border-[#7b68ee] hover:bg-[#faf9ff]"
                  }
                `}
              >
                <Upload
                  size={28}
                  className={isDragging ? "text-[#7b68ee]" : "text-[#d0d0d0]"}
                />
                <div className="text-center">
                  <p className="text-[13px] font-medium text-[#292d34]">
                    파일을 여기에 끌어다 놓거나 클릭하세요
                  </p>
                  <p className="text-[12px] text-[#b3b3b3] mt-0.5">.xlsx 또는 .xls</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {loading && (
                <p className="text-center text-[13px] text-[#7b68ee]">
                  파일 검증 중…
                </p>
              )}
            </div>
          )}

          {/* ─── STEP 2: 미리보기 ─── */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* 요약 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#f8f9fb] rounded-xl text-center">
                  <p className="text-[11px] text-[#b3b3b3]">전체</p>
                  <p className="text-[18px] font-bold text-[#090c1d]">
                    {preview.rows.length}건
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl text-center">
                  <p className="text-[11px] text-green-600">등록 가능</p>
                  <p className="text-[18px] font-bold text-green-700">
                    {preview.validCount}건
                  </p>
                </div>
                <div className={`p-3 rounded-xl text-center ${preview.invalidCount > 0 ? "bg-red-50" : "bg-[#f8f9fb]"}`}>
                  <p className={`text-[11px] ${preview.invalidCount > 0 ? "text-red-500" : "text-[#b3b3b3]"}`}>
                    오류
                  </p>
                  <p className={`text-[18px] font-bold ${preview.invalidCount > 0 ? "text-red-600" : "text-[#b3b3b3]"}`}>
                    {preview.invalidCount}건
                  </p>
                </div>
              </div>

              {/* 파일명 */}
              <div className="flex items-center gap-2 text-[12px] text-[#b3b3b3]">
                <FileSpreadsheet size={13} />
                {fileName}
                <button
                  className="ml-auto text-[#7b68ee] hover:underline"
                  onClick={() => { setStep("upload"); setPreview(null); setFileName(null); }}
                >
                  다시 선택
                </button>
              </div>

              {/* 행별 결과 */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {preview.results.map((r) => (
                  <div
                    key={r.rowIndex}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      r.valid
                        ? "border-green-100 bg-green-50"
                        : "border-red-100 bg-red-50"
                    }`}
                  >
                    {r.valid ? (
                      <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#b3b3b3]">{r.rowIndex}행</span>
                        <span className="text-[12px] font-medium text-[#292d34] truncate">
                          {r.contractNumber || "(계약번호 없음)"}
                        </span>
                        {r.valid && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-0 rounded-full">
                            등록 가능
                          </Badge>
                        )}
                      </div>
                      {!r.valid && r.errors.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {r.errors.map((e, i) => (
                            <li key={i} className="text-[11px] text-red-500 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                              {e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {preview.invalidCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-[12px] text-amber-700">
                    오류가 있는 {preview.invalidCount}건은 건너뜁니다. 유효한 {preview.validCount}건만 등록됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3: 등록 결과 ─── */}
          {step === "result" && importResult && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 size={36} className="text-green-500 mx-auto mb-3" />
                <p
                  className="text-[18px] font-bold text-[#090c1d]"
                  style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
                >
                  {importResult.created}건 등록 완료
                </p>
                {importResult.skipped > 0 && (
                  <p className="text-[13px] text-[#b3b3b3] mt-1">
                    {importResult.skipped}건 건너뜀
                  </p>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-[#292d34]">건너뛴 항목</p>
                  {importResult.errors.map((e) => (
                    <div
                      key={e.rowIndex}
                      className="p-3 bg-red-50 rounded-xl border border-red-100"
                    >
                      <p className="text-[12px] font-medium text-red-700">
                        {e.rowIndex}행 {e.contractNumber && `(${e.contractNumber})`}
                      </p>
                      <ul className="mt-1">
                        {e.errors.map((msg, i) => (
                          <li key={i} className="text-[11px] text-red-500">· {msg}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e8e8e8] bg-[#fafafa]">
          {step === "upload" && (
            <Button
              variant="ghost"
              className="h-8 text-[13px] rounded-lg"
              onClick={onClose}
            >
              취소
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="ghost"
                className="h-8 text-[13px] rounded-lg"
                onClick={onClose}
              >
                취소
              </Button>
              <Button
                className="px-4"
                disabled={loading || preview?.validCount === 0}
                onClick={handleImport}
              >
                {loading
                  ? "등록 중…"
                  : preview?.validCount === 0
                  ? "등록 가능한 항목 없음"
                  : `${preview?.validCount}건 등록하기`}
              </Button>
            </>
          )}

          {step === "result" && (
            <Button
              className="px-4"
              onClick={onClose}
            >
              닫기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
