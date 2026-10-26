-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "originalUnitPriceVnd" DROP DEFAULT,
ALTER COLUMN "discountVnd" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "shippingRegions" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RecommendationRequest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationRequest_createdAt_idx" ON "RecommendationRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRequest_ownerId_key_key" ON "RecommendationRequest"("ownerId", "key");

-- AddForeignKey
ALTER TABLE "RecommendationRequest" ADD CONSTRAINT "RecommendationRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
