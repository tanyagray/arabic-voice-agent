---
name: stripe
description: >
  Use this skill for any Stripe billing or payments task. Triggers when the user mentions
  Stripe, billing, subscriptions, payments, invoices, pricing, coupons, payment links,
  checkout, customer portal, webhooks related to payments, or asks to "set up billing",
  "add payments", "manage subscriptions", etc. Also trigger for "/stripe". Covers both
  Stripe CLI operations and Stripe API integration code.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, AskUserQuestion, WebFetch
argument-hint: "[command or task description]"
---

# Stripe CLI & Billing Management

You are an expert at using the Stripe CLI and integrating Stripe billing into applications. Use this skill to help with all Stripe-related tasks.

## Step 1: Ensure Stripe CLI is available

Check if `stripe` is installed:

```bash
which stripe
```

If not found, install it:

- **macOS**: `brew install stripe/stripe-cli/stripe`
- **Linux**:
  ```bash
  curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
  echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
  sudo apt update && sudo apt install stripe -y
  ```

## Step 2: Resolve the project's Stripe profile

This skill uses **per-project Stripe CLI profiles** so you never accidentally operate on the wrong Stripe account.

### How it works

1. Check for a `.stripe-project` file in the repo root. This file contains a single line: the Stripe CLI profile name for this project (e.g., `mishmish` or `mishmish-test`).
2. If `.stripe-project` exists, read the profile name and **append `--project-name=<profile>` to every `stripe` CLI command** for the rest of this session.
3. If `.stripe-project` does NOT exist, ask the user:
   - "What Stripe CLI profile should this project use? (Run `stripe config --list` to see existing profiles, or I can set one up.)"
   - Once they provide a name, create `.stripe-project` with that name and commit it to the repo.

### Setting up a new profile

If the profile doesn't exist yet:

```bash
# Login and create a named profile for this project
stripe login --project-name=mishmish
```

This opens a browser for auth and saves credentials under that profile name. All developers on this project share the same profile name (and Stripe account).

### Verifying the profile works

```bash
stripe config --list --project-name=mishmish
```

### Key rule

**Every `stripe` CLI command in this skill MUST include `--project-name=<profile>`** (read from `.stripe-project`). Never run bare `stripe` commands that fall back to the default profile. This prevents cross-project mistakes.

Example — instead of:
```bash
stripe products list --limit 10
```
Always use:
```bash
stripe products list --limit 10 --project-name=mishmish
```

## Step 3: Understand the task

The user's input is in `$ARGUMENTS`. Common categories:

### Product & Price Management
```bash
# List products
stripe products list --limit 10

# Create a product
stripe products create --name="Pro Plan" --description="Full access"

# Create a recurring price
stripe prices create \
  --product=prod_xxx \
  --unit-amount=1999 \
  --currency=usd \
  --recurring[interval]=month

# Create a one-time price
stripe prices create \
  --product=prod_xxx \
  --unit-amount=4999 \
  --currency=usd

# List prices for a product
stripe prices list --product=prod_xxx
```

### Customer Management
```bash
# List customers
stripe customers list --limit 10

# Search customers
stripe customers search --query="email:'user@example.com'"

# Create a customer
stripe customers create --email="user@example.com" --name="User Name"

# Get customer details including subscriptions
stripe customers retrieve cus_xxx --expand subscriptions
```

### Subscription Management
```bash
# List subscriptions
stripe subscriptions list --limit 10 --status=active

# Create a subscription
stripe subscriptions create --customer=cus_xxx --items[0][price]=price_xxx

# Cancel a subscription
stripe subscriptions cancel sub_xxx

# Update a subscription (e.g., change plan)
stripe subscriptions update sub_xxx --items[0][id]=si_xxx --items[0][price]=price_xxx
```

### Webhook Management
```bash
# Listen for webhooks locally (forwards to local server)
stripe listen --forward-to localhost:8000/webhooks/stripe

# Trigger a test event
stripe trigger payment_intent.succeeded

# List webhook endpoints
stripe webhook_endpoints list
```

