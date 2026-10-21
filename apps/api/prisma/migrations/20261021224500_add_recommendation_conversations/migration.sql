CREATE TYPE "RecommendationMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "RecommendationConversation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "budgetVnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecommendationConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecommendationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "RecommendationMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "bundles" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecommendationConversation_ownerId_recipientId_updatedAt_idx"
ON "RecommendationConversation"("ownerId", "recipientId", "updatedAt");

CREATE INDEX "RecommendationMessage_conversationId_createdAt_idx"
ON "RecommendationMessage"("conversationId", "createdAt");

ALTER TABLE "RecommendationConversation"
ADD CONSTRAINT "RecommendationConversation_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecommendationConversation"
ADD CONSTRAINT "RecommendationConversation_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecommendationMessage"
ADD CONSTRAINT "RecommendationMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "RecommendationConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
