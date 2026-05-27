/**
 * 지자체 담당자 연락처 데이터 임포트 스크립트
 * 실행: npx tsx prisma/seed-local-gov-contacts.ts
 */

import * as XLSX from "xlsx";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface RawRow {
  region: string | null;
  city: string | null;
  allowedItems: string | null;
  department: string | null;
  contactName: string | null;
  jobDuty: string | null;
  phone: string | null;
  email: string | null;
  cardBinNo: string | null;
}

function cleanText(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return s === "" ? null : s;
}

/** "창원시\n(창원희망카드,\nPOP카드)" → { city: "창원시", cardName: "창원희망카드, POP카드" } */
function parseCityAndCard(raw: string): { city: string; cardName: string | null } {
  const parts = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  const cityPart = parts[0] ?? raw;
  const cardParts = parts
    .slice(1)
    .join(" ")
    .replace(/[()]/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cardName = cardParts.length > 0 ? cardParts.join(", ") : null;
  return { city: cityPart.trim(), cardName };
}

async function main() {
  const xlsxPath = path.resolve(
    "C:/Users/박준태/Desktop/지자체 담당자연락처_erp.xlsx"
  );

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets["Sheet1"];
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // 헤더 행 제거 (index 0)
  const rows = rawData.slice(1) as (string | null | undefined)[][];

  // 누적 region / city / cardName / allowedItems (셀 병합 형태)
  let curRegion = "";
  let curCity = "";
  let curCardName: string | null = null;
  let curAllowed: string | null = null;

  const contacts: {
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
  }[] = [];

  for (const row of rows) {
    const [col0, col1, col2, col3, col4, col5, col6, col7, col8] = row;

    const regionRaw = cleanText(col0);
    const cityRaw = cleanText(col1);
    const allowedRaw = cleanText(col2);
    const deptRaw = cleanText(col3);
    const contactRaw = cleanText(col4);
    const dutyRaw = cleanText(col5);
    const phoneRaw = cleanText(col6);
    const emailRaw = cleanText(col7);
    const binRaw = cleanText(col8);

    // region 갱신
    if (regionRaw) curRegion = regionRaw.replace(/\n/g, "");

    // city 갱신
    if (cityRaw) {
      const parsed = parseCityAndCard(cityRaw);
      curCity = parsed.city;
      curCardName = parsed.cardName;
    }

    // allowedItems 갱신 (city와 같은 행에만 등장)
    if (cityRaw) {
      curAllowed = allowedRaw;
    }

    // 담당자가 여러 명인 경우 (\n 구분) → 각각 분리
    const contactNames = (contactRaw ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    const jobDuties = (dutyRaw ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    const phones = (phoneRaw ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    const emails = (emailRaw ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

    const count = Math.max(contactNames.length, 1);
    for (let i = 0; i < count; i++) {
      const cn = contactNames[i] ?? null;
      const jd = jobDuties[i] ?? jobDuties[0] ?? null;
      const ph = phones[i] ?? phones[0] ?? null;
      const em = emails[i] ?? emails[0] ?? null;

      // 완전히 빈 행 스킵
      if (!cn && !ph && !em && !deptRaw) continue;

      contacts.push({
        region: curRegion,
        city: curCity,
        cardName: curCardName,
        allowedItems: curAllowed,
        department: deptRaw,
        contactName: cn ? cn.replace(/\s+/g, " ").trim() : null,
        jobDuty: jd,
        phone: ph ? ph.replace(/\s+/g, "").trim() : null,
        email: em ? em.replace(/\s+/g, "").trim() : null,
        cardBinNo: binRaw ? binRaw.replace(/\n/g, ", ") : null,
      });
    }
  }

  console.log(`총 ${contacts.length}건 파싱 완료. DB에 저장 중...`);

  // 기존 데이터 삭제 후 재삽입
  await prisma.localGovContact.deleteMany();
  await prisma.localGovContact.createMany({ data: contacts });

  console.log(`✅ ${contacts.length}건 저장 완료`);
  contacts.forEach((c, i) =>
    console.log(
      `  [${i + 1}] ${c.region} / ${c.city} / ${c.contactName ?? "-"} / ${c.phone ?? "-"}`
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
