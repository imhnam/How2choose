CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED', 'PAYMENT_REVIEW');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
CREATE TYPE "ShipmentStatus" AS ENUM ('NOT_CREATED', 'CREATED', 'FAILED');

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "addressVersion" TEXT NOT NULL,
  "provinceCode" INTEGER NOT NULL,
  "provinceName" TEXT NOT NULL,
  "districtCode" INTEGER,
  "districtName" TEXT,
  "wardCode" INTEGER NOT NULL,
  "wardName" TEXT NOT NULL,
  "addressLine" TEXT NOT NULL,
  "deliveryNote" TEXT,
  "subtotalVnd" INTEGER NOT NULL,
  "shippingFeeVnd" INTEGER NOT NULL,
  "totalVnd" INTEGER NOT NULL,
  "packageWeightGram" INTEGER NOT NULL,
  "packageLengthCm" INTEGER NOT NULL,
  "packageWidthCm" INTEGER NOT NULL,
  "packageHeightCm" INTEGER NOT NULL,
  "ghnServiceTypeId" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3),
  "shipmentStatus" "ShipmentStatus" NOT NULL DEFAULT 'NOT_CREATED',
  "ghnOrderCode" TEXT,
  "ghnShipmentError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_ghnOrderCode_key" ON "Order"("ghnOrderCode");
CREATE UNIQUE INDEX "Order_ownerId_idempotencyKey_key" ON "Order"("ownerId", "idempotencyKey");
CREATE INDEX "Order_ownerId_createdAt_idx" ON "Order"("ownerId", "createdAt");
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "variantName" TEXT NOT NULL,
  "unitPriceVnd" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotalVnd" INTEGER NOT NULL,
  "packageWeightGram" INTEGER NOT NULL,
  "packageLengthCm" INTEGER NOT NULL,
  "packageWidthCm" INTEGER NOT NULL,
  "packageHeightCm" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "txnRef" TEXT NOT NULL,
  "gatewayTransactionNo" TEXT,
  "amountVnd" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "responseCode" TEXT,
  "bankCode" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentAttempt_orderId_key" ON "PaymentAttempt"("orderId");
CREATE UNIQUE INDEX "PaymentAttempt_txnRef_key" ON "PaymentAttempt"("txnRef");
CREATE UNIQUE INDEX "PaymentAttempt_gatewayTransactionNo_key" ON "PaymentAttempt"("gatewayTransactionNo");
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;