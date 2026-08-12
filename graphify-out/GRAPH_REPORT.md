# Graph Report - . (2026-08-12)

## Corpus Check

- 245 files · ~98,312 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1399 nodes · 2178 edges · 115 communities (102 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Battle WebSocket Channel|Battle WebSocket Channel]]
- [[_COMMUNITY_Contract ABI Bindings|Contract ABI Bindings]]
- [[_COMMUNITY_WebSocket Channel Registry|WebSocket Channel Registry]]
- [[_COMMUNITY_Card Browsing UI|Card Browsing UI]]
- [[_COMMUNITY_Card Detail Page|Card Detail Page]]
- [[_COMMUNITY_Shared ESLint Config|Shared ESLint Config]]
- [[_COMMUNITY_Chat Channel|Chat Channel]]
- [[_COMMUNITY_Web App Dependencies|Web App Dependencies]]
- [[_COMMUNITY_Pack Contract Hooks|Pack Contract Hooks]]
- [[_COMMUNITY_Notification Service|Notification Service]]
- [[_COMMUNITY_Marketing Landing Sections|Marketing Landing Sections]]
- [[_COMMUNITY_Prisma and Indexer Backfill|Prisma and Indexer Backfill]]
- [[_COMMUNITY_Server Entry and Workers|Server Entry and Workers]]
- [[_COMMUNITY_Shared Types and Constants|Shared Types and Constants]]
- [[_COMMUNITY_Web Providers and Chains|Web Providers and Chains]]
- [[_COMMUNITY_API Error Classes|API Error Classes]]
- [[_COMMUNITY_SIWE Auth Primitives|SIWE Auth Primitives]]
- [[_COMMUNITY_Base TypeScript Config|Base TypeScript Config]]
- [[_COMMUNITY_Contracts Package Manifest|Contracts Package Manifest]]
- [[_COMMUNITY_Leaderboard Tables|Leaderboard Tables]]
- [[_COMMUNITY_Wallet Connect and Auth Gate|Wallet Connect and Auth Gate]]
- [[_COMMUNITY_Hall of Fame Page|Hall of Fame Page]]
- [[_COMMUNITY_WebSocket Client Hooks|WebSocket Client Hooks]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Shared UI Primitives|Shared UI Primitives]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]

## God Nodes (most connected - your core abstractions)

1. `redis` - 28 edges
2. `ConnectionManager` - 22 edges
3. `compilerOptions` - 18 edges
4. `scripts` - 15 edges
5. `useAuthStore` - 15 edges
6. `Env` - 14 edges
7. `getBattleState()` - 13 edges
8. `publicClient` - 12 edges
9. `CacheService` - 12 edges
10. `scripts` - 12 edges

## Surprising Connections (you probably didn't know these)

- `main()` --calls--> `getAddresses()` [INFERRED]
  apps/api/scripts/indexer-backfill.ts → packages/contracts/src/addresses.ts
- `main()` --calls--> `getAddresses()` [INFERRED]
  apps/api/scripts/indexer-replay.ts → packages/contracts/src/addresses.ts
- `getContract()` --calls--> `getAddresses()` [INFERRED]
  apps/api/src/config/viem.ts → packages/contracts/src/addresses.ts
- `finalizeTournament()` --calls--> `getAddresses()` [INFERRED]
  apps/api/src/services/tournamentService.ts → packages/contracts/src/addresses.ts
- `processXpGrantJob()` --calls--> `getAddresses()` [INFERRED]
  apps/api/src/workers/xpSigner.ts → packages/contracts/src/addresses.ts

## Import Cycles

- None detected.

## Communities (115 total, 13 thin omitted)

### Community 0 - "Battle WebSocket Channel"

Cohesion: 0.08
Nodes (55): battleChannelHandler(), buildBothRevealedMsg(), buildErrorMsg(), buildMatchSettledMsg(), buildOpponentDisconnectedMsg(), buildOpponentJoinedMsg(), buildReconnectDeadlineMsg(), buildTurnUpdateMsg() (+47 more)

