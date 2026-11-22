# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Only public env vars needed at build time (safe to bake into image)
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
# Allow mock Supabase client during build when real creds aren't available.
# Dashboard layout gracefully handles build phase via guest user (see IS_BUILD).
ARG NEXT_PUBLIC_BUILD_MOCK=true
ARG NEXT_PUBLIC_GUEST_MODE=false

# Set them as environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BUILD_MOCK=$NEXT_PUBLIC_BUILD_MOCK
ENV NEXT_PUBLIC_GUEST_MODE=$NEXT_PUBLIC_GUEST_MODE

COPY package.json package-lock.json ./
RUN npm ci
# Prebuild hook patches Next.js webpack internals (see scripts/patch-webpack.js)
COPY . ./
RUN npm run build

# Runner stage
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_GUEST_MODE=false

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Create logs directory with proper permissions for non-root user
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

USER nodejs

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Secret keys must be provided at runtime via environment variables,
# never baked into image layers (prevents secret exposure via docker history)
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
