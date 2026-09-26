# cesi.earth

Website for **The CESI Project** (Sposaro Conservation, Education, Sustainability, Initiative INC, EIN 41-2621387), including **Swan City Scuba**, CESI's scuba education program.

## Structure

| Path | What |
|---|---|
| `src/pages/index.astro`, `about.astro`, `legal.astro`, `contact.astro` | CESI pages (served as `/about.html` etc.) |
| `src/pages/swancityscuba/` | Swan City Scuba program section (`/swancityscuba/`, short link `/dive`) |
| `src/layouts/Site.astro` | Shared CESI header, nav and footer |
| `src/layouts/Program.astro` | Program sub-navigation and "a program of The CESI Project" block |
| `src/styles/cesi.css`, `program.css` | CESI styles, and program additions built on them |
| `src/data/courses.ts` | Course catalog, tuition, sessions, add-ons |
| `src/config/site.ts` | Organization details, dive sites, booking rules, policies |
| `netlify/functions/` | Booking API at `/api/*`: Stripe checkout and webhook, availability, booking |
| `public/assets/` | Logo and icons |

## Development

```sh
npm install
npm run dev:site   # pages only, http://localhost:4321
npm run dev        # pages + booking API via Netlify CLI (needs .env, see below)
npm test
npm run check
```

Hosting, Stripe, Google Calendar and email setup: [docs/swancityscuba-setup.md](docs/swancityscuba-setup.md).
