# QA & Polishing Checklist (Phase 4)

Last updated: 2025-11-25

This document captures the current status of the outstanding Phase 4 QA & Polishing items from `docs/TODO.md`.

## 1. Accessibility Review

| Area | Status | Notes / Follow-up |
| --- | --- | --- |
| Keyboard navigation across landing → chat → recommendations → dashboard | ✅ | All interactive elements are reachable. Focus outlines provided via Tailwind `focus-visible` utility. |
| Screen reader labels for key components | ⚠️ | Header nav and CTA buttons use visible labels. Need to audit `ProductRecommendationCard` links for `aria-label` to announce match reason. |
| Alt text on hero and product imagery | ✅ | Hero section pulls translations (`hero.imageAlt`). Recommendation cards use product `name` for alt text. |
| Dialogs/modals | ⚠️ | `DisclaimerModal` exposes title/description, but Clerk modal warning (`aria-describedby`) still appears. Track for vendor fix. |
| Color contrast | ✅ | Primary palette (#0F766E, #FB7185) meets WCAG AA on light backgrounds. |

### Accessibility Action Items
- [ ] Add explicit `aria-label` to product external links describing product name + destination.
- [ ] Monitor Clerk modal warning; if persists, wrap with Radix `DialogDescription`.

## 2. SEO Meta Audit

| Page | Title / Description | OG/Twitter | Status |
| --- | --- | --- | --- |
| `app/layout.tsx` (default) | `LinkAble - AI 기반 보조기기 매칭` / Korean description | Icons + keywords defined | ✅ |
| `/` landing (`app/page.tsx`) | Title/description mention 링커 & KPI | OG image configured (`ergonomic-jar...`) | ✅ |
| `/chat` | `AI 상담 - LinkAble 링커` | OG tags set | ✅ |
| `/recommendations` | `추천 - LinkAble` | OG tags set | ✅ |
| `/dashboard` | `LinkAble 대시보드 — K-IPPA 효과성 리포트` | OG/Twitter configured | ✅ |

### SEO Action Items
- [ ] Confirm canonical URLs use production domain once available (currently `NEXT_PUBLIC_APP_URL` fallback).
- [ ] Add structured data (FAQ/HowTo) for landing page in future iteration.

## 3. Test Scenarios

| Flow | Steps | Expected Outcome |
| --- | --- | --- |
| AI Chat → Recommendation pipeline | 1. Sign in via Clerk.<br>2. Submit sample activity description.<br>3. Ensure Gemini response saved to `analysis_results`. | Chat UI shows assistant reply, `analysis_results` populated, `/recommendations` shows items. |
| Recommendation click logging | 1. Open `/recommendations`.<br>2. Click primary CTA.<br>3. Verify `/api/recommendations/[id]/click` returns 200 and Supabase `is_clicked` flips true. | Click logged, button disabled when `purchaseLink` missing. |
| K-IPPA submission | 1. Navigate `/dashboard` → evaluation section.<br>2. Submit sliders + feedback.<br>3. Check `/api/ippa` response and Supabase `ippa_evaluations`. | Effectiveness score + points returned, dashboard success card shown. |
| Product sync API | 1. Call `POST /api/products/sync` with `useSample: true`.<br>2. Call `GET /api/products/sync`. | Summary indicates created/updated counts, recent products listed. |
| Localization defaults | 1. Clear `localStorage` language key.<br>2. Reload landing page. | UI loads in Korean (`NEXT_PUBLIC_DEFAULT_LANGUAGE=ko`). |

### Testing Action Items
- [ ] Automate `core/validation/ippa-calculator` unit tests (Jest or Vitest).
- [ ] Add integration test for `/api/ippa` when test harness available.

---

**Owners**
- Accessibility: Frontend team
- SEO: Product + Growth
- Testing: Engineering QA

Document reference: `docs/TODO.md` Phase 4 QA & Polishing section.