### Community 1 - "Contract ABI Bindings"

Cohesion: 0.06
Nodes (35): ammMarketplaceAbi, battleEngineAbi, cardNftAbi, cardRegistryAbi, craftingEngineAbi, guildSystemAbi, packContractAbi, shardTokenAbi (+27 more)

### Community 2 - "WebSocket Channel Registry"

Cohesion: 0.08
Nodes (38): registerBattleChannel(), registerChatChannel(), buildErrorMessage(), buildSubscribedMessage(), handleSubscribe(), notificationChannelHandler(), registerNotificationChannel(), safeSend() (+30 more)

### Community 3 - "Card Browsing UI"

Cohesion: 0.07
Nodes (27): CardFilters(), RARITIES, RARITY_CHIP_CLASS, RARITY_INACTIVE_CLASS, SORT_OPTIONS, CardGrid(), CardGridProps, CardsApiResponse (+19 more)

### Community 4 - "Card Detail Page"

Cohesion: 0.09
Nodes (24): CardDetailPage(), fetchCard, generateMetadata(), PageProps, CardDetail, CardDetailView(), CardDetailViewProps, getRarityKey() (+16 more)

### Community 5 - "Shared ESLint Config"

Cohesion: 0.06
Nodes (35): devDependencies, eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-simple-import-sort, @next/eslint-plugin-next, typescript-eslint, optional (+27 more)

### Community 6 - "Chat Channel"

Cohesion: 0.12
Nodes (33): ALLOWED_GLOBAL_ROOMS, buildChatMessage(), buildErrorMessage(), buildJoinedMessage(), buildLeftMessage(), buildMutedMessage(), buildTypingState(), chatChannelHandler() (+25 more)

### Community 7 - "Web App Dependencies"

Cohesion: 0.06
Nodes (34): dependencies, class-variance-authority, clsx, date-fns, @dnd-kit/core, @dnd-kit/sortable, gsap, @gsap/react (+26 more)

### Community 8 - "Pack Contract Hooks"

Cohesion: 0.09
Nodes (25): ContractAbi, useContractAddress(), usePackContractEvents(), usePackContractRead(), usePackContractWrite(), cn(), formatCostWei(), formatRarity() (+17 more)

### Community 9 - "Notification Service"

Cohesion: 0.11
Nodes (15): listQuerySchema, markReadBodySchema, notificationRouter, buildPushEnvelope(), create(), decrementUnreadCache(), getUnreadCount(), invalidateUnreadCache() (+7 more)

### Community 10 - "Marketing Landing Sections"

Cohesion: 0.09
Nodes (17): CTAFooter(), FeatureCardProps, FeatureHighlight(), FEATURES, Hero(), buildStatItems(), fetchLiveStats(), LiveStats() (+9 more)

### Community 11 - "Prisma and Indexer Backfill"

Cohesion: 0.13
Nodes (16): globalForPrisma, BASE_PARAMS, BUYER, buildContractEvents(), ContractEventDef, main(), parseArgs(), buildContractEvents() (+8 more)

### Community 12 - "Server Entry and Workers"

Cohesion: 0.12
Nodes (17): bullConnection, tournamentService, server, shutdown(), { wsApp, injectWebSocket }, ActivityEventJob, EVENT_MAP, shutdown() (+9 more)

### Community 13 - "Shared Types and Constants"

Cohesion: 0.12
Nodes (14): CRAFTING_RECIPES, PACK_TIERS, RANK_THRESHOLDS, RARITY_COLORS, Address, BattleRank, BattleState, CardRarity (+6 more)

### Community 14 - "Web Providers and Chains"

Cohesion: 0.13
Nodes (13): cinzel, inter, metadata, arbitrum, arbitrumSepolia, chainId, publicClient, wagmiConfig (+5 more)

### Community 15 - "API Error Classes"

