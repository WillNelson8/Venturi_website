# Venturi Premium: Stripe Integration Plan

Execution plan for Claude Opus 4.8. Goal: let users purchase a Premium subscription on venturimx.co that unlocks full features in the Venturi app, with a professional, on-brand purchase experience.

## Context for the executing agent (read first)

Most of the backend already exists, built 2026-06-10 in dormant mode. Do NOT rebuild it. Verify, polish, activate.

What exists today:

| Piece | Location | Status |
|---|---|---|
| DB entitlement migration | `~/Desktop/Venturi/Venturi/supabase/migrations/20260610_billing_entitlement.sql` | APPLIED to production. `profiles.subscription_tier` (free/premium) plus Stripe columns, protected by a trigger so only the webhook RPC `apply_subscription_change()` can write them. |
| Checkout edge function | `~/Desktop/Venturi/Venturi/supabase/functions/create-checkout-session/` | Written, NOT deployed. Gated by `BILLING_ENABLED` secret (returns 503 until true). |
| Webhook edge function | `~/Desktop/Venturi/Venturi/supabase/functions/stripe-webhook/` | Written, NOT deployed. Verifies signatures, handles checkout.session.completed and subscription updated/deleted. Deploy with `--no-verify-jwt`. |
| Activation guide | `~/Desktop/Venturi/Venturi/supabase/functions/_BILLING.md` | Step-by-step Stripe setup checklist. Follow it. |
| Premium page | `~/Desktop/Venturi/Venturi_website/premium.html` + `billing.js` | Written, uncommitted, `BILLING_ENABLED = false` in billing.js, not linked from nav. Price copy $9.99/mo is a PLACEHOLDER; confirm with the user. |

Site facts:
- Repo `WillNelson8/Venturi_website`, deploys to https://www.venturimx.co via Vercel on push to `main`.
- Auth is Supabase (project ref crkeiitgmglbcbbyncme), same accounts as the iOS app. `login.html` + `forum.js` patterns show how sessions work; nav has an auth-aware `#navAuthSlot`.
- Design system: light glass theme, Electric Blue `#4260FF`, sky `#0EA5E9`, Inter font, `forum.css` shared variables, glassmorphism cards. Hard rules from the owner: NO emojis, NO em dashes, blue only (no purple).

Division of labor:
- The user does all Stripe Dashboard actions (creating products, copying keys, configuring the webhook endpoint, toggling live mode). The agent writes code, runs CLI commands, and tells the user exactly what to click and what value to paste where.
- Never print secret keys into files committed to git. Stripe secrets live only in Supabase function secrets. The publishable key and price IDs are safe in client code.

---

## Phase 1: Stripe account setup (user-driven, agent provides exact instructions)

Work in TEST MODE first. Live mode comes in Phase 6.

1. User creates a Product "Venturi Premium" in the Stripe Dashboard with two recurring prices:
   - Monthly (confirm amount with user; placeholder is $9.99/mo)
   - Annual (placeholder copy says "Annual saves 20%"; confirm amount or remove the annual option)
2. User copies: test secret key (`sk_test_...`), test publishable key (`pk_test_...`), and both price IDs (`price_...`).
3. Agent verifies `_BILLING.md` matches this flow and updates it if the plan diverges.

Checkpoint: ask the user for final pricing before touching copy. Do not invent prices.

## Phase 2: Deploy backend (agent)

Follow `_BILLING.md`. In summary:

1. `supabase secrets set` on project crkeiitgmglbcbbyncme:
   - `STRIPE_SECRET_KEY` (test key for now)
   - `STRIPE_WEBHOOK_SECRET` (after step 3)
   - `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL` (or however the existing function expects them; read `create-checkout-session/index.ts` first and adapt to support two prices if it currently supports one)
   - `BILLING_ENABLED=true`
2. Deploy: `supabase functions deploy create-checkout-session` and `supabase functions deploy stripe-webhook --no-verify-jwt`.
3. User adds the webhook endpoint in Stripe Dashboard (URL: the deployed stripe-webhook function URL) listening for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. User pastes back the signing secret; agent sets it as `STRIPE_WEBHOOK_SECRET` and redeploys if needed.
4. Add a `customer.subscription` portal path: deploy a small third function `create-portal-session` (Stripe Billing Customer Portal) so subscribers can manage/cancel. Reuse the auth pattern from create-checkout-session. User must enable the Customer Portal once in Stripe Dashboard settings.

## Phase 3: Premium page redesign (agent, the main design work)

Upgrade `premium.html` from a single card into a proper pricing experience. Keep the existing light glass language (it already matches the site); raise the polish level. All styles inline or in the page's own style block, consistent with how other pages work.

Layout, top to bottom:

