import { type NotificationType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test Ethereum addresses
const TEST_ADDRESSES = [
  "0x1111111111111111111111111111111111110001",
  "0x1111111111111111111111111111111111110002",
  "0x1111111111111111111111111111111111110003",
  "0x1111111111111111111111111111111111110004",
  "0x1111111111111111111111111111111111110005",
];

const TEST_USERNAMES = ["player1", "player2", "player3", "player4", "player5"];

async function main() {
  console.log("🌱 Seeding database...");

  // ──────────────────────────────────────────────
  // 1. Players
  // ──────────────────────────────────────────────
  console.log("Creating 5 test players...");

  const players = await Promise.all(
    TEST_ADDRESSES.map((address, i) =>
      prisma.player.upsert({
        where: { address },
        update: {},
        create: {
          address,
          username: TEST_USERNAMES[i],
          bio: `Test player ${i + 1} for ShardVeil dev environment.`,
          avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${TEST_USERNAMES[i]}`,
          twitterHandle: `${TEST_USERNAMES[i]}_sv`,
          isPrivate: false,
        },
      }),
    ),
  );

  console.log(`  Created ${players.length} players.`);

  // ──────────────────────────────────────────────
  // 2. Guild: "Alpha Guild" owned by player1
  // ──────────────────────────────────────────────
  console.log("Creating Alpha Guild with 3 members...");

  const guild = await prisma.guild.upsert({
    where: { name: "Alpha Guild" },
    update: {},
    create: {
      name: "Alpha Guild",
      description: "The first and finest guild in ShardVeil.",
      ownerAddress: TEST_ADDRESSES[0],
      memberCount: 3,
      warWins: 2,
    },
  });

  // Add players 1-3 as members (upsert to avoid duplicates)
  const memberRoles = ["OWNER", "OFFICER", "MEMBER"];

  for (let i = 0; i < 3; i++) {
    await prisma.guildMember.upsert({
      where: {
        guildId_playerAddress: {
          guildId: guild.id,
          playerAddress: TEST_ADDRESSES[i],
        },
      },
      update: {},
      create: {
        guildId: guild.id,
        playerAddress: TEST_ADDRESSES[i],
        role: memberRoles[i],
      },
    });
  }

  console.log(`  Guild "${guild.name}" created with 3 members.`);

  // ──────────────────────────────────────────────
  // 3. Notifications for player1 (10 total)
  // ──────────────────────────────────────────────
  console.log("Creating 10 notifications for player1...");

  const player1Address = TEST_ADDRESSES[0];
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

  const notifications: Array<{
    playerAddress: string;
    type: NotificationType;
    data: object;
    readAt?: Date;
  }> = [
    // FRIEND_REQUEST x3 (2 unread, 1 read)
    {
      playerAddress: player1Address,
      type: "FRIEND_REQUEST" as NotificationType,
      data: {
        fromAddress: TEST_ADDRESSES[1],
        fromUsername: "player2",
        message: "player2 wants to be your friend!",
      },
    },
    {
      playerAddress: player1Address,
      type: "FRIEND_REQUEST" as NotificationType,
      data: {
        fromAddress: TEST_ADDRESSES[2],
        fromUsername: "player3",
        message: "player3 wants to be your friend!",
      },
    },
    {
      playerAddress: player1Address,
      type: "FRIEND_REQUEST" as NotificationType,
      data: {
        fromAddress: TEST_ADDRESSES[3],
        fromUsername: "player4",
        message: "player4 wants to be your friend!",
      },
      readAt: minutesAgo(30),
    },
    // BATTLE_CHALLENGE x3 (1 unread, 2 read)
    {
      playerAddress: player1Address,
      type: "BATTLE_CHALLENGE" as NotificationType,
      data: {
        challengerAddress: TEST_ADDRESSES[1],
        challengerUsername: "player2",
        battleId: "battle_mock_001",
        message: "player2 challenged you to a battle!",
      },
    },
    {
      playerAddress: player1Address,
      type: "BATTLE_CHALLENGE" as NotificationType,
      data: {
        challengerAddress: TEST_ADDRESSES[2],
        challengerUsername: "player3",
        battleId: "battle_mock_002",
        message: "player3 challenged you to a battle!",
      },
      readAt: minutesAgo(60),
    },
    {
      playerAddress: player1Address,
      type: "BATTLE_CHALLENGE" as NotificationType,
      data: {
        challengerAddress: TEST_ADDRESSES[4],
        challengerUsername: "player5",
        battleId: "battle_mock_003",
        message: "player5 challenged you to a battle!",
      },
      readAt: minutesAgo(120),
    },
    // SYSTEM x4 (2 unread, 2 read)
    {
      playerAddress: player1Address,
      type: "SYSTEM" as NotificationType,
      data: {
        title: "Welcome to ShardVeil!",
        message:
          "Your account is ready. Start your journey by opening your first pack.",
        action: "open_pack",
      },
      readAt: minutesAgo(1440), // 1 day ago
    },
    {
      playerAddress: player1Address,
      type: "SYSTEM" as NotificationType,
      data: {
        title: "Season 1 Started",
        message: "Season 1 has begun! Compete for glory and VEIL rewards.",
        action: "view_leaderboard",
      },
      readAt: minutesAgo(720), // 12 hours ago
    },
    {
      playerAddress: player1Address,
      type: "SYSTEM" as NotificationType,
      data: {
        title: "New Tournament Available",
        message: "A Swiss-format tournament is starting soon. Register now!",
        action: "view_tournament",
      },
    },
    {
      playerAddress: player1Address,
      type: "SYSTEM" as NotificationType,
      data: {
        title: "Maintenance Window",
        message:
          "Scheduled maintenance on 2026-05-17 02:00 UTC. Plan accordingly.",
        action: null,
      },
    },
  ];

  let notifCount = 0;
  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
        playerAddress: notif.playerAddress,
        type: notif.type,
        data: notif.data,
        readAt: notif.readAt ?? null,
      },
    });
    notifCount++;
  }

  console.log(`  Created ${notifCount} notifications for player1.`);

  // ──────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────
  const playerCount = await prisma.player.count();
  const guildCount = await prisma.guild.count();
  const memberCount = await prisma.guildMember.count();
  const notificationCount = await prisma.notification.count();

  console.log("\nSeed complete!");
  console.log(`  Players:       ${playerCount}`);
  console.log(`  Guilds:        ${guildCount}`);
  console.log(`  Guild members: ${memberCount}`);
  console.log(`  Notifications: ${notificationCount}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