Cohesion: 0.14
Nodes (10): ApiError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, UnauthorizedError, ValidationError, errorHandler() (+2 more)

### Community 16 - "SIWE Auth Primitives"

Cohesion: 0.20
Nodes (15): buildMessage(), consumeNonce(), generateNonce(), getDomain(), runTests(), testAccount, verifySignature(), verifyBodySchema (+7 more)

### Community 17 - "Base TypeScript Config"

Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, composite, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, isolatedModules (+11 more)

### Community 18 - "Contracts Package Manifest"

Cohesion: 0.11
Nodes (19): dependencies, @shardveil/shared, devDependencies, @shardveil/config, tsx, typescript, exports, import (+11 more)

### Community 19 - "Leaderboard Tables"

Cohesion: 0.15
Nodes (15): CrafterEntry, CraftersTable(), CraftersTableProps, GuildEntry, GuildsTable(), GuildsTableProps, fetchCrafters(), fetchGuilds() (+7 more)

### Community 20 - "Wallet Connect and Auth Gate"

Cohesion: 0.13
Nodes (11): AuthGate(), AuthGateProps, SessionResponse, CONNECTOR_LABELS, ConnectWalletButton(), ConnectPageContent(), AuthActions, AuthState (+3 more)

### Community 21 - "Hall of Fame Page"

Cohesion: 0.12
Nodes (11): fetchHallOfFame(), HallOfFameData, HallOfFamePage(), metadata, structuredData, CategoryTable(), CategoryTableProps, CategoryTableRow (+3 more)

### Community 22 - "WebSocket Client Hooks"

Cohesion: 0.14
Nodes (14): useWs(), DEFAULT_SUBSCRIBE_CHANNELS, useWsContext(), WsChannel, WsContext, WsContextType, WsEnvelope, WsMessageHandler (+6 more)

### Community 23 - "Community 23"

Cohesion: 0.21
Nodes (6): Env, envSchema, pinoConfig, loggerMiddleware(), auth, app

### Community 24 - "Community 24"

Cohesion: 0.19
Nodes (12): ActivityEntry, ActivityFeed(), DashboardContent(), formatBalance(), ProfileMe, useApi(), qk, cn() (+4 more)

### Community 25 - "Community 25"

Cohesion: 0.14
Nodes (8): Announcement, AnnouncementBanner(), AnnouncementType, typeStyles, Footer(), ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState

### Community 26 - "Shared UI Primitives"

Cohesion: 0.16
Nodes (11): cn(), Modal(), ModalProps, RARITIES, cn(), TabItem, Tabs(), TabsProps (+3 more)

### Community 27 - "Community 27"

Cohesion: 0.17
Nodes (10): CONTRACT_ABIS, ContractName, publicClient, extractAddresses(), ContractName, addresses, heartbeatInterval, INDEXED_CONTRACT_NAMES (+2 more)

### Community 28 - "Community 28"

Cohesion: 0.19
Nodes (11): useNetworkCheck(), UseNetworkCheckReturn, NetworkBanner(), useNetworkBannerHeight(), Button, ButtonProps, buttonVariants, cn() (+3 more)

### Community 29 - "Community 29"

Cohesion: 0.17
Nodes (11): metadata, structuredData, PhaseCard(), PhaseCardProps, PhaseStatus, STATUS_CONFIG, PhaseReveal(), PhaseRevealProps (+3 more)

### Community 30 - "Community 30"

Cohesion: 0.13
Nodes (15): devDependencies, @shardveil/config, typescript, exports, import, main, name, private (+7 more)

### Community 31 - "Community 31"

Cohesion: 0.13
Nodes (15): devDependencies, eslint, pino-pretty, prisma, @shardveil/config, supertest, tsup, tsx (+7 more)

### Community 32 - "Community 32"

Cohesion: 0.13
Nodes (15): scripts, build, clean, db:migrate, db:reset, db:seed, db:studio, dev (+7 more)

