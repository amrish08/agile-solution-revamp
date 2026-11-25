# Agile Solution — Cloudflare Pages + PayU

This is the Cloudflare Pages version of the Agile Solution website. It uses Pages Functions (server-side JavaScript) and Cloudflare D1 for order records. No PHP hosting is required.

## Included
- `public/index.html` — responsive service website
- `functions/api/create-payment.js` — validates service selection, creates server-side SHA-512 PayU hash, stores order in D1, redirects to PayU Hosted Checkout
- `functions/api/payu-response.js` — verifies PayU reverse hash and matches callback to stored order
- `schema.sql` — D1 order table
- `wrangler.toml` — Pages / D1 binding template

## Deploy on Cloudflare Pages

1. Create a D1 database in Cloudflare Dashboard → Storage & databases → D1 SQL Database. Name it `agile-solution-orders`.
2. Open the D1 database → Console and execute the contents of `schema.sql`.
3. Copy the database ID into `wrangler.toml` in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
4. Put this project in a GitHub repository, preserving the folder structure.
5. In Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
6. Select the repository. Set **Build command** to blank / none and **Build output directory** to `public`.
7. Add the D1 binding in Pages project → Settings → Functions → D1 database bindings:
   - Variable name: `DB`
   - D1 database: `agile-solution-orders`
8. Add these variables under Pages project → Settings → Variables and Secrets (Production and Preview as appropriate):
   - `PAYU_KEY` — your PayU merchant key (Secret)
   - `PAYU_SALT` — your PayU merchant salt (Secret)
   - `PAYU_ENV` — `test` initially; use `production` only after PayU live approval
   - `SITE_URL` — exact deployed HTTPS URL, e.g. `https://your-domain.com` (no trailing slash)
9. Redeploy after setting bindings and secrets.

## Payment flow
- Test mode endpoint: `https://test.payu.in/_payment`
- Production endpoint: `https://secure.payu.in/_payment`
- PayU success and failure return URL: `SITE_URL/api/payu-response`
- Payment request hash and response reverse hash are calculated on the server with Web Crypto SHA-512.
- The browser never receives the PayU Salt.

## Important production notes
- Use the matching PayU key and salt for the chosen environment.
- Confirm your PayU account is enabled for the Hosted Checkout product and live transactions.
- Test success, failure, cancelled and duplicate callback scenarios before launch.
- This starter verifies the signed browser return and records its status. For production financial reconciliation, also configure PayU webhooks and server-to-server Verify Payment API; do not treat a browser return as final settlement by itself.
- Add privacy policy, terms, refund/cancellation policy, service address and applicable business/GST details before applying for gateway review.
- Add anti-spam / rate limiting and an authenticated admin view before public launch.
- Custom quote requests open WhatsApp and do not charge a customer before a price is agreed.

## Business information
Agile Solution
agilesolution2026@gmail.com
+91 88259 85850

## Pricing
Listed service amounts are starter prices in both `public/index.html` and `functions/api/create-payment.js`. Update both in sync. Custom repair quote is enquiry-only.
