-- Contract: 바우처 필드
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "voucherName" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "voucherType" TEXT;

-- Billing: 청구 기간·매출 필드
ALTER TABLE "billings" ADD COLUMN IF NOT EXISTS "billPeriod" TEXT;
ALTER TABLE "billings" ADD COLUMN IF NOT EXISTS "billPeriodRange" TEXT;
ALTER TABLE "billings" ADD COLUMN IF NOT EXISTS "billMonth" TEXT;
ALTER TABLE "billings" ADD COLUMN IF NOT EXISTS "merchantSales" DECIMAL(15,0) NOT NULL DEFAULT 0;
