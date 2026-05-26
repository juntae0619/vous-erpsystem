-- Replace DisbursementType enum values
CREATE TYPE "DisbursementType_new" AS ENUM ('ALREADY_PAID', 'SCHEDULED');

ALTER TABLE "disbursements"
  ALTER COLUMN "itemType" TYPE "DisbursementType_new"
  USING (
    CASE
      WHEN "isPaid" = true THEN 'ALREADY_PAID'::"DisbursementType_new"
      ELSE 'SCHEDULED'::"DisbursementType_new"
    END
  );

DROP TYPE "DisbursementType";
ALTER TYPE "DisbursementType_new" RENAME TO "DisbursementType";
