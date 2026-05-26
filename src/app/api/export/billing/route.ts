import { requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format, startOfMonth, endOfMonth } from "date-fns";

// GET /api/export/billing?year=2026&month=5  (빈 month = 전체)
export async function GET(req: Request) {
  const { session, error } = await requireManager();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

  let dateWhere = {};
  if (year && month) {
    const from = startOfMonth(new Date(year, month - 1, 1));
    const to = endOfMonth(from);
    dateWhere = { billingDate: { gte: from, lte: to } };
  } else if (year) {
    dateWhere = {
      billingDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59),
      },
    };
  }

  const billings = await prisma.billing.findMany({
    where: dateWhere,
    include: {
      contract: {
        select: { contractName: true, localGovName: true, contractNumber: true },
      },
      payments: true,
    },
    orderBy: { billingDate: "asc" },
  });

  // 청구 시트
  const billingRows = billings.map((b) => ({
    "지자체": b.contract.localGovName,
    "계약명": b.contract.contractName,
    "계약번호": b.contract.contractNumber,
    "청구일": format(b.billingDate, "yyyy-MM-dd"),
    "납부기한": format(b.dueDate, "yyyy-MM-dd"),
    "서비스금액": Number(b.serviceAmount),
    "수수료": Number(b.merchantFeeAmt),
    "청구금액": Number(b.totalAmount),
    "입금액": Number(b.paidAmount),
    "미수금": Number(b.totalAmount) - Number(b.paidAmount),
    "수금상태": b.paymentStatus,
    "계산서상태": b.taxInvoiceStatus,
    "계산서번호": b.taxInvoiceNumber ?? "",
    "비고": b.note ?? "",
  }));

  // 입금 내역 시트
  const paymentRows = billings.flatMap((b) =>
    b.payments.map((p) => ({
      "지자체": b.contract.localGovName,
      "계약명": b.contract.contractName,
      "청구일": format(b.billingDate, "yyyy-MM-dd"),
      "입금일": format(p.paidAt, "yyyy-MM-dd"),
      "입금액": Number(p.amount),
      "비고": p.note ?? "",
    }))
  );

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(billingRows);
  ws1["!cols"] = [
    { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "청구현황");

  const ws2 = XLSX.utils.json_to_sheet(paymentRows);
  ws2["!cols"] = [
    { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "입금내역");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const label = year && month ? `${year}년${month}월` : year ? `${year}년` : "전체";
  const fileName = `수금현황_${label}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
