import * as XLSX from "xlsx";
import {
  BILLING_CYCLE_IMPORT_MAP,
  type BillingCycleValue,
} from "@/lib/billing-cycle";
import type { BillingCycle, PaymentStatus } from "@/generated/prisma/client";

export const LEGACY_APP_URL =
  process.env.LEGACY_CONTRACT_APP_URL ?? "http://127.0.0.1:5000";
export const LEGACY_APP_PASSWORD =
  process.env.LEGACY_CONTRACT_APP_PASSWORD ?? "1234";

export type LegacyBillingRow = {
  billingDate: string;
  billMonth: string | null;
  billPeriod: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  merchantSales: number;
  totalAmount: number;
  serviceAmount: number;
  vatAmount: number;
  paidAt: string | null;
  paidAmount: number;
  note: string | null;
};

export type LegacyContractData = {
  legacyId: number;
  contractNumber: string;
  region: string | null;
  localGovName: string;
  department: string | null;
  managerName: string | null;
  contactPhone: string | null;
  contractName: string;
  contractDate: string;
  commencementDate: string | null;
  endDate: string;
  contractMethod: string | null;
  serviceAmount: number;
  nextBillingDate: string | null;
  note: string | null;
  voucherName: string | null;
  billingMethod: string | null;
  billingCycle: BillingCycleValue;
  hasMerchantFee: boolean;
  merchantFeeType: "RATE" | "FIXED" | null;
  merchantFeeRate: number | null;
  billings: LegacyBillingRow[];
};

export type LegacyMigrationPreview = {
  contracts: LegacyContractData[];
  totalBillings: number;
  skippedExisting: string[];
};

class LegacySession {
  private cookies = new Map<string, string>();

  private storeCookies(res: Response) {
    const raw =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie")!]
          : [];
    for (const line of raw) {
      const part = line.split(";")[0];
      const eq = part.indexOf("=");
      if (eq > 0) {
        this.cookies.set(part.slice(0, eq), part.slice(eq + 1));
      }
    }
  }

  private cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async login(baseUrl: string, password: string) {
    const res = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password, next: "/" }),
      redirect: "manual",
    });
    this.storeCookies(res);
    if (res.status !== 302 && res.status !== 200) {
      throw new Error(`레거시 앱 로그인 실패 (HTTP ${res.status})`);
    }
  }

  async get(baseUrl: string, path: string) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Cookie: this.cookieHeader() },
    });
    this.storeCookies(res);
    if (!res.ok) throw new Error(`레거시 앱 요청 실패: ${path} (HTTP ${res.status})`);
    return res.text();
  }

  async downloadExport(baseUrl: string): Promise<Buffer> {
    const res = await fetch(`${baseUrl}/capp/export`, {
      headers: { Cookie: this.cookieHeader() },
    });
    if (!res.ok) throw new Error("레거시 Excel 내보내기 실패");
    return Buffer.from(await res.arrayBuffer());
  }
}

function extractContractIds(html: string): number[] {
  return [
    ...new Set(
      [...html.matchAll(/location\.href='\/capp\/contract\/(\d+)'/g)].map((m) =>
        parseInt(m[1], 10)
      )
    ),
  ];
}

function extractTotalPages(html: string): number {
  const m = html.match(/(\d+)\s*페이지\s*중/);
  if (m) return parseInt(m[1], 10);
  const links = [...html.matchAll(/href="\/capp\/\?page=(\d+)"/g)].map((x) =>
    parseInt(x[1], 10)
  );
  return links.length > 0 ? Math.max(...links) : 1;
}

async function fetchAllContractIds(session: LegacySession, baseUrl: string) {
  const firstHtml = await session.get(baseUrl, "/capp/");
  const totalPages = extractTotalPages(firstHtml);
  const ids = new Set(extractContractIds(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    const html = await session.get(baseUrl, `/capp/?page=${page}`);
    for (const id of extractContractIds(html)) ids.add(id);
  }

  return [...ids].sort((a, b) => a - b);
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toDateStr(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, "-");
  return null;
}

function decodeHtml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string) {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function inputValue(rowHtml: string, name: string): string {
  const re = new RegExp(
    `<input[^>]*name="${name}"[^>]*value="([^"]*)"`,
    "i"
  );
  const re2 = new RegExp(
    `<input[^>]*value="([^"]*)"[^>]*name="${name}"`,
    "i"
  );
  return (rowHtml.match(re)?.[1] ?? rowHtml.match(re2)?.[1] ?? "").replace(/,/g, "");
}

function selectedOption(rowHtml: string, name: string): string {
  const selectRe = new RegExp(
    `<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)<\\/select>`,
    "i"
  );
  const selectHtml = rowHtml.match(selectRe)?.[1] ?? "";
  const opt = selectHtml.match(/<option[^>]*selected[^>]*>([^<]*)<\/option>/i);
  return opt?.[1]?.trim() ?? "";
}

function parseBillingMethod(text: string) {
  const cycleKey =
    text.match(/\/\s*(10일|15일|한달|분기|반기|연간)/)?.[1] ?? "분기";
  const rateMatch = text.match(/정률\s*\(([0-9.]+)%\)/);
  const isFixed = text.includes("정액");

  return {
    billingMethod: isFixed ? "정액" : rateMatch ? "정률" : text || null,
    billingCycle: BILLING_CYCLE_IMPORT_MAP[cycleKey] ?? "QUARTERLY",
    hasMerchantFee: Boolean(rateMatch) || isFixed,
    merchantFeeType: isFixed ? ("FIXED" as const) : rateMatch ? ("RATE" as const) : null,
    merchantFeeRate: rateMatch ? parseFloat(rateMatch[1]) : null,
  };
}

function parseCards(html: string) {
  const cards: Record<string, string> = {};
  const re =
    /<div class="card"[^>]*>\s*<span class="label">([^<]*)<\/span>\s*<span class="val">([^<]*)<\/span>\s*<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    cards[stripTags(m[1])] = stripTags(m[2]).replace(/,/g, "");
  }
  return cards;
}

