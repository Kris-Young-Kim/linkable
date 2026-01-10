# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LinkAble is an AI-powered assistive device recommendation platform that uses ICF (International Classification of Functioning) analysis to match users with appropriate assistive devices based on ISO 9999 standards. The platform features K-IPPA (Korean Individual Prioritized Problem Assessment) validation.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Shadcn UI
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **AI**: Google Gemini Flash Lite (via Vercel AI SDK)
- **Auth**: Clerk (with Clerk-to-Supabase JWT conversion via Edge Functions)
- **Testing**: Playwright (E2E)

## Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# Testing
pnpm test:e2e               # Run Playwright E2E tests
pnpm test:e2e:ui            # Playwright UI mode
pnpm test:rls               # Test RLS policies
pnpm test:rls:comprehensive # Comprehensive RLS tests

# Database
pnpm gen:types              # Generate Supabase TypeScript types
pnpm backup:db              # Backup database to JSON

# Edge Functions
pnpm deploy:edge-function   # Deploy Supabase Edge Function
pnpm test:edge-function     # Test Edge Function

# Data Scripts
pnpm import:products        # Import product data
pnpm crawl:products         # Web scraper for products
pnpm scrape:icf             # Scrape ICF codes
```

## Architecture

### Core Domain Logic (`core/`)

The domain logic is separated from framework code:

- **`core/assessment/`**: ICF code analysis and prompt engineering
  - `icf-codes.ts`: ICF code definitions and mappings
  - `icf-validator.ts`: Validates and normalizes ICF codes
  - `prompt-engineering.ts`: AI prompt construction for chat
  - `ippa-score-parser.ts`: Parses K-IPPA evaluation scores from chat

- **`core/matching/`**: Product recommendation engine
  - `hybrid-matcher.ts`: Main matching algorithm combining multiple strategies
  - `iso-product-recommender.ts`: ISO 9999 based product recommendations
  - `iso-mapping.ts`: ICF to ISO 9999 code mappings
  - `knowledge-graph.ts`: ICF-ISO relationship graph
  - `semantic-matcher.ts`: Semantic similarity matching
  - `feedback-scorer.ts`: Adjusts rankings based on user feedback

- **`core/validation/`**: K-IPPA effectiveness validation
  - `ippa-calculator.ts`: Calculates IPPA scores

### Supabase Integration (`lib/supabase/`)

Two types of Supabase clients:

- **`server.ts`**: Server-side clients
  - `getSupabaseServerClient()`: Service role client (bypasses RLS)
  - `getSupabaseUserClient()`: User-authenticated client (RLS applied)

- **`client.ts`**: Browser-side clients
  - `createSupabaseBrowserClient()`: Anonymous client
  - `useSupabaseClient()`: React hook with Clerk JWT

### Authentication Flow

1. User authenticates with Clerk
2. Server creates Supabase JWT from Clerk user info (`lib/supabase/jwt-helper.ts`)
3. JWT includes `sub` (Clerk user ID mapped to Supabase user UUID)
4. RLS policies use `auth.uid()` to filter user-specific data

### API Routes (`app/api/`)

Key endpoints:
- `/api/chat`: Main AI chat endpoint with ICF analysis
- `/api/recommendations/`: Product recommendation endpoints
- `/api/consultations/`: Consultation management
- `/api/admin/`: Admin-only endpoints

### Chat Flow

1. User message → `/api/chat` (POST, SSE stream)
2. Build prompt with `buildStreamingPrompt()` from `core/assessment/prompt-engineering.ts`
3. Stream response via Gemini
4. Parse structured analysis with `parseAnalysis()`
5. Validate ICF codes with `enforceIcfConsistency()`
6. Match ISO codes with `getIsoMatches()`
7. Store in `consultations`, `chat_messages`, `analysis_results` tables

## Database Schema (Key Tables)

- `users`: User profiles (Clerk ID mapping)
- `consultations`: Chat sessions with ICF analysis
- `chat_messages`: Individual messages in consultations
- `analysis_results`: AI-extracted ICF codes and needs
- `recommendations`: Product recommendations per consultation
- `products`: Assistive device catalog (1500+ items)
- `iso_codes`: ISO 9999 classification codes
- `icf_codes`: ICF code definitions
- `ippa_evaluations`: K-IPPA evaluation results

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GOOGLE_GEMINI_API_KEY`

## Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`)

## Important Patterns

1. **All files must be UTF-8 encoded** - Scripts run `scripts/ensure-utf8.js` before data operations
2. **RLS Security**: Many tables have RLS enabled but need policies. Check `getSupabaseUserClient()` for authenticated access
3. **Korean Language**: UI and chat are primarily in Korean
4. **Streaming Responses**: Chat API uses Server-Sent Events (SSE)