### Community 33 - "Community 33"

Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, eslint-config-next, eslint-plugin-react, eslint-plugin-react-hooks, @next/eslint-plugin-next, postcss (+7 more)

### Community 34 - "Community 34"

Cohesion: 0.26
Nodes (10): fetchProfile, generateMetadata(), PageProps, ProfilePage(), NotFound(), truncateAddress(), Avatar(), ProfileApiResponse (+2 more)

### Community 35 - "Community 35"

Cohesion: 0.14
Nodes (14): dependencies, bullmq, dotenv, hono, @hono/node-server, @hono/node-ws, ioredis, jose (+6 more)

### Community 36 - "Community 36"

Cohesion: 0.19
Nodes (7): SiweFlow(), NonceResponse, useAuth(), VerifyResponse, removeToken(), storeToken(), StoreTokenPayload

### Community 37 - "Community 37"

Cohesion: 0.16
Nodes (9): redis, FRIEND, RECEIVER, SENDER, Socket, SUBSCRIBER, addresses, Socket (+1 more)

### Community 38 - "Community 38"

Cohesion: 0.16
Nodes (8): OG_COLORS, OG_RARITY_COLORS, CACHE_HEADERS, CardDetail, IMAGE_OPTIONS, ProfileApiResponse, ProfileOG(), ProfileStats

### Community 39 - "Community 39"

Cohesion: 0.16
Nodes (6): metadata, CONTRACT_ADDRESSES, MarketingFooter(), SOCIAL_LINKS, MarketingNav(), NAV_LINKS

### Community 40 - "Community 40"

Cohesion: 0.26
Nodes (11): profileRouter, updateAvatarBodySchema, updateProfileBodySchema, checkUsernameAvailable(), getProfile(), getProfileCacheKey(), playerToProfileData(), ProfileData (+3 more)

### Community 41 - "Community 41"

Cohesion: 0.14
Nodes (13): compilerOptions, baseUrl, composite, incremental, jsx, lib, noEmit, paths (+5 more)

### Community 42 - "Community 42"

Cohesion: 0.29
Nodes (11): tournamentOracleWallet(), advanceRound(), finalizeTournament(), generateBracket(), getWinCounts(), loadPairings(), PairingEntry, pairingKey() (+3 more)

### Community 43 - "Community 43"

Cohesion: 0.17
Nodes (12): scripts, build, clean, dev, format, lint, prepare, services:down (+4 more)

### Community 44 - "Community 44"

Cohesion: 0.18
Nodes (6): leaderboardRouter, CrafterEntry, GuildEntry, LeaderboardEntry, LeaderboardResponse, LeaderboardService

### Community 45 - "Community 45"

Cohesion: 0.17
Nodes (12): dependsOn, outputs, cache, tasks, build, clean, test, typecheck (+4 more)

### Community 46 - "Community 46"

Cohesion: 0.26
Nodes (8): metadata, structuredData, WHITEPAPER_SECTIONS, Section(), SectionProps, WhitepaperSection, TableOfContents(), TableOfContentsProps

### Community 47 - "Community 47"

Cohesion: 0.18
Nodes (10): compilerOptions, composite, lib, module, moduleResolution, noEmit, noImplicitAny, exclude (+2 more)

### Community 48 - "Community 48"

Cohesion: 0.18
Nodes (10): compilerOptions, composite, declarationMap, outDir, rootDir, exclude, extends, include (+2 more)

### Community 49 - "Community 49"

Cohesion: 0.22
Nodes (9): NAV_ITEMS, NavItem, Sidebar(), Language, Theme, UiActions, UiState, UiStore (+1 more)

### Community 50 - "Community 50"

Cohesion: 0.18
Nodes (10): name, private, scripts, build, clean, dev, lint, start (+2 more)

### Community 51 - "Community 51"

Cohesion: 0.27
Nodes (7): cn(), StatCard(), StatCardProps, Card(), CardProps, CardRarityVariant, cn()