### Payment Links & Checkout
```bash
# Create a payment link
stripe payment_links create --line_items[0][price]=price_xxx --line_items[0][quantity]=1

# List payment links
stripe payment_links list
```

### Invoices
```bash
# List invoices
stripe invoices list --customer=cus_xxx

# Create a draft invoice
stripe invoices create --customer=cus_xxx

# Finalize and send
stripe invoices finalize_invoice inv_xxx
stripe invoices send inv_xxx
```

### Coupons & Promotions
```bash
# Create a percentage coupon
stripe coupons create --percent-off=20 --duration=once

# Create a fixed-amount coupon
stripe coupons create --amount-off=500 --currency=usd --duration=repeating --duration-in-months=3

# Create a promotion code from a coupon
stripe promotion_codes create --coupon=coupon_id --code=SAVE20
```

### General Exploration
```bash
# Get any resource by ID
stripe get /v1/customers/cus_xxx

# List any resource type
stripe get /v1/charges?limit=5

# Check API logs
stripe logs tail

# List all available event types
stripe trigger --list
```

## Step 4: Integrating Stripe into the codebase

When the user wants to add Stripe support to the application code (not just CLI operations), follow these patterns:

### Backend (Python/FastAPI — web-api)

**Dependencies**: Add `stripe` to `pyproject.toml` dependencies.

**Environment variables needed**:
- `STRIPE_SECRET_KEY` — API secret key (sk_test_... or sk_live_...)
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret (whsec_...)
- `STRIPE_PUBLISHABLE_KEY` — Publishable key for frontend (pk_test_... or pk_live_...)

**Webhook endpoint pattern** (`routes/webhooks.py`):
```python
import stripe
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle event types
    match event["type"]:
        case "checkout.session.completed":
            session = event["data"]["object"]
            # Provision access...
        case "customer.subscription.updated":
            subscription = event["data"]["object"]
            # Update subscription status...
        case "customer.subscription.deleted":
            subscription = event["data"]["object"]
            # Revoke access...
        case "invoice.payment_failed":
            invoice = event["data"]["object"]
            # Notify user...

    return {"status": "ok"}
```

**Checkout session creation** (`routes/billing.py`):
```python
@router.post("/billing/checkout")
async def create_checkout_session(user_id: str, price_id: str):
    session = stripe.checkout.Session.create(
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/billing/cancel",
        metadata={"user_id": user_id},
    )
    return {"url": session.url}
```

**Customer portal** (`routes/billing.py`):
```python
@router.post("/billing/portal")
async def create_portal_session(customer_id: str):
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings",
    )
    return {"url": session.url}
```

### Frontend (React — web-app)

Use `@stripe/stripe-js` and `@stripe/react-stripe-js` for frontend integration.

### Database

Typical columns to add to the `profiles` table:
- `stripe_customer_id TEXT` — links Supabase user to Stripe customer
- `subscription_status TEXT` — mirrors Stripe subscription status
- `subscription_tier TEXT` — current plan tier
- `subscription_period_end TIMESTAMPTZ` — when current period ends

## Step 5: Testing with Stripe CLI

Always use test mode keys (sk_test_...) during development.

```bash
# Forward webhooks to local dev server
stripe listen --forward-to localhost:8000/webhooks/stripe

# In another terminal, trigger events to test handlers
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded
```

## Tips

- **Always read `.stripe-project`** at the start and append `--project-name=<profile>` to every CLI command
- Always use `stripe listen` during local development to receive webhook events
- Use `stripe logs tail` to debug API call issues
- Use `stripe fixtures` for complex test scenarios with multiple related resources
- Use `stripe resources` to explore all available API resources
- Use `stripe samples` to list and clone example integrations
- For this project, webhook endpoint should be at `/webhooks/stripe` and registered in `main.py`
- Store Stripe keys in `.env` and add to `settings.py` — never commit keys to the repo
- `.stripe-project` is committed to the repo — all developers share the same Stripe project name
