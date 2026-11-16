# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Only public env vars needed at build time (safe to bake into image)
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

# Set them as environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY package.json package-lock.json ./
RUN npm install
# Patch Next.js bundled webpack to export WebpackError at top level.
# Next.js 15's minify-webpack-plugin requires _webpack.WebpackError to be a
# constructor, but next/dist/compiled/webpack/webpack.js only exposes it nested
# under exports.webpack (the re-exported root webpack). Without this patch,
# next build fails with "TypeError: _webpack.WebpackError is not a constructor".
RUN node -e "const fs=require('fs');const p='node_modules/next/dist/compiled/webpack/webpack.js';let c=fs.readFileSync(p,'utf8');if(!c.includes('exports.WebpackError')){c=c.replace(\"Object.assign(exports, require('./bundle5')())\",\"Object.assign(exports, require('./bundle5')())\\n    if (exports.webpack && typeof exports.webpack.WebpackError === 'function') { exports.WebpackError = exports.webpack.WebpackError }\");fs.writeFileSync(p,c);}"
COPY . ./
# Copy the webpack patch script (excluded from COPY above by .dockerignore scripts/)
# so the prebuild hook can run during npm run build.
COPY scripts/patch-webpack.js ./scripts/patch-webpack.js
RUN npm run build

# Runner stage
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

USER nodejs

# Copy built application from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next-intl.config.js ./next-intl.config.js
COPY --from=builder /app/src/i18n/routing.ts ./src/i18n/routing.ts
COPY --from=builder /app/src/messages ./src/messages

# Secret keys must be provided at runtime via environment variables,
# never baked into image layers (prevents secret exposure via docker history)
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
