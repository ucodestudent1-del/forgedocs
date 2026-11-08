/** @type {import('next').NextConfig} */
const path = require("path")
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin")

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/": [".env.local"],
    "/app/**": [".env.local"],
  },
  webpack: (config, { dev, isServer }) => {
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