### Community 52 - "Community 52"

Cohesion: 0.20
Nodes (9): husky.sh script, devDependencies, @commitlint/cli, @commitlint/config-conventional, eslint, husky, lint-staged, prettier (+1 more)

### Community 53 - "Community 53"

Cohesion: 0.27
Nodes (8): formatAddress(), Navbar(), Notification, NotificationActions, NotificationState, NotificationStore, NotificationType, useNotificationStore

### Community 54 - "Community 54"

Cohesion: 0.20
Nodes (6): authNonceLimit, authVerifyLimit, chatLimit, heavyReadLimit, RateLimitOptions, standardLimit

### Community 55 - "Community 55"

Cohesion: 0.20
Nodes (9): compilerOptions, lib, outDir, paths, rootDir, exclude, extends, include (+1 more)

### Community 56 - "Community 56"

Cohesion: 0.31
Nodes (7): settlerWallet(), addresses, buildMatchSettledMsg(), notifyBothPlayers(), processSettlementJob(), SettlementJob, worker

### Community 57 - "Community 57"

Cohesion: 0.28
Nodes (7): getRankBadgeClass(), getRankLabel(), RANK_BADGE_CLASS, RankKey, Stats, StatsGrid(), StatsGridProps

### Community 58 - "Community 58"

Cohesion: 0.25
Nodes (7): name, prisma, schema, seed, private, type, version

### Community 59 - "Community 59"

Cohesion: 0.32
Nodes (6): xpOracleWallet(), markProcessed(), processXpGrantJob(), worker, XP_AMOUNTS, XpGrantJob

### Community 60 - "Community 60"

Cohesion: 0.25
Nodes (4): BATTLE_RANK_COLORS, RankedPlayer, RankedTable(), RankedTableProps

### Community 61 - "Community 61"

Cohesion: 0.25
Nodes (3): AdminContractName, CONTRACT_ABI_MAP, WELL_KNOWN_ROLES

### Community 62 - "Community 62"

Cohesion: 0.43
Nodes (6): ContextVariableMap, isTokenRevoked(), optionalAuth(), requireAuth(), verifyAndDecodeToken(), messagesRouter

### Community 63 - "Community 63"

Cohesion: 0.25
Nodes (7): lint-staged, {apps,packages}/\*_/_.{ts,tsx,js}, \*.{json,md}, name, packageManager, private, type

### Community 64 - "Community 64"

Cohesion: 0.25
Nodes (6): **dirname, errors, FILE_MAP, **filename, sourceDir, targetDir

### Community 65 - "Community 65"

Cohesion: 0.25
Nodes (7): BattleActions, BattleMatchState, BattlePhase, BattleStore, BattleUiState, initialState, useBattleStore

### Community 67 - "Community 67"

Cohesion: 0.53
Nodes (5): ContractAbi, useAMMMarketplaceEvents(), useAMMMarketplaceRead(), useAMMMarketplaceWrite(), useContractAddress()

### Community 68 - "Community 68"

Cohesion: 0.53
Nodes (5): ContractAbi, useBattleEngineEvents(), useBattleEngineRead(), useBattleEngineWrite(), useContractAddress()

### Community 69 - "Community 69"

Cohesion: 0.53
Nodes (5): ContractAbi, useCardNFTEvents(), useCardNFTRead(), useCardNFTWrite(), useContractAddress()

### Community 70 - "Community 70"

Cohesion: 0.53
Nodes (5): ContractAbi, useCardRegistryEvents(), useCardRegistryRead(), useCardRegistryWrite(), useContractAddress()

### Community 71 - "Community 71"

Cohesion: 0.53
Nodes (5): ContractAbi, useContractAddress(), useCraftingEngineEvents(), useCraftingEngineRead(), useCraftingEngineWrite()

### Community 72 - "Community 72"

Cohesion: 0.53
Nodes (5): ContractAbi, useContractAddress(), useGuildSystemEvents(), useGuildSystemRead(), useGuildSystemWrite()

