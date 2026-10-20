ALTER TABLE "ProductVariant"
  ADD COLUMN "packageWeightGram" INTEGER,
  ADD COLUMN "packageLengthCm" INTEGER,
  ADD COLUMN "packageWidthCm" INTEGER,
  ADD COLUMN "packageHeightCm" INTEGER;

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_packageWeightGram_check"
    CHECK ("packageWeightGram" IS NULL OR "packageWeightGram" > 0),
  ADD CONSTRAINT "ProductVariant_packageLengthCm_check"
    CHECK ("packageLengthCm" IS NULL OR ("packageLengthCm" > 0 AND "packageLengthCm" <= 200)),
  ADD CONSTRAINT "ProductVariant_packageWidthCm_check"
    CHECK ("packageWidthCm" IS NULL OR ("packageWidthCm" > 0 AND "packageWidthCm" <= 200)),
  ADD CONSTRAINT "ProductVariant_packageHeightCm_check"
    CHECK ("packageHeightCm" IS NULL OR ("packageHeightCm" > 0 AND "packageHeightCm" <= 200));