import * as Sentry from "@sentry/nextjs"

const sentryServerConfig = {
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
}

export default sentryServerConfig
