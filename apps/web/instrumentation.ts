// Server and edge Sentry init — Next.js calls register() once per runtime.
import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled, sharedSentryOptions } from "@/lib/sentry";

export async function register() {
  if (!isSentryEnabled) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(sharedSentryOptions);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(sharedSentryOptions);
  }
}

// Lets Next report server-component and route-handler errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
