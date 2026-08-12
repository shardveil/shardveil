/**
 * Shared Sentry configuration — Module 21.
 *
 * The DSN is read from NEXT_PUBLIC_SENTRY_DSN and is intentionally optional:
 * with it unset, `isSentryEnabled` is false and every init is skipped, so local
 * dev and CI never ship events. Set the real value in .env.local and in the
 * Vercel project settings.
 *
 * A Sentry DSN is public by design (it ships in the client bundle), but it still
 * does not belong in the repo — rotating a committed one means a redeploy.
 */

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

/** Placeholder from .env.example — treat it as unset rather than as a real DSN. */
const PLACEHOLDER = "your_sentry_dsn_here";

export const isSentryEnabled =
  SENTRY_DSN.length > 0 && SENTRY_DSN !== PLACEHOLDER;

/**
 * Options shared by the browser, server and edge runtimes.
 *
 * tracesSampleRate is deliberately low: this is a pre-launch project on a free
 * tier, and error reporting is the point here, not performance monitoring.
 */
export const sharedSentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // The Next dev overlay already surfaces these; sending them just burns quota.
  enabled: process.env.NODE_ENV === "production",
} as const;