function findXlsxRow(
  map: Map<string, Record<string, unknown>>,
  localGovName: string,
  contractName: string
) {
  const rows = [...map.values()];
  const exact = rows.find(
    (r) =>
      String(r["기관명"] ?? "").trim() === localGovName &&
      String(r["계약명"] ?? "").trim() === contractName
  );
  if (exact) return exact;
  const byGov = rows.filter(
    (r) => String(r["기관명"] ?? "").trim() === localGovName
  );
  return byGov.length === 1 ? byGov[0] : undefined;
}

function parseKvTable(html: string) {
  const kv: Record<string, string> = {};
  const rowRe = /<tr>\s*<th>([^<]*)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<th>([^<]*)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    kv[stripTags(m[1])] = stripTags(m[2]);
    kv[stripTags(m[3])] = stripTags(m[4]);
  }
  return kv;
}

function parseBillingRows(html: string): LegacyBillingRow[] {
  const rows: LegacyBillingRow[] = [];
  const trRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html)) !== null) {
    const rowHtml = tr[1];
    if (!/form="pf\d+"/.test(rowHtml) && !/id="pf\d+"/.test(rowHtml)) continue;

    const billingDate = inputValue(rowHtml, "bill_date");
    const totalAmount = toNum(inputValue(rowHtml, "bill_amount"));
    if (!billingDate && totalAmount === 0) continue;

    const paidAmount = toNum(inputValue(rowHtml, "pay_amount"));
    const serviceAmount = toNum(inputValue(rowHtml, "service_fee")) || totalAmount;
    const periodStart = inputValue(rowHtml, "period_start") || null;
    const periodEnd = inputValue(rowHtml, "period_end") || null;

    rows.push({
      billingDate: billingDate || paidAmount ? inputValue(rowHtml, "pay_date") : "",
      billMonth: inputValue(rowHtml, "bill_month") || null,
      billPeriod: selectedOption(rowHtml, "bill_period") || null,
      periodStart,
      periodEnd,
      merchantSales: toNum(inputValue(rowHtml, "merchant_sales")),
      totalAmount,
      serviceAmount,
      vatAmount: toNum(inputValue(rowHtml, "vat")),
      paidAt: inputValue(rowHtml, "pay_date") || null,
      paidAmount,
      note: inputValue(rowHtml, "note") || null,
    });
  }
  return rows.filter((r) => r.billingDate && r.totalAmount > 0);
}

