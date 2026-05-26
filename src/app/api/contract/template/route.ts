import { requireManager } from "@/lib/api";
import { BILLING_CYCLE_IMPORT_LABELS, MERCHANT_SETTLEMENT_IMPORT_LABELS } from "@/lib/billing-cycle";
import * as XLSX from "xlsx";

// GET /api/contract/template — 계약 일괄등록용 Excel 템플릿 다운로드
export async function GET(req: Request) {
  const { error } = await requireManager();
  if (error) return error;

  /* ── 헤더 정의 ───────────────────────────────────────────── */
  const headers = [
    "지자체명",       // A  *필수
    "계약번호",       // B  *필수·유니크
    "계약명",         // C  *필수
    "계약시작일",     // D  *필수  YYYY-MM-DD
    "계약종료일",     // E  *필수  YYYY-MM-DD
    "서비스금액(원)", // F  *필수  숫자
    "청구주기",       // G  *필수  10일|15일|한달|분기|반기|연간
    "담당자명",       // H  *필수  사용자 이름과 정확히 일치
    "가맹점수수료",   // I  선택   Y|N  (기본 N)
    "수수료유형",     // J  선택   수수료율|정액
    "수수료율(%)",    // K  선택   숫자 (수수료유형=수수료율 일 때)
    "수수료금액(원)", // L  선택   숫자 (수수료유형=정액 일 때)
    "가맹점정산주기", // M  선택   10일|15일|한달
    "비고",           // N  선택
  ];

  /* ── 예시 행 ─────────────────────────────────────────────── */
  const example = [
    "서울시 종로구",
    "2024-001",
    "전자바우처 운영 서비스",
    "2024-01-01",
    "2024-12-31",
    5000000,
    "분기",
    "김철수",
    "Y",
    "수수료율",
    1.5,
    "",
    "분기",
    "예시 계약",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);

  /* ── 열 너비 ─────────────────────────────────────────────── */
  ws["!cols"] = [
    { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 13 }, { wch: 13 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 20 },
  ];

  /* ── 헤더 셀 강조 (배경색) ──────────────────────────────── */
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "202023" } },
    alignment: { horizontal: "center" },
  };
  headers.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cellRef]) ws[cellRef] = {};
    ws[cellRef].s = headerStyle;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "계약등록");

  /* ── 안내 시트 ───────────────────────────────────────────── */
  const guideData = [
    ["컬럼", "필수", "허용값"],
    ["지자체명", "✓", "자유 입력"],
    ["계약번호", "✓", "시스템 내 유니크"],
    ["계약명", "✓", "자유 입력"],
    ["계약시작일", "✓", "YYYY-MM-DD"],
    ["계약종료일", "✓", "YYYY-MM-DD"],
    ["서비스금액(원)", "✓", "0 이상 정수"],
    ["청구주기", "✓", BILLING_CYCLE_IMPORT_LABELS.replace(/\|/g, " / ")],
    ["담당자명", "✓", "시스템 등록 사용자명과 정확히 일치"],
    ["가맹점수수료", "", "Y / N (생략 시 N)"],
    ["수수료유형", "", "수수료율 / 정액 (가맹점수수료=Y 일 때만)"],
    ["수수료율(%)", "", "소수 허용 (수수료유형=수수료율 일 때)"],
    ["수수료금액(원)", "", "정수 (수수료유형=정액 일 때)"],
    ["가맹점정산주기", "", MERCHANT_SETTLEMENT_IMPORT_LABELS.replace(/\|/g, " / ")],
    ["비고", "", "자유 입력"],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide["!cols"] = [{ wch: 18 }, { wch: 6 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "입력가이드");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("계약_일괄등록_템플릿.xlsx")}`,
    },
  });
}
