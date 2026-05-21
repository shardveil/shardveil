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

/** Map a CSS variable to a Tailwind color value with opacity modifier support.
 *  When Tailwind applies an opacity modifier (e.g. bg-veil-500/50), it passes
 *  opacityValue so we can use the rgb(R G B / alpha) form.
 *  Falls back to the plain CSS var for non-opacity usage.
 *
 *  The function form is valid in Tailwind v3 at runtime; we cast to string to
 *  satisfy the Config type definition which does not declare the callback form.
 */
const withOpacity = (varName: string, rgbVarName: string): string =>
  (({ opacityValue }: { opacityValue?: string }) =>
    opacityValue !== undefined
      ? `rgb(var(${rgbVarName}) / ${opacityValue})`
      : `var(${varName})`) as unknown as string;

/** Semantic token (no opacity support needed for semantic aliases) */
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
        // Veil — deep purple scale (opacity modifier enabled)
        veil: {
          50: withOpacity("--veil-50", "--veil-50-rgb"),
          100: withOpacity("--veil-100", "--veil-100-rgb"),
          200: withOpacity("--veil-200", "--veil-200-rgb"),
          300: withOpacity("--veil-300", "--veil-300-rgb"),
          400: withOpacity("--veil-400", "--veil-400-rgb"),
          500: withOpacity("--veil-500", "--veil-500-rgb"),
          600: withOpacity("--veil-600", "--veil-600-rgb"),
          700: withOpacity("--veil-700", "--veil-700-rgb"),
          800: withOpacity("--veil-800", "--veil-800-rgb"),
          900: withOpacity("--veil-900", "--veil-900-rgb"),
          950: withOpacity("--veil-950", "--veil-950-rgb"),
        },
        // Shard — cyan/teal scale (opacity modifier enabled)
        shard: {
          50: withOpacity("--shard-50", "--shard-50-rgb"),
          100: withOpacity("--shard-100", "--shard-100-rgb"),
          200: withOpacity("--shard-200", "--shard-200-rgb"),
          300: withOpacity("--shard-300", "--shard-300-rgb"),
          400: withOpacity("--shard-400", "--shard-400-rgb"),
          500: withOpacity("--shard-500", "--shard-500-rgb"),
          600: withOpacity("--shard-600", "--shard-600-rgb"),
          700: withOpacity("--shard-700", "--shard-700-rgb"),
          800: withOpacity("--shard-800", "--shard-800-rgb"),
          900: withOpacity("--shard-900", "--shard-900-rgb"),
          950: withOpacity("--shard-950", "--shard-950-rgb"),
        },
        // Gold — legendary glow (opacity modifier enabled)
        gold: {
          50: withOpacity("--gold-50", "--gold-50-rgb"),
          100: withOpacity("--gold-100", "--gold-100-rgb"),
          200: withOpacity("--gold-200", "--gold-200-rgb"),
          300: withOpacity("--gold-300", "--gold-300-rgb"),
          400: withOpacity("--gold-400", "--gold-400-rgb"),
          500: withOpacity("--gold-500", "--gold-500-rgb"),
          600: withOpacity("--gold-600", "--gold-600-rgb"),
          700: withOpacity("--gold-700", "--gold-700-rgb"),
          800: withOpacity("--gold-800", "--gold-800-rgb"),
          900: withOpacity("--gold-900", "--gold-900-rgb"),
          950: withOpacity("--gold-950", "--gold-950-rgb"),
        },
        // Blood — battle accent (opacity modifier enabled)
        blood: {
          50: withOpacity("--blood-50", "--blood-50-rgb"),
          100: withOpacity("--blood-100", "--blood-100-rgb"),
          200: withOpacity("--blood-200", "--blood-200-rgb"),
          300: withOpacity("--blood-300", "--blood-300-rgb"),
          400: withOpacity("--blood-400", "--blood-400-rgb"),
          500: withOpacity("--blood-500", "--blood-500-rgb"),
          600: withOpacity("--blood-600", "--blood-600-rgb"),
          700: withOpacity("--blood-700", "--blood-700-rgb"),
          800: withOpacity("--blood-800", "--blood-800-rgb"),
          900: withOpacity("--blood-900", "--blood-900-rgb"),
          950: withOpacity("--blood-950", "--blood-950-rgb"),
        },
        // Mythic — rainbow shimmer base (opacity modifier enabled)
        mythic: {
          50: withOpacity("--mythic-50", "--mythic-50-rgb"),
          100: withOpacity("--mythic-100", "--mythic-100-rgb"),
          200: withOpacity("--mythic-200", "--mythic-200-rgb"),
          300: withOpacity("--mythic-300", "--mythic-300-rgb"),
          400: withOpacity("--mythic-400", "--mythic-400-rgb"),
          500: withOpacity("--mythic-500", "--mythic-500-rgb"),
          600: withOpacity("--mythic-600", "--mythic-600-rgb"),
          700: withOpacity("--mythic-700", "--mythic-700-rgb"),
          800: withOpacity("--mythic-800", "--mythic-800-rgb"),
          900: withOpacity("--mythic-900", "--mythic-900-rgb"),
          950: withOpacity("--mythic-950", "--mythic-950-rgb"),
        },

        /* Semantic surface tokens — renamed from 'bg' to avoid Tailwind utility conflict */
        surface: {
          base: cssVar("--surface-base"),
          elevated: cssVar("--surface-elevated"),
          overlay: cssVar("--surface-overlay"),
          card: cssVar("--surface-card"),
        },

        /* Semantic content tokens — renamed from 'text' to avoid Tailwind utility conflict */
        content: {
          primary: cssVar("--content-primary"),
          secondary: cssVar("--content-secondary"),
          muted: cssVar("--content-muted"),
        },

        /* Semantic stroke tokens — renamed from 'border' to avoid Tailwind utility conflict */
        stroke: {
          base: cssVar("--stroke-base"),
          emphasis: cssVar("--stroke-emphasis"),
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
        // card-flip, pity-trigger, and glow-pulse are inherited from base config
        // Only define keyframes NOT already in packages/config/tailwind.base.js
        "rarity-shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
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
        // card-flip, pity-trigger, and glow-pulse are inherited from base config
        "rarity-shimmer": "rarity-shimmer 2s linear infinite",
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
