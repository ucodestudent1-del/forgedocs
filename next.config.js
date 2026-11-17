/** @type {import('next').NextConfig} */
const path = require("path")
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin")

const createNextIntlPlugin = require("next-intl/plugin")
const { setCSPNonce, clearCSPNonce } = require("./src/lib/csp-nonce")
const withNextIntl = createNextIntlPlugin("./src/i18n/routing.ts")

function generateNonce() {
  return crypto.randomUUID().replace(/-/g, "")
}

const nextConfig = {
  outputFileTracingRoot: __dirname,
  // metadataBase is required for resolving social images and canonical URLs
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"),
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    const nonce = generateNonce()
    setCSPNonce(nonce)
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")

    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "*" },
          ...(process.env.NEXT_PUBLIC_APP_URL ? [{ key: "Access-Control-Allow-Credentials", value: "true" }] : []),
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-CSRF-Token, X-Requested-With" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-CSP-Nonce", value: nonce },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
    ]
  },
  transpilePackages: ["tslib", "react-remove-scroll", "use-sidecar", "@radix-ui/react-select", "@radix-ui/react-dropdown-menu", "@radix-ui/react-menu"],
  webpack: (config, { dev, isServer }) => {
    // Manually add the alias for next-intl/config
    config.resolve.alias = {
      ...config.resolve.alias,
      "next-intl/config": path.resolve(__dirname, "next-intl.config.js"),
      tslib: require.resolve("tslib"),
    }

    // Handle node: protocol modules (ioredis uses node:diagnostics_channel)
    // Bundle ioredis but intercept its node:diagnostics_channel import via
    // externals, redirecting it to an empty stub module. The Edge Runtime has
    // no node: built-ins, so we must not emit a runtime require("node:...")
    // — it would resolve to undefined and break property access.
    config.resolve.alias = {
      ...config.resolve.alias,
      "empty-module-stub": path.resolve(__dirname, "src/lib/empty-module.ts"),
    }
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
      (_context, request, callback) => {
        if (request === "node:diagnostics_channel") {
          return callback(null, "empty-module-stub")
        }
        callback()
      },
    ]

    if (!dev && process.env.NODE_ENV === "production" && !isServer && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
      config.plugins.push(
        sentryWebpackPlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          include: [".next/static"],
          ignore: ["node_modules"],
          silent: !process.env.CI,
        }),
      )
    }
    return config
  },
}

module.exports = withNextIntl(nextConfig)