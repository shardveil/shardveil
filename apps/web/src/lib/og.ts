// ─── OG Image constants and helpers ─────────────────────────────────────────

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Dark fantasy palette (inline hex — CSS vars are not available in ImageResponse)
export const OG_COLORS = {
  bg: "#0d0d14", // near-black
  surface: "#1a1a2e", // dark surface
  border: "#2a2a4a", // subtle border
  veil: "#9b5ffa", // veil-400 purple
  gold: "#eab308", // yellow-400
  text: "#e2e8f0", // content-primary
  muted: "#64748b", // content-muted
  pink: "#ec4899", // mythic/pink
} as const;

export const OG_RARITY_COLORS: Record<string, string> = {
  COMMON: "#71717a",
  UNCOMMON: "#22c55e",
  RARE: "#3b82f6",
  EPIC: "#a855f7",
  LEGENDARY: "#eab308",
  MYTHIC: "#ec4899",
};
