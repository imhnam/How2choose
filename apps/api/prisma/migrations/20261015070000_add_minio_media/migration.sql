CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ProductMediaType" AS ENUM ('IMAGE', 'VIDEO');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN "avatarObjectKey" TEXT;

CREATE TABLE "ProductMedia" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "ProductMediaType" NOT NULL,
  "objectKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductMedia_objectKey_key" ON "ProductMedia"("objectKey");
CREATE INDEX "ProductMedia_productId_sortOrder_idx" ON "ProductMedia"("productId", "sortOrder");

ALTER TABLE "ProductMedia"
ADD CONSTRAINT "ProductMedia_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