1. Hero header: existing "Unlock the full flight deck." headline, centered, with the soft radial blue glow treatment used elsewhere.
2. Billing toggle: a segmented Monthly / Annual pill control (glass pill, blue active state, smooth transition). Annual shows the savings pill. Price amount animates/swaps when toggled. If the user decides monthly-only in Phase 1, omit the toggle.
3. Two-column pricing comparison on desktop, stacked on mobile:
   - Free card: muted glass, lists what the free tier includes, button "Get the app" linking to the App Store (or index signup until launch).
   - Premium card: elevated glass with blue gradient border glow, "Most popular" style badge, feature checklist (keep the existing SVG check circles), price, and the primary `btn-blue` CTA.
   - Confirm the actual free vs premium feature split with the user before writing the lists; do not guess which app features are gated.
4. Trust row beneath the cards: small muted line with a lock icon (inline SVG, no emoji): "Secure checkout by Stripe. Cancel anytime." Optionally Stripe wordmark.
5. FAQ section: 4-5 glass accordion items (How does Premium reach my app? Can I cancel? What payment methods? Does my co-owner need Premium?). Match support.html tone.
6. Footer and nav identical to other pages.

Responsive: test 375px, 768px, 1024px+, both iPad orientations. No squished fixed layouts; cards stack cleanly.

States the page must handle (extend billing.js):
- Signed out: CTA reads "Sign in to upgrade" and routes to `login.html?next=premium.html` (add next-param support to login.html if missing).
- Signed in, free: CTA calls create-checkout-session with the selected price ID and redirects to Stripe Checkout.
- Signed in, already premium: card swaps to a "You are Premium" state showing renewal date (read `subscription_tier` and `subscription_current_period_end` from profiles) and a "Manage billing" button that calls create-portal-session.
- Loading and error states on the button (spinner, inline error message in `#billingMsg`, never an alert()).

## Phase 4: Checkout return pages (agent)

1. `premium-success.html`: glass celebration page (no emoji, use the blue check SVG motif). Copy: subscription active, works instantly in the app, link to open the app / back home. Poll profiles once for tier=premium and show a gentle "finalizing" state if the webhook has not landed yet (retry a few times before telling the user to refresh).
2. Cancel path: send Stripe Checkout `cancel_url` back to `premium.html?canceled=1`; billing.js shows a quiet "Checkout canceled, no charge made" notice.
3. Set these URLs in create-checkout-session (success_url with `{CHECKOUT_SESSION_ID}`, cancel_url as above) and verify the function actually uses them.

## Phase 5: Site integration (agent)

1. Nav: add "Premium" link to the nav on index.html, support.html, forum.html, thread.html, login.html, privacy.html, terms.html (each page carries its own nav copy; update all of them).
2. index.html: add a pricing teaser CTA, e.g. a section or hero secondary link "See Premium" pointing to premium.html. Keep amber/blue rules: blue is the action color in the current glass theme.
3. terms.html and privacy.html: add subscription/billing language (auto-renewal, cancellation via Stripe portal, refund policy). Flag the drafted text to the user for review since it is legal copy.
4. Account awareness: `#navAuthSlot` already shows the signed-in pilot name; if a dropdown exists, add "Manage billing" there for premium users (optional, skip if it adds complexity).

## Phase 6: Test, then go live

Test mode end-to-end (agent drives, using the browse/QA tooling available):
1. Sign in with a test account, click Upgrade, complete Stripe Checkout with card 4242 4242 4242 4242.
2. Verify webhook fired (function logs) and `profiles.subscription_tier` flipped to premium.
3. Verify premium.html now shows the Premium state and the portal button opens the Stripe portal.
4. Cancel via portal, verify webhook downgrades tier at period end (or immediately, per function logic; read the code and confirm intended behavior).
5. Verify signed-out and canceled-checkout states.

Go live (user + agent):
1. User toggles Stripe to live mode, recreates product/prices live, creates live webhook endpoint.
2. Agent swaps Supabase secrets to live keys, updates price IDs in billing.js, redeploys functions.
3. Commit and push the website to `main` (Vercel deploys). Note: git author email must match the GitHub account or Vercel attribution breaks (known gotcha from gotasks.xyz).
4. One real live transaction test, then refund it from the Dashboard.

## Out of scope (do not do in this pass, but note for the user)

- App-side gating: the Swift app does not yet read `subscription_tier`; no feature is gated. That is a separate iOS task in the app repo.
- Apple compliance: linking out to web purchase from inside the app is allowed on the US storefront only (Guideline 3.1.1, Apr 2025 update). The website itself has no Apple constraint.
- Emails (receipts come from Stripe automatically; custom dunning/welcome emails later).

## Definition of done

- A signed-in user on venturimx.co can buy Premium with a real card, `subscription_tier` flips to premium within seconds, and they can self-manage in the Stripe portal.
- The premium page looks native to the glass design system, handles all four auth/subscription states, and is clean at phone and iPad widths.
- No secrets in the repo. `BILLING_ENABLED` true in both the secret and billing.js. All website changes committed and pushed.
