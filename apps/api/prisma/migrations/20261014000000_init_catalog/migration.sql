CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priceVnd" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_price_nonnegative" CHECK ("priceVnd" >= 0),
  CONSTRAINT "Product_stock_nonnegative" CHECK ("stock" >= 0)
);
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
