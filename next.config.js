/** @type {import('next').NextConfig} */
const path = require("path")
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin")

const createNextIntlPlugin = require("next-intl/plugin")

const withNextIntl = createNextIntlPlugin("./src/i18n/routing.ts")

const nextConfig = {
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/": [".env.local", ".next/static/**/*"],
    "/app/**": [".env.local", ".next/static/**/*"],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
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
    // Use function form so webpack treats them as commonjs externals
    // (require at runtime) rather than global variable references, which
    // would generate invalid syntax due to the "node:" prefix.
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
      (_context, request, callback) => {
        if (request.startsWith("node:")) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
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