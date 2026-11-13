/** @type {import('next').NextConfig} */
const path = require("path")
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin")

const nextConfig = {
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/": [".env.local", ".next/static/**/*"],
    "/app/**": [".env.local", ".next/static/**/*"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["tslib", "react-remove-scroll", "use-sidecar", "@radix-ui/react-select", "@radix-ui/react-dropdown-menu", "@radix-ui/react-menu"],
  webpack: (config, { dev, isServer }) => {
    // Fix for tslib helpers in Radix UI packages
    config.resolve.alias = {
      ...config.resolve.alias,
      'tslib': require.resolve('tslib'),
    }
    
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

module.exports = nextConfig