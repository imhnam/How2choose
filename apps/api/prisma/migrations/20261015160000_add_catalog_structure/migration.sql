ALTER TABLE "Product"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "supplier" TEXT,
  ADD COLUMN "purchaseCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discountPercent" INTEGER,
  ADD COLUMN "discountAmountVnd" INTEGER;

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_sortOrder_idx" ON "Category"("parentId", "sortOrder");
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProductCategory" (
  "productId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId")
);
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT,
  "color" TEXT,
  "size" TEXT,
  "material" TEXT,
  "priceVnd" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "discountPercent" INTEGER,
  "discountAmountVnd" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_active_idx" ON "ProductVariant"("productId", "active");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductMedia" ADD COLUMN "variantId" TEXT;
CREATE INDEX "ProductMedia_variantId_sortOrder_idx" ON "ProductMedia"("variantId", "sortOrder");
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_discountPercent_check"
  CHECK ("discountPercent" IS NULL OR ("discountPercent" >= 0 AND "discountPercent" <= 100));
ALTER TABLE "Product" ADD CONSTRAINT "Product_discountAmountVnd_check"
  CHECK ("discountAmountVnd" IS NULL OR "discountAmountVnd" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_price_nonnegative"
  CHECK ("priceVnd" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_nonnegative"
  CHECK ("stock" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_discountPercent_check"
  CHECK ("discountPercent" IS NULL OR ("discountPercent" >= 0 AND "discountPercent" <= 100));
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_discountAmountVnd_check"
  CHECK ("discountAmountVnd" IS NULL OR "discountAmountVnd" >= 0);
