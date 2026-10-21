ALTER TABLE "Recipient"
ADD COLUMN "avatarObjectKey" TEXT,
ADD COLUMN "addressVersion" TEXT,
ADD COLUMN "addressProvinceCode" INTEGER,
ADD COLUMN "addressProvinceName" TEXT,
ADD COLUMN "addressDistrictCode" INTEGER,
ADD COLUMN "addressDistrictName" TEXT,
ADD COLUMN "addressWardCode" INTEGER,
ADD COLUMN "addressWardName" TEXT,
ADD COLUMN "addressLine" TEXT;

CREATE UNIQUE INDEX "Recipient_avatarObjectKey_key" ON "Recipient"("avatarObjectKey");
