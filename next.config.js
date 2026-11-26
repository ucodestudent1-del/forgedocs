/** @type {import('next').NextConfig} */
const path = require("path")
const crypto = require("crypto")
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin")
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

function generateNonce() {
  return crypto.randomUUID().replace(/-/g, "")
}

const nextConfig = {
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || "",
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_ASSET_PREFIX
          ? new URL(process.env.NEXT_PUBLIC_ASSET_PREFIX).hostname
          : "forgedocs.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")

    return [
      {
        source: "/api/:path*",
        headers: [
          ...(process.env.NEXT_PUBLIC_APP_URL
            ? [{ key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL }]
            : []),
          ...(process.env.NEXT_PUBLIC_APP_URL ? [{ key: "Access-Control-Allow-Credentials", value: "true" }] : []),
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-CSRF-Token, X-Requested-With" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: cspHeader },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate, stale-while-revalidate=300" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        source: "/:path*\.(js|css|woff|woff2|png|jpg|jpeg|gif|webp|avif|ico|svg)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        has: [
          {
            type: "header",
            key: "sec-purpose",
            value: "prefetch",
          },
        ],
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/_next/image/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
  transpilePackages: ["tslib", "react-remove-scroll", "use-sidecar", "@radix-ui/react-select", "@radix-ui/react-dropdown-menu", "@radix-ui/react-menu"],
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      tslib: require.resolve("tslib"),
    }

    // Handle node: protocol modules (ioredis uses node:diagnostics_channel)
    // Redirect node: built-ins and optional native modules to an empty stub
    // for the client bundle only, so they are never required at runtime.
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "empty-module-stub": path.resolve(__dirname, "src/lib/empty-module.ts"),
        "node:diagnostics_channel": "empty-module-stub",
        "@aws-sdk/client-secrets-manager": "empty-module-stub",
        "@valkey/valkey-glide": "empty-module-stub",
        "@valkey/valkey-glide-linux-x64-musl": "empty-module-stub",
        "@valkey/valkey-glide-linux-x64-gnu": "empty-module-stub",
        "@valkey/valkey-glide-darwin-x64": "empty-module-stub",
        "@valkey/valkey-glide-win32-x64-msvc": "empty-module-stub",
        fs: "empty-module-stub",
        path: "empty-module-stub",
        os: "empty-module-stub",
      }
    }
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
      (_context, request, callback) => {
        if (request.startsWith("@valkey/valkey-glide")) {
          return callback(null, `commonjs ${request}`)
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

module.exports = withBundleAnalyzer(nextConfig)