# ForgeDocs Deployment Guide

## Prerequisites
- Node.js 20.x
- Supabase project
- Redis (for BullMQ workers)
- LibreOffice (for conversions)
- Stripe account
- Tesseract OCR (optional, for OCR)

## Environment Variables
Copy `.env.example` to `.env.local` and configure:

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key |
| STRIPE_SECRET_KEY | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | Stripe webhook secret |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe publishable key |
| NEXT_PUBLIC_APP_URL | Application URL |
| REDIS_HOST | Redis host |
| REDIS_PORT | Redis port |

## Database Setup
```bash
supabase db push
```

## Install Dependencies
```bash
npm install
```

## Development
```bash
npm run dev
```

## Worker (for conversions)
```bash
npm run worker
```

## Production Build
```bash
npm run build
npm start
```

## Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Checklist
- [ ] Row Level Security enabled on all tables
- [ ] Signed URLs for storage access
- [ ] Rate limiting on API routes
- [ ] Virus scanning on uploads
- [ ] Audit logging for all mutations
- [ ] Stripe webhook signature verification
- [ ] Content Security Policy headers
- [ ] CORS configuration
