ALTER TABLE "MockPaymentCard"
ADD COLUMN "encryptedCardNumber" TEXT,
ADD COLUMN "encryptedCardholderName" TEXT;

UPDATE "MockPaymentCard"
SET
  "encryptedCardNumber" = 'legacy-card-number-missing',
  "encryptedCardholderName" = 'legacy-cardholder-missing';

ALTER TABLE "MockPaymentCard"
ALTER COLUMN "encryptedCardNumber" SET NOT NULL,
ALTER COLUMN "encryptedCardholderName" SET NOT NULL;
