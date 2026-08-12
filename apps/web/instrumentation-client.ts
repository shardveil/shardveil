// Browser-side Sentry init — Next.js loads this automatically (15.3+).
import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled, sharedSentryOptions } from "@/lib/sentry";

if (isSentryEnabled) {
  Sentry.init({
    ...sharedSentryOptions,
    // Wallet extensions inject noise into the page; keep breadcrumbs modest.
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
