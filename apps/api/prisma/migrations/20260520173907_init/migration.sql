-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "isModerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GlobalChatMessage" ADD COLUMN     "isModerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GuildMessage" ADD COLUMN     "isModerated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "IndexedEvent" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "contractName" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexedEvent_status_blockNumber_idx" ON "IndexedEvent"("status", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IndexedEvent_txHash_logIndex_key" ON "IndexedEvent"("txHash", "logIndex");

-- CreateIndex
CREATE INDEX "GuildMessage_guildId_createdAt_idx" ON "GuildMessage"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_playerAddress_createdAt_idx" ON "Notification"("playerAddress", "createdAt" DESC);