### Community 73 - "Community 73"

Cohesion: 0.53
Nodes (5): ContractAbi, useContractAddress(), useShardTokenEvents(), useShardTokenRead(), useShardTokenWrite()

### Community 74 - "Community 74"

Cohesion: 0.53
Nodes (5): ContractAbi, useContractAddress(), useTreasuryEvents(), useTreasuryRead(), useTreasuryWrite()

### Community 75 - "Community 75"

Cohesion: 0.53
Nodes (5): ContractAbi, useContractAddress(), useVeilTokenEvents(), useVeilTokenRead(), useVeilTokenWrite()

### Community 76 - "Community 76"

Cohesion: 0.40
Nodes (3): api(), ApiError, ErrorBody

### Community 77 - "Community 77"

Cohesion: 0.33
Nodes (5): LeaderboardTabs(), LeaderboardTabsProps, Tab, TabKey, TABS

### Community 78 - "Community 78"

Cohesion: 0.33
Nodes (5): PlayerActions, PlayerCacheEntry, PlayerState, PlayerStore, usePlayerStore

### Community 79 - "Community 79"

Cohesion: 0.33
Nodes (5): compilerOptions, skipLibCheck, strict, files, references

### Community 80 - "Community 80"

Cohesion: 0.47
Nodes (5): Badge(), BadgeProps, cn(), RarityLower, toLowerRarity()

### Community 81 - "Community 81"

Cohesion: 0.33
Nodes (3): baseConfig, config, require

### Community 87 - "Community 87"

Cohesion: 0.40
Nodes (3): ACTIONS, QuickActionItem, QuickActions()

### Community 88 - "Community 88"

Cohesion: 0.80
Nodes (4): createGuild(), createPlayer(), getPrisma(), randomAddress()

### Community 89 - "Community 89"

Cohesion: 0.40
Nodes (3): prisma, TEST_ADDRESSES, TEST_USERNAMES

### Community 90 - "Community 90"

Cohesion: 0.50
Nodes (4): Avatar(), AvatarProps, cn(), sizeClasses

### Community 91 - "Community 91"

Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, outputDirectory

### Community 92 - "Community 92"

Cohesion: 0.50
Nodes (3): turbo, $schema, ui

### Community 93 - "Community 93"

Cohesion: 0.50
Nodes (4): cache, dependsOn, persistent, dev

### Community 94 - "Community 94"

Cohesion: 0.67
Nodes (3): cn(), EmptyState(), EmptyStateProps

### Community 97 - "Community 97"

Cohesion: 0.67
Nodes (3): dependsOn, outputs, lint

## Knowledge Gaps

- **573 isolated node(s):** `husky.sh script`, `name`, `version`, `private`, `type` (+568 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `getAddresses()` connect `Contract ABI Bindings` to `Community 59`, `Community 42`, `Prisma and Indexer Backfill`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `ConnectionManager` connect `Notification Service` to `Battle WebSocket Channel`, `WebSocket Channel Registry`, `Community 37`, `Chat Channel`, `Prisma and Indexer Backfill`, `Community 56`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `redis` connect `Community 37` to `Battle WebSocket Channel`, `WebSocket Channel Registry`, `Chat Channel`, `Notification Service`, `Community 42`, `Prisma and Indexer Backfill`, `Server Entry and Workers`, `Community 59`, `SIWE Auth Primitives`, `Community 54`, `Community 23`, `Community 56`, `Community 27`, `Community 62`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `husky.sh script`, `name`, `version` to the rest of the system?**
  _573 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Battle WebSocket Channel` be split into smaller, more focused modules?**
  _Cohesion score 0.07540983606557378 - nodes in this community are weakly interconnected._
- **Should `Contract ABI Bindings` be split into smaller, more focused modules?**
  _Cohesion score 0.0602322206095791 - nodes in this community are weakly interconnected._
- **Should `WebSocket Channel Registry` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._
