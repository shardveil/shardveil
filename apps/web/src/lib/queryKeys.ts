/**
 * Typed, hierarchical query key factory for ShardVeil.
 *
 * Usage:
 *   useQuery({ queryKey: qk.cards.byId("card-123"), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: qk.profile.me() })
 *
 * Each factory returns a `readonly` tuple so TanStack Query can infer
 * the exact key type at call sites.
 */

export const qk = {
  profile: {
    /** Current authenticated user's profile. */
    me: () => ["profile", "me"] as const,
    /** Profile looked up by wallet address. */
    byAddress: (addr: string) => ["profile", "byAddress", addr] as const,
    /** Profile looked up by username. */
    username: (name: string) => ["profile", "username", name] as const,
  },

  cards: {
    /** Paginated / filtered card list. */
    list: (filters: { rarity?: string; page?: number } = {}) =>
      ["cards", "list", filters] as const,
    /** Single card by its ID. */
    byId: (id: string) => ["cards", "byId", id] as const,
  },

  leaderboard: {
    /** Player rankings for a specific season. */
    ranked: (seasonId: string) => ["leaderboard", "ranked", seasonId] as const,
    /** Guild leaderboard (all-time or current season). */
    guilds: () => ["leaderboard", "guilds"] as const,
    /** Top card crafters leaderboard. */
    crafters: () => ["leaderboard", "crafters"] as const,
  },

  notifications: {
    /** Full notifications list for the authenticated user. */
    list: () => ["notifications", "list"] as const,
    /** Unread notification count / unread items only. */
    unread: () => ["notifications", "unread"] as const,
  },

  player: {
    /** Player stats / game data looked up by wallet address. */
    byAddress: (addr: string) => ["player", "byAddress", addr] as const,
  },

  chat: {
    /** Chat room listings. Override `refetchOnWindowFocus: true` on queries using these keys. */
    rooms: () => ["chat", "rooms"] as const,
    /** Chat messages for a specific room. Override `refetchOnWindowFocus: true` on queries using these keys. */
    messages: (roomId: string) => ["chat", "messages", roomId] as const,
  },
} as const;
