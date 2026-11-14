# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Accept build-time environment variables as build args (with defaults for build)
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ARG SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
ARG STRIPE_SECRET_KEY=sk_test_placeholder
ARG STRIPE_WEBHOOK_SECRET=whsec_placeholder
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ARG RESEND_API_KEY=placeholder-resend-key
ARG EMAIL_FROM=noreply@localhost
ARG REDIS_URL=redis://localhost:6379
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG SENTRY_DSN=placeholder-sentry-dsn
ARG SENTRY_ORG=placeholder-org
ARG SENTRY_PROJECT=placeholder-project

# Set them as environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV EMAIL_FROM=$EMAIL_FROM
ENV REDIS_URL=$REDIS_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV SENTRY_DSN=$SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT

COPY package.json package-lock.json ./
RUN npm install
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
COPY --from=builder /app/next-intl.config.js ./next-intl.config.js
COPY --from=builder /app/src/i18n/routing.ts ./src/i18n/routing.ts

EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
