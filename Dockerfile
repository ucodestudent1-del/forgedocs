# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Only public env vars needed at build time (safe to bake into image)
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
# Allow mock Supabase client during build so static generation works without real DB
ARG NEXT_PUBLIC_BUILD_MOCK=true

# Set them as environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BUILD_MOCK=$NEXT_PUBLIC_BUILD_MOCK

COPY package.json package-lock.json ./
RUN npm install
# Prebuild hook patches Next.js webpack internals (see scripts/patch-webpack.js)
COPY . ./
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

# Secret keys must be provided at runtime via environment variables,
# never baked into image layers (prevents secret exposure via docker history)
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
