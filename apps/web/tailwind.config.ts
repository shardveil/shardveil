import { createRequire } from "module";
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const require = createRequire(import.meta.url);
// packages/config has "type":"module" so tailwind.base.js is ESM (export default).
// createRequire loads it as CJS-wrapped ESM; the result is { default: Config }.
// The fallback branch handles any future CJS rewrite that uses module.exports directly.

const baseConfig = require("@shardveil/config/tailwind.base.js") as {
  default: Config;
};
const base = baseConfig.default ?? (baseConfig as unknown as Config);

/** Map a CSS variable to a Tailwind color value with optional opacity support */
const cssVar = (name: string) => `var(${name})`;

const config: Config = {
  ...base,
  content: ["./src/**/*.{ts,tsx}"],

  // Safelist dynamic rarity classes so they are not purged
  safelist: [
    // Background rarity
    "bg-rarity-common",
    "bg-rarity-uncommon",
    "bg-rarity-rare",
    "bg-rarity-epic",
    "bg-rarity-legendary",
    "bg-rarity-mythic",
    // Text rarity
    "text-rarity-common",
    "text-rarity-uncommon",
    "text-rarity-rare",
    "text-rarity-epic",
    "text-rarity-legendary",
    "text-rarity-mythic",
    // Border rarity
    "border-rarity-common",
    "border-rarity-uncommon",
    "border-rarity-rare",
    "border-rarity-epic",
    "border-rarity-legendary",
    "border-rarity-mythic",
    // Glow rarity (custom utility defined in plugin below)
    "glow-rarity-common",
    "glow-rarity-uncommon",
    "glow-rarity-rare",
    "glow-rarity-epic",
    "glow-rarity-legendary",
    "glow-rarity-mythic",
  ],

  theme: {
    ...base.theme,
    extend: {
      ...base.theme?.extend,

      /* --------------------------------------------------------
         FONTS
         -------------------------------------------------------- */
      fontFamily: {
        display: ["var(--font-display)", "Cinzel", "serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },

      /* --------------------------------------------------------
         COLORS
         All palettes are mapped to CSS custom properties so
         hot-reloading and theming work correctly.
         -------------------------------------------------------- */
      colors: {
        // Veil — deep purple scale
        veil: {
          50: cssVar("--veil-50"),
          100: cssVar("--veil-100"),
          200: cssVar("--veil-200"),
          300: cssVar("--veil-300"),
          400: cssVar("--veil-400"),
          500: cssVar("--veil-500"),
          600: cssVar("--veil-600"),
          700: cssVar("--veil-700"),
          800: cssVar("--veil-800"),
          900: cssVar("--veil-900"),
          950: cssVar("--veil-950"),
        },
        // Shard — cyan/teal scale
        shard: {
          50: cssVar("--shard-50"),
          100: cssVar("--shard-100"),
          200: cssVar("--shard-200"),
          300: cssVar("--shard-300"),
          400: cssVar("--shard-400"),
          500: cssVar("--shard-500"),
          600: cssVar("--shard-600"),
          700: cssVar("--shard-700"),
          800: cssVar("--shard-800"),
          900: cssVar("--shard-900"),
          950: cssVar("--shard-950"),
        },
        // Gold — legendary glow
        gold: {
          50: cssVar("--gold-50"),
          100: cssVar("--gold-100"),
          200: cssVar("--gold-200"),
          300: cssVar("--gold-300"),
          400: cssVar("--gold-400"),
          500: cssVar("--gold-500"),
          600: cssVar("--gold-600"),
          700: cssVar("--gold-700"),
          800: cssVar("--gold-800"),
          900: cssVar("--gold-900"),
          950: cssVar("--gold-950"),
        },
        // Blood — battle accent
        blood: {
          50: cssVar("--blood-50"),
          100: cssVar("--blood-100"),
          200: cssVar("--blood-200"),
          300: cssVar("--blood-300"),
          400: cssVar("--blood-400"),
          500: cssVar("--blood-500"),
          600: cssVar("--blood-600"),
          700: cssVar("--blood-700"),
          800: cssVar("--blood-800"),
          900: cssVar("--blood-900"),
          950: cssVar("--blood-950"),
        },
        // Mythic — rainbow shimmer base
        mythic: {
          50: cssVar("--mythic-50"),
          100: cssVar("--mythic-100"),
          200: cssVar("--mythic-200"),
          300: cssVar("--mythic-300"),
          400: cssVar("--mythic-400"),
          500: cssVar("--mythic-500"),
          600: cssVar("--mythic-600"),
          700: cssVar("--mythic-700"),
          800: cssVar("--mythic-800"),
          900: cssVar("--mythic-900"),
          950: cssVar("--mythic-950"),
        },

        /* Semantic background tokens */
        bg: {
          base: cssVar("--bg-base"),
          elevated: cssVar("--bg-elevated"),
          overlay: cssVar("--bg-overlay"),
          card: cssVar("--bg-card"),
        },

        /* Semantic text tokens */
        text: {
          primary: cssVar("--text-primary"),
          secondary: cssVar("--text-secondary"),
          muted: cssVar("--text-muted"),
        },

        /* Semantic border tokens */
        border: {
          base: cssVar("--border-base"),
          emphasis: cssVar("--border-emphasis"),
        },

        /* Rarity tokens — used with bg-rarity-*, text-rarity-*, border-rarity-* */
        rarity: {
          common: cssVar("--rarity-common"),
          uncommon: cssVar("--rarity-uncommon"),
          rare: cssVar("--rarity-rare"),
          epic: cssVar("--rarity-epic"),
          legendary: cssVar("--rarity-legendary"),
          mythic: cssVar("--rarity-mythic"),
        },
      },

      /* --------------------------------------------------------
         SPACING TOKENS
         -------------------------------------------------------- */
      spacing: {
        tight: "var(--spacing-tight)",
        default: "var(--spacing-default)",
        loose: "var(--spacing-loose)",
        section: "var(--spacing-section)",
      },

      /* --------------------------------------------------------
         KEYFRAMES (extend base config's keyframes)
         -------------------------------------------------------- */
      keyframes: {
        ...(((base.theme?.extend as Record<string, unknown>)
          ?.keyframes as Record<string, unknown>) ?? {}),
        "card-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        "pity-trigger": {
          "0%, 100%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%": { transform: "scale(1.05)", filter: "brightness(1.4)" },
        },
        "rarity-shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "glow-pulse": {
          "0%, 100%": {
            opacity: "0.8",
            boxShadow: "0 0 8px 2px rgba(124,58,237,0.4)",
          },
          "50%": {
            opacity: "1",
            boxShadow: "0 0 20px 6px rgba(124,58,237,0.8)",
          },
        },
        sparkle: {
          "0%": { transform: "scale(0) rotate(0deg)", opacity: "1" },
          "60%": { transform: "scale(1.2) rotate(180deg)", opacity: "0.8" },
          "100%": { transform: "scale(0) rotate(360deg)", opacity: "0" },
        },
        "page-fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },

      /* --------------------------------------------------------
         ANIMATION SHORTCUTS
         -------------------------------------------------------- */
      animation: {
        ...(((base.theme?.extend as Record<string, unknown>)
          ?.animation as Record<string, unknown>) ?? {}),
        "card-flip": "card-flip 0.6s ease-in-out",
        "pity-trigger": "pity-trigger 0.4s ease-in-out",
        "rarity-shimmer": "rarity-shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        sparkle: "sparkle 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "page-fade-in": "page-fade-in 0.3s cubic-bezier(0,0,0.2,1) both",
      },
    },
  },

  plugins: [
    ...(base.plugins ?? []),
    // Custom plugin: glow-rarity-* utilities
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        {
          "glow-rarity": (value: string) => ({
            boxShadow: `0 0 12px 3px ${value}80`,
          }),
        },
        { values: theme("colors.rarity") as Record<string, string> },
      );
    }),
  ],
};

export default config;
