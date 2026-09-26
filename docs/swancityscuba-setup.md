# Swan City Scuba: booking setup

Swan City Scuba is a program of The CESI Project. Payments, calendar and email are all set up **under CESI**:
the Stripe account belongs to the legal entity (Sposaro Conservation, Education, Sustainability, Initiative INC, EIN 41-2621387),
and email sends from a cesi.earth address. Tuition goes through Stripe, not Zeffy: Zeffy is for tax-deductible donations only.

Phase 1 needs four accounts. All have free tiers; Stripe charges per payment only.

| Service | What it does | Cost |
|---|---|---|
| GitHub | Holds the code (this repo) | Free |
| Netlify | Hosts cesi.earth and the booking API, stores enrollments | Free tier |
| Stripe | Takes payments and shop codes | 2.9% + 30¢ per card payment |
| Google Cloud | Lets the site read and write your Google Calendar | Free |
| Resend (optional) | Sends the welcome email with the scheduling link | Free up to 3,000/month |

## 1. Google Calendar access

The site signs in as you (not a service account) so calendar invites come from you and reach students' inboxes.

1. Go to <https://console.cloud.google.com>, create a project called "CESI Swan City Scuba".
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**: choose *External*, fill in the app name and your email, and add yourself as a test user.
4. **Publish the app** (OAuth consent screen → *Publish app* → *In production*). It stays unverified, which is fine for your own account. **Skip this and the token expires every 7 days.**
5. **Credentials → Create credentials → OAuth client ID** → *Web application*. Add the authorized redirect URI `http://localhost:53682/callback`. Copy the client ID and secret.
6. On your computer, in this repo:
   ```sh
   npm install
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run google-auth
   ```
   Open the printed link, sign in, click through the "unverified app" warning (it's your own app), and copy the `GOOGLE_REFRESH_TOKEN` it prints.

**Which calendars count as busy:** by default, only your primary calendar. If you keep a separate personal or work calendar, add its ID (Google Calendar → Settings → the calendar → *Integrate calendar* → Calendar ID) to `GOOGLE_BUSY_CALENDAR_IDS`, comma-separated.

**Blocking time off:** anything on your calendar blocks bookings, including all-day events. To stop bookings on a day, add an all-day "Not teaching" event.

**Moving or cancelling a session:** drag or edit the event in Google Calendar. The student gets the update automatically. Delete an event and the student can book that session again from their link.

## 2. Stripe

1. Create an account at <https://dashboard.stripe.com> as a **nonprofit** using CESI's legal name and EIN, with CESI's bank account for payouts. Ask Stripe support about their discounted nonprofit rate.
2. **Developers → API keys**: copy the secret key (`sk_test_...` while testing, `sk_live_...` to go live).
3. **Developers → Webhooks → Add endpoint**: URL `https://YOUR-SITE/api/stripe-webhook`, event `checkout.session.completed`. Copy the signing secret (`whsec_...`).
4. **Settings → Public details**: business name "The CESI Project", statement descriptor e.g. `CESI SWANCITYSCUBA`, support email.
5. **Settings → Emails**: turn on *Successful payments* receipts.

### Enrollment codes (students who paid elsewhere, e.g. a partner shop)

Only set these up once there's a written arrangement with the shop about who collects tuition and what CESI receives.

1. **Products → Coupons → New**: *Percentage discount* 100%, duration *Once*. Name it after the partner, e.g. "Paid at partner shop".
2. On that coupon, **Add promotion code** for each student, e.g. `SCUBAETC-JSMITH`, with *Limit to 1 redemption*.
3. Give the code to the student. At checkout they enter it, pay $0, and go straight to scheduling.

Each redemption shows up in Stripe (and in your new-enrollment email) with the code, so it can be reconciled with the partner.

## 3. Netlify

1. <https://app.netlify.com> → *Add new site → Import from Git* → pick `cesi-website`. Build settings come from `netlify.toml`.
2. **Site configuration → Environment variables**: add everything from `.env.example`:
   - `SITE_URL`: `https://cesi.earth` (or the Netlify preview URL while testing)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
   - `ENROLLMENT_SECRET`: a long random string (`openssl rand -hex 32`). **Never change it after launch**, or existing scheduling links break.
   - `INSTRUCTOR_EMAIL`: where new-enrollment notices go
   - `RESEND_API_KEY`, `EMAIL_FROM` (optional, see below)
3. Redeploy. Enrollments are stored in Netlify Blobs automatically; nothing to set up.

## 4. Email (optional but recommended)

Verify the cesi.earth domain in Resend and send from an address like `dive@cesi.earth`. Without Resend, students see their scheduling link on the page after paying, get Stripe's receipt, and get Google Calendar invites, but no welcome email with the link. To add it: sign up at <https://resend.com>, verify cesi.earth, and set `RESEND_API_KEY` and `EMAIL_FROM`.

## 5. Test before going live

With Stripe in test mode:
1. Enroll using card `4242 4242 4242 4242`, any future date, any CVC.
2. Pick dates. Check the events land on your calendar and the invite reaches the email you used.
3. Try a 100%-off test promotion code.
4. Move one event in Google Calendar and reload the scheduling page.

Then swap in live Stripe keys and a live webhook.

## Things to fill in

- `src/config/site.ts`: contact email/phone, Scuba Etc street address, prices for springs and southeast Florida, a link to the medical questionnaire PDF.
- `src/data/courses.ts`: price for the PADI AWARE Specialist add-on (`pricePerStudent`), to sell it online.
- Photos in general: the site is built to look fine without them, but real photos of you teaching and of Lake Denton will help most.

## Refund policy

The site uses this wording (edit in `src/config/site.ts`):

- Paid in full up front; non-refundable.
- Free rescheduling with 48 hours' notice.
- Weather/safety cancellations rescheduled free.
- **If a physician doesn't clear the student to dive: refund minus the cost of materials.**
- Enrollments valid 12 months.

The medical exception is the one worth keeping. It's the most common reason someone can't finish, it's out of their control, and without it you're likely to see card disputes, which cost $15 each and that you often lose. Everything else stays non-refundable.

## Moving cesi.earth from GitHub Pages to Netlify

The site now has a build step and server functions, which GitHub Pages can't run. **Do this before merging the change that introduced Astro**, or GitHub Pages will serve the raw source.

1. Connect the repo in Netlify (step 3 above) and check the preview URL: all pages, `/about.html`, `/legal.html`, `/contact.html`, `/swancityscuba/`, and `/dive` (redirects).
2. Netlify → *Domain management → Add a domain* → `cesi.earth`. Netlify shows the DNS records to set.
3. At your domain registrar, replace the GitHub Pages records with Netlify's. HTTPS is issued automatically within about an hour.
4. In GitHub → repo *Settings → Pages*, turn Pages off so the two don't fight over the domain.
5. Merge.

Email (`@cesi.earth` mailboxes) uses separate MX records. Leave those alone.
