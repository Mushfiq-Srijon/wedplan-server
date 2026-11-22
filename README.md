# WedPlan API

The TypeScript Express API for the WedPlan wedding planning platform.

## Included features

- Better Auth email/password sessions and Google OAuth
- JWT bridge cookie plus Express JWT verification for protected APIs
- Server-side role and ownership checks for customers, vendors, and admins
- Public service search, filtering, sorting, and details
- Vendor service submission with approval workflow
- Customer booking requests and cancellation
- Vendor booking acceptance/rejection
- Customer, vendor, and admin dashboard APIs
- Profile management
- ImgBB image upload proxy
- Stripe Premium Checkout
- Stripe signature verification and subscription lifecycle webhooks
- Admin transaction visibility and a secure admin seed command

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` plus the provider keys you want to use.
3. Run `npm install`.
4. Run `npm run typecheck`.
5. Run `npm test` to execute unit, integration, and security regression tests.
6. Run `npm run dev`.

The API starts at `http://localhost:5000` by default.

### Google OAuth callback

Add this callback URL to the Google OAuth client while developing:

```text
http://localhost:5000/api/auth/callback/google
```

Better Auth owns the `user`, `session`, `account`, and `verification` collections. The application uses the `Services`, `Bookings`, and `Transactions` collections for business data; it does not create a second password-based users collection.

## Create the admin account

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run:

```bash
npm run seed:admin
```

Public registration never creates admin accounts.

## Production webhook

After deploying the API, create a Stripe webhook endpoint at:

```text
https://your-api-domain.com/api/payments/webhook
```

Select snapshot events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy Stripe's `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

## Project links

- Live website: Not deployed yet — add the production URL before submission.
- Client repository: https://github.com/Mushfiq-Srijon/wedplan-client
- Server repository: https://github.com/Mushfiq-Srijon/wedplan-server
