/**
 * Moderation Service — Task 4.5
 *
 * Provides content filtering for chat messages.
 *
 * - Default word list (inline) is used at boot.
 * - If TOXIC_WORDS_LIST_URL is set in env, the list is fetched and merged on first use.
 * - filterContent() returns { clean, flagged } — flagged messages are stored but
 *   not blocked; recipients may choose to show or hide them.
 */

import { env } from "../config/env";
import { logger } from "../config/logger";

// ---------------------------------------------------------------------------
// Default toxic word list (inline fallback — 10 common words)
// ---------------------------------------------------------------------------

const DEFAULT_TOXIC_WORDS: string[] = [
  "spam",
  "scam",
  "hack",
  "cheat",
  "bot",
  "exploit",
  "abuse",
  "racist",
  "slur",
  "toxic",
];

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let toxicWords: string[] = normalizeWordList(DEFAULT_TOXIC_WORDS);
let listLoaded = false;
let loadPromise: Promise<void> | null = null;

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@]/g, "a")
    .replace(/[!1|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[0]/g, "o")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWordList(words: string[]): string[] {
  return Array.from(
    new Set(words.map(normalizeText).filter((word) => word.length > 0)),
  );
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Fetch the toxic words list from TOXIC_WORDS_LIST_URL if configured.
 * Falls back to the default list on any error.
 * Called once at module load; subsequent calls are no-ops.
 */
async function loadToxicWordList(): Promise<void> {
  if (listLoaded) return;

  if (!env.TOXIC_WORDS_LIST_URL) {
    listLoaded = true;
    return;
  }

  try {
    const response = await fetch(env.TOXIC_WORDS_LIST_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    const remote = text
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    // Merge remote list with defaults, then normalize + deduplicate
    toxicWords = normalizeWordList([...DEFAULT_TOXIC_WORDS, ...remote]);
    logger.info(
      { count: toxicWords.length, url: env.TOXIC_WORDS_LIST_URL },
      "moderation: toxic word list loaded from remote URL",
    );
  } catch (err) {
    logger.warn(
      {
        url: env.TOXIC_WORDS_LIST_URL,
        error: err instanceof Error ? err.message : String(err),
      },
      "moderation: failed to load remote word list — using defaults",
    );
  } finally {
    listLoaded = true;
  }
}

/**
 * Ensure the word list is loaded before filtering.
 * Uses a single shared promise to avoid concurrent fetches.
 */
async function ensureLoaded(): Promise<void> {
  if (listLoaded) return;
  if (!loadPromise) {
    loadPromise = loadToxicWordList();
  }
  await loadPromise;
}

// Kick off loading at module import time (fire-and-forget; sync path still works)
loadPromise = loadToxicWordList();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FilterResult {
  /** The original text (we do NOT redact — clients decide rendering). */
  clean: string;
  /** True if one or more toxic words were detected (case-insensitive). */
  flagged: boolean;
}

/**
 * Filter chat message content for toxic language.
 *
 * @param text - The raw message text to check.
 * @returns `{ clean, flagged }` — clean is always the original text;
 *   flagged indicates whether a toxic word was found.
 */
export async function filterContent(text: string): Promise<FilterResult> {
  await ensureLoaded();

  const normalized = normalizeText(text);
  const flagged = toxicWords.some((word) => normalized.includes(word));

  return { clean: text, flagged };
}

/**
 * Synchronous variant used when the word list is guaranteed to be loaded.
 * Safe to call after the first await on filterContent() or after module init.
 */
export function filterContentSync(text: string): FilterResult {
  const normalized = normalizeText(text);
  const flagged = toxicWords.some((word) => normalized.includes(word));

  return { clean: text, flagged };
}
