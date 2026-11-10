# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Accept build-time environment variables as build args
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG RESEND_API_KEY
ARG EMAIL_FROM
ARG REDIS_URL
ARG NEXT_PUBLIC_APP_URL
ARG SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT

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

# Verify standalone output exists
RUN test -f /app/.next/standalone/server.js || (echo "STANDALONE BUILD FAILED" && exit 1)

# Runner stage
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

USER nodejs

# Copy built application from builder (standalone output)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy start script (always fresh)
COPY start.js ./start.js

EXPOSE 3000
CMD ["node", "start.js"]