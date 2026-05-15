-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PACK_OPENED', 'BATTLE_WON', 'BATTLE_LOST', 'CARD_CRAFTED', 'CARD_TRADED', 'GUILD_JOINED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST', 'BATTLE_CHALLENGE', 'TRADE_OFFER', 'GUILD_INVITE', 'ACHIEVEMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('PENDING', 'REGISTRATION', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Player" (
    "address" TEXT NOT NULL,
    "username" TEXT,
    "bio" VARCHAR(160),
    "avatarUrl" TEXT,
    "twitterHandle" TEXT,
    "discordHandle" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Friend" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "player1" TEXT NOT NULL,
    "player2" TEXT NOT NULL,
    "winner" TEXT,
    "player1Deck" TEXT[],
    "player2Deck" TEXT[],
    "log" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "txHash" TEXT,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL,
    "playerAddress" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "cardIds" TEXT[],
    "txHash" TEXT,
    "vrfRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "actorAddress" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "playerAddress" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "ownerAddress" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "warWins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "playerAddress" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalChatMessage" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL DEFAULT 'global',
    "senderAddress" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'PENDING',
    "format" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "entryFee" TEXT,
    "prizePool" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerAddress" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "battleId" TEXT,
    "round" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeOffer" (
    "id" TEXT NOT NULL,
    "initiatorAddress" TEXT NOT NULL,
    "targetAddress" TEXT,
    "offeredCardIds" TEXT[],
    "wantedCardIds" TEXT[],
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "playerAddress" TEXT NOT NULL,
    "seasonExp" INTEGER NOT NULL DEFAULT 0,
    "battleWins" INTEGER NOT NULL DEFAULT 0,
    "craftCount" INTEGER NOT NULL DEFAULT 0,
    "snappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Friend_playerId_friendId_key" ON "Friend"("playerId", "friendId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_fromAddress_toAddress_key" ON "FriendRequest"("fromAddress", "toAddress");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_receiverId_createdAt_idx" ON "DirectMessage"("senderId", "receiverId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Battle_player1_settledAt_idx" ON "Battle"("player1", "settledAt" DESC);

-- CreateIndex
CREATE INDEX "Battle_player2_settledAt_idx" ON "Battle"("player2", "settledAt" DESC);

-- CreateIndex
CREATE INDEX "Pack_playerAddress_createdAt_idx" ON "Pack"("playerAddress", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Activity_actorAddress_createdAt_idx" ON "Activity"("actorAddress", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_playerAddress_readAt_idx" ON "Notification"("playerAddress", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_guildId_playerAddress_key" ON "GuildMember"("guildId", "playerAddress");

-- CreateIndex
CREATE INDEX "GlobalChatMessage_room_createdAt_idx" ON "GlobalChatMessage"("room", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerAddress_key" ON "TournamentPlayer"("tournamentId", "playerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardSnapshot_seasonId_playerAddress_key" ON "LeaderboardSnapshot"("seasonId", "playerAddress");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_seasonId_seasonExp_idx" ON "LeaderboardSnapshot"("seasonId", "seasonExp" DESC);

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_fromAddress_fkey" FOREIGN KEY ("fromAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_toAddress_fkey" FOREIGN KEY ("toAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_player1_fkey" FOREIGN KEY ("player1") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_player2_fkey" FOREIGN KEY ("player2") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winner_fkey" FOREIGN KEY ("winner") REFERENCES "Player"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_playerAddress_fkey" FOREIGN KEY ("playerAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorAddress_fkey" FOREIGN KEY ("actorAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_playerAddress_fkey" FOREIGN KEY ("playerAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_playerAddress_fkey" FOREIGN KEY ("playerAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_senderAddress_fkey" FOREIGN KEY ("senderAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalChatMessage" ADD CONSTRAINT "GlobalChatMessage_senderAddress_fkey" FOREIGN KEY ("senderAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerAddress_fkey" FOREIGN KEY ("playerAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_initiatorAddress_fkey" FOREIGN KEY ("initiatorAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_targetAddress_fkey" FOREIGN KEY ("targetAddress") REFERENCES "Player"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardSnapshot" ADD CONSTRAINT "LeaderboardSnapshot_playerAddress_fkey" FOREIGN KEY ("playerAddress") REFERENCES "Player"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