function parseContractDetail(
  legacyId: number,
  html: string,
  xlsxRow?: Record<string, unknown>,
  xlsxMap?: Map<string, Record<string, unknown>>
): LegacyContractData {
  const row = xlsxRow;
  const kv = html ? parseKvTable(html) : {};
  const cards = html ? parseCards(html) : {};
  const contractNameFromKv = kv["계약명"] || "";

  const h1Text = html
    ? stripTags(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? "")
    : "";
  const h1Gov = h1Text.replace(/\s+[A-Z0-9-]+$/, "").trim();

  let contractNumber = String(row?.["계약번호"] ?? "").trim();
  if (!contractNumber && html) {
    contractNumber =
      html.match(/<small>([^<]+)<\/small>/)?.[1]?.trim() || "";
  }
  if (!contractNumber && legacyId > 0) {
    contractNumber = `LEGACY-${legacyId}`;
  }
  if (!contractNumber && row) {
    contractNumber = `IMPORT-${String(row["기관명"] ?? "unknown")}-${String(row["계약일"] ?? "nodate")}`;
  }

  const billingInfo = parseBillingMethod(kv["청구방법"] ?? "");

  const period = kv["계약기간"]?.match(
    /(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/
  );

  return {
    legacyId,
    contractNumber,
    region: String(row?.["지역"] ?? "").trim() || null,
    localGovName:
      String(row?.["기관명"] ?? "").trim() || h1Gov || "",
    department: String(row?.["담당부서"] ?? "").trim() || null,
    managerName: String(row?.["담당자"] ?? "").trim() || null,
    contactPhone: String(row?.["연락처"] ?? "").trim() || null,
    contractName:
      String(row?.["계약명"] ?? "").trim() || contractNameFromKv || "",
    contractDate:
      toDateStr(row?.["계약일"]) ??
      period?.[1] ??
      new Date().toISOString().slice(0, 10),
    commencementDate:
      toDateStr(row?.["착수일"]) ?? period?.[1] ?? null,
    endDate:
      toDateStr(row?.["완수일"]) ??
      period?.[2] ??
      new Date().toISOString().slice(0, 10),
    contractMethod: String(row?.["계약방법"] ?? "").trim() || null,
    serviceAmount:
      toNum(row?.["계약금액"]) || toNum(cards["계약금액"]),
    nextBillingDate: toDateStr(row?.["다음청구예정일"]),
    note: String(row?.["비고"] ?? "").trim() || null,
    voucherName: kv["바우처명"] || null,
    billingMethod: billingInfo.billingMethod,
    billingCycle: billingInfo.billingCycle,
    hasMerchantFee: billingInfo.hasMerchantFee,
    merchantFeeType: billingInfo.merchantFeeType,
    merchantFeeRate: billingInfo.merchantFeeRate,
    billings: html ? parseBillingRows(html) : [],
  };
}

function loadXlsxRows(buffer?: ArrayBuffer | Buffer) {
  if (!buffer) return [] as Record<string, unknown>[];

  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
}

function loadXlsxMap(buffer?: ArrayBuffer | Buffer) {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of loadXlsxRows(buffer)) {
    const num = String(row["계약번호"] ?? "").trim();
    if (num) map.set(num, row);
  }
  return map;
}

async function findLegacyIdByQuery(
  session: LegacySession,
  baseUrl: string,
  query: string
): Promise<number | null> {
  const html = await session.get(
    baseUrl,
    `/capp/?q=${encodeURIComponent(query)}`
  );
  const id = html.match(/location\.href='\/capp\/contract\/(\d+)'/)?.[1];
  return id ? parseInt(id, 10) : null;
}

export async function fetchLegacyContracts(
  options: {
    baseUrl?: string;
    password?: string;
    xlsxBuffer?: ArrayBuffer | Buffer;
  } = {}
): Promise<LegacyContractData[]> {
  const baseUrl = options.baseUrl ?? LEGACY_APP_URL;
  const password = options.password ?? LEGACY_APP_PASSWORD;

  const session = new LegacySession();
  await session.login(baseUrl, password);

  let xlsxBuffer = options.xlsxBuffer;
  if (!xlsxBuffer) {
    try {
      xlsxBuffer = await session.downloadExport(baseUrl);
    } catch {
      // Excel 없이 HTML만 사용
    }
  }

  const xlsxMap = loadXlsxMap(xlsxBuffer);
  const xlsxRows = loadXlsxRows(xlsxBuffer);

  const contracts: LegacyContractData[] = [];
  const seen = new Set<string>();

  if (xlsxRows.length > 0) {
    for (const row of xlsxRows) {
      const contractNumber = String(row["계약번호"] ?? "").trim();
      const dedupeKey =
        contractNumber ||
        `${row["기관명"]}|${row["계약명"]}|${row["계약일"]}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const legacyId = contractNumber
        ? ((await findLegacyIdByQuery(session, baseUrl, contractNumber)) ??
          (await findLegacyIdByQuery(
            session,
            baseUrl,
            String(row["기관명"] ?? "").trim()
          )))
        : await findLegacyIdByQuery(
            session,
            baseUrl,
            String(row["기관명"] ?? "").trim()
          );

      if (legacyId) {
        const detailHtml = await session.get(
          baseUrl,
          `/capp/contract/${legacyId}`
        );
        contracts.push(
          parseContractDetail(legacyId, detailHtml, row, xlsxMap)
        );
      } else {
        contracts.push(parseContractDetail(0, "", row, xlsxMap));
      }
    }
  } else {
    const ids = await fetchAllContractIds(session, baseUrl);
    for (const id of ids) {
      const detailHtml = await session.get(baseUrl, `/capp/contract/${id}`);
      const previewNum = detailHtml
        .match(/<small>([^<]+)<\/small>/)?.[1]
        ?.trim();
      const xlsxRow = previewNum ? xlsxMap.get(previewNum) : undefined;
      const parsed = parseContractDetail(id, detailHtml, xlsxRow, xlsxMap);
      if (seen.has(parsed.contractNumber)) continue;
      seen.add(parsed.contractNumber);
      contracts.push(parsed);
    }
  }

  return contracts.sort((a, b) =>
    a.contractNumber.localeCompare(b.contractNumber, "ko")
  );
}

export function paymentStatus(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "UNPAID";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}

export function toPrismaBillingCycle(value: BillingCycleValue): BillingCycle {
  return value as BillingCycle;
}
