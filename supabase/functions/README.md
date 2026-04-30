# Supabase Edge Functions

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Set Edge Function Secrets

These are stored server-side only — NEVER in .env or frontend code:

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
```

Verify secrets are set:

```bash
supabase secrets list
```

### 3. Deploy Edge Functions

Deploy verify-payment:

```bash
supabase functions deploy verify-payment --no-verify-jwt
```

> Note: We pass the JWT manually in the Authorization header, so --no-verify-jwt is needed.

Deploy paystack-webhook:

```bash
supabase functions deploy paystack-webhook --no-verify-jwt
```

### 4. Set Paystack Webhook URL

In your Paystack dashboard → Settings → API Keys & Webhooks:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

### 5. Test locally

```bash
supabase functions serve verify-payment --env-file .env.local
```

Create `.env.local` with:

```
PAYSTACK_SECRET_KEY=sk_test_your_test_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

## Security Model

```
Frontend (Paystack popup)
    ↓ user pays
Paystack processes payment
    ↓ returns reference to frontend
Frontend calls /functions/v1/verify-payment
    ↓ with JWT + reference + post_id + offer_id + helper_id
Edge Function verifies with Paystack API (secret key never leaves server)
    ↓ checks amount matches, status is success
Edge Function creates session + records payment + updates post/offer
    ↓ returns session_id
Frontend navigates to /session/:id
```

## What the Edge Function validates

1. JWT is valid (user is authenticated)
2. User is the post owner (not someone else)
3. Post is still open (not already in_progress)
4. Offer belongs to the post and helper_id matches
5. Paystack confirms payment status === "success"
6. Amount paid matches post budget (±1 Naira tolerance)
7. Reference hasn't been used before (idempotency)
