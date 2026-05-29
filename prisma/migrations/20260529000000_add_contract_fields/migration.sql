-- AlterTable: Contract에 새 필드 추가
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "deptContact" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contractMethod" TEXT;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "commencementDate" DATE;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "billingMethod" TEXT;
