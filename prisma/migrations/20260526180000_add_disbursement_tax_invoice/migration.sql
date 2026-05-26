-- AlterTable
ALTER TABLE "disbursements" ADD COLUMN "taxInvoiceStatus" "TaxInvoiceStatus" NOT NULL DEFAULT 'NOT_ISSUED';
ALTER TABLE "disbursements" ADD COLUMN "taxInvoiceNumber" TEXT;
ALTER TABLE "disbursements" ADD COLUMN "taxInvoiceDate" DATE;
