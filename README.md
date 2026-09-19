# Sugbo Now

**Cebu Daily Intelligence Platform** — *Cebu, right now, for you.*

Sugbo Now pulls real-time Cebu conditions (traffic, weather, flooding, road closures, power/water interruptions, news and advisories), matches them against each user's saved schedule and frequent locations, and shows a personalized, AI-written **Cebu Daily Brief** plus a suggested leave time.

This repo is a **monorepo with two fully independent apps**: `frontend/` and `backend/`. They only meet at the REST API described in [`docs/api-contract.md`](docs/api-contract.md).

---

## Tech Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Strict TS, path alias `@/` → `src/` |
| Styling | Tailwind CSS | |
| Data fetching | TanStack Query | Caching, loading and error states |
| Routing | React Router | |
| Maps | Leaflet (`react-leaflet`) | TomTom traffic overlay optional |
| Backend | Node.js 20+ / Express / TypeScript | CommonJS build, `tsx` for dev |
| Validation | Zod | Request bodies and env vars |
| Scheduled jobs | node-cron | Timezone `Asia/Manila` |
| Scraping | cheerio | SunStar Cebu |
| Database + Auth | Supabase (Postgres, Auth, RLS) | |
| AI brief | LLM provider TBD | Isolated behind `services/ai.service.ts` |
| Tests | Vitest | Backend logic first (matching, leave time) |

---

## How It Works

```
 EXTERNAL SOURCES        BACKEND (Express + cron)                 SUPABASE            FRONTEND
 ────────────────        ────────────────────────                 ────────            ────────
 TomTom Traffic ──┐
 GNews ───────────┤      jobs/ ─► integrations/ ─► normalize
 SunStar (scrape)─┤                  + dedupe ──────────────────► alerts
 Open-Meteo ──────┘                                                 │
                                                                    ▼
                          matching ─► leaveTime ─► brief (AI) ──► daily_briefs
                                                                    │
                          REST  /api/*  ◄───────────────────────────┘
                              ▲
                              └────────────────────────────────────────── React app
```

**Golden rule:** users never trigger external API calls. Cron jobs fetch on a schedule and write to Supabase; the REST API only reads from the database. This keeps us inside free-tier quotas and keeps the app fast.

---

## Project Structure

```
sugbo-now/
├── README.md
├── package.json                 # optional root shortcuts and dev tooling only
├── .gitignore
├── .editorconfig
├── .github/                     # CI, Dependabot, PR template, CODEOWNERS, ruleset
│   ├── workflows/ci.yml
│   ├── rulesets/protect-main.json
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── pull_request_template.md
├── scripts/
│   └── apply-github-security.ps1
├── docs/
│   ├── api-contract.md          # source of truth: frontend <-> backend
│   ├── data-model.md
│   └── data-sources.md
├── supabase/
│   ├── migrations/
│   │   └── 0001_init_schema.sql
│   └── seed.sql
├── frontend/                    # React + TypeScript (Vite)
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── types/api.ts         # mirrors docs/api-contract.md
│       ├── lib/                 # apiClient.ts, supabaseClient.ts
│       ├── mocks/               # MSW handlers + fixture JSON (work without backend)
│       │   ├── browser.ts
│       │   ├── handlers.ts
│       │   └── data/            # alerts, brief, locations, schedule
│       ├── context/AuthContext.tsx
│       ├── hooks/               # useAlerts, useDailyBrief, useLocations, useSchedule
│       ├── components/
│       │   ├── layout/          # AppShell, ProtectedRoute
│       │   ├── brief/           # DailyBriefCard, LeaveTimeSuggestion
│       │   ├── alerts/          # AlertCard, AlertList, SeverityBadge
│       │   ├── schedule/        # ScheduleForm
│       │   ├── locations/       # LocationForm
│       │   └── map/             # TrafficMap
│       ├── pages/               # Landing, Login, Signup, Dashboard, Alerts,
│       │                        # Schedule, Locations, NotFound
│       └── utils/format.ts
└── backend/                     # Express + TypeScript
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── src/
    │   ├── server.ts            # starts HTTP server + scheduler
    │   ├── app.ts               # Express app (importable for tests)
    │   ├── config/              # env.ts (Zod-validated), supabase.ts
    │   ├── middleware/          # auth (verify Supabase JWT), errorHandler, validate
    │   ├── routes/              # health, alerts, brief, locations, schedule
    │   ├── services/            # alerts, matching, leaveTime, brief, ai
    │   ├── integrations/        # tomtom, gnews, sunstar, weather (one file per source)
    │   ├── jobs/                # scheduler + one job per source + generateBriefs
    │   ├── schemas/             # Zod schemas for request bodies
    │   ├── types/index.ts
    │   └── utils/               # geo (distance math), logger
    └── tests/
        └── matching.service.test.ts
```

---

## Prerequisites

- Node.js 20 or newer (built-in `fetch` is used, no axios needed)
- npm, Git, VS Code
- A free [Supabase](https://supabase.com) project
- API keys (see [API Keys](#api-keys))

---

## Getting Started

### 1. Clone

```bash
git clone <repo-url>
cd sugbo-now
```

### 2. Set up Supabase

1. Create a project in the Supabase dashboard.
2. Open **SQL Editor** and run `supabase/migrations/0001_init_schema.sql` (then `supabase/seed.sql` for sample data).
3. From **Project Settings → API**, copy the Project URL, the `anon` key, and the `service_role` key.

### 3. Environment files

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env
```

On Windows PowerShell use `Copy-Item` instead of `cp`. Fill in the values (see [Environment Variables](#environment-variables)). **Never commit `.env` files, and never put the `service_role` key in the frontend.**

### 4. Install dependencies

The frontend and backend are independent applications. Each owns its own `package.json`, `package-lock.json`, and `node_modules` directory. Do not place frontend dependencies in `backend/`, backend dependencies in `frontend/`, or share a lock file.

Install dependencies separately for each app:

```bash
cd frontend
npm install

cd ../backend
npm install
```

This creates the local dependency directories that are intentionally ignored by Git:

- `frontend/package-lock.json` and `frontend/node_modules/`
- `backend/package-lock.json` and `backend/node_modules/`

The optional root package only supplies development shortcuts, including `npm run dev` for both servers. To use that shortcut, install its dev tool once from the repository root:

```bash
npm install
```

Commit every `package.json` and `package-lock.json`, but never commit `node_modules/`.

If TypeScript later complains about `node-cron` types, run this inside `backend/`:

```bash
npm install -D @types/node-cron
```

**Everyone else:**

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 5. Run

Start both development servers together (requires the optional root package setup):

```bash
npm run dev
```

Or run them independently:

```bash
# terminal 1
cd backend && npm run dev      # http://localhost:4000/api/health

# terminal 2
cd frontend && npm run dev     # http://localhost:5173
```

### 6. Verify before a pull request

```bash
npm run build
npm --prefix backend test
```

The GitHub Actions workflow runs these checks automatically for pushes and pull requests targeting `main` or `dev`.

Vite proxies `/api` to `http://localhost:4000`, so no CORS setup is needed in development.

---

## Working Independently

Frontend and backend teammates should never be blocked on each other.

**Contract first.** Any endpoint or response shape is agreed in `docs/api-contract.md` *before* anyone builds it. Changes to that file need a review from one person on each side.

**Frontend without the backend (MSW mocks).**
1. `cd frontend && npx msw init public/ --save`
2. Fill `src/mocks/handlers.ts` with handlers that return the JSON in `src/mocks/data/`.
3. In `main.tsx`, start the worker before rendering when `VITE_USE_MOCKS=true`.
4. Set `VITE_USE_MOCKS=true` in `frontend/.env`.

The frontend then runs completely on fixtures. Flip the flag to `false` when the real API is ready.

**Backend without the frontend.** Test endpoints with Postman, Bruno, or the VS Code *REST Client* extension. Set `CRON_ENABLED=false` while developing routes so jobs don't burn API quota.

**Ownership.** Frontend PRs should only touch `frontend/`, backend PRs only `backend/`. Cross-cutting changes (`docs/`, `supabase/`) get a note in the PR description.

---

## Environment Variables

### `frontend/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL. `/api` in dev (uses the Vite proxy). |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_USE_MOCKS` | `true` to run on MSW fixtures, `false` for the real API |

### `backend/.env`

| Variable | Description |
| --- | --- |
| `PORT` | Server port (default `4000`) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:5173`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-side only |
| `TOMTOM_API_KEY` | TomTom developer key |
| `GNEWS_API_KEY` | GNews key |
| `AI_API_KEY` | Key for the LLM provider used for briefs |
| `CRON_ENABLED` | `true` to run scheduled jobs |
| `TZ` | `Asia/Manila` |

---

## Data Sources

Quotas below were current when this README was written. Re-check each provider's dashboard before relying on them.

| Data | Source | Key needed | Free tier / notes |
| --- | --- | --- | --- |
| Traffic incidents and flow | [TomTom Traffic API](https://developer.tomtom.com) | Yes | 2,500 free non-tile requests/day, 50,000 tile requests/day |
| News | [GNews](https://gnews.io) | Yes | 100 requests/day, 10 articles per request, non-commercial use |
| Local news and advisories | SunStar Cebu (scraped) | No | Check `robots.txt` and terms first; look for an RSS feed before scraping HTML |
| Weather | [Open-Meteo](https://open-meteo.com) | No | Free for non-commercial use, hourly rain and forecast data by coordinates |

Cebu City reference point: `10.3157, 123.8854` (lat, lng). Use a bounding box around Metro Cebu for TomTom incident queries.

**Weather alternative:** OpenWeatherMap (free key required) if Open-Meteo doesn't meet our needs. As far as we know, PAGASA has no official public developer API, so typhoon and rainfall advisories would come from news/scraping later.

**Power, water, and flood advisories** are mostly announced through news and social pages (for example Visayan Electric and MCWD notices). For v1, extract these from GNews/SunStar articles by keyword (brownout, water interruption, flood, closure) and let the AI classify them. A `manual` alert source is also available so the team can add advisories by hand for demos.

**Scraping etiquette:** identify our user-agent, keep requests infrequent, cache results, store only headline, snippet, and link, and always link back to the source.

---

## Scheduled Jobs

All schedules use `timezone: 'Asia/Manila'`.

| Job | Schedule | Quota check |
| --- | --- | --- |
| `ingestTraffic` | Every 15 min, 05:00–22:00 | About 68 runs/day, well under 2,500 |
| `ingestWeather` | Hourly | No key, no quota concern |
| `ingestNews` | Every 3 hours | Max 3 queries, so 24 calls/day, under 100 |
| `scrapeSunstar` | Every 30–60 min | Be polite, cache aggressively |
| `generateBriefs` | Daily, 05:30 | One brief per user with a schedule that day |

Every job writes normalized rows into `alerts` with a unique `fingerprint` so re-runs never create duplicates.

---

## API Overview

Full request and response shapes live in [`docs/api-contract.md`](docs/api-contract.md). All routes except health require `Authorization: Bearer <supabase access token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| GET | `/api/alerts` | Active alerts (filter by type, area, severity) |
| GET | `/api/brief/today` | Today's personalized brief for the signed-in user |
| GET / POST / PUT / DELETE | `/api/locations` | Saved places (home, school, work, other) |
| GET / POST / PUT / DELETE | `/api/schedule` | Recurring schedule entries |

---

## Data Model

| Table | Key columns |
| --- | --- |
| `profiles` | `id` (= auth user id), `display_name`, `created_at` |
| `locations` | `id`, `user_id`, `label`, `address_text`, `lat`, `lng` |
| `schedule_entries` | `id`, `user_id`, `title`, `days_of_week`, `arrive_by`, `origin_location_id`, `destination_location_id` |
| `alerts` | `id`, `source`, `type`, `severity`, `title`, `summary`, `lat`, `lng`, `area_name`, `starts_at`, `ends_at`, `source_url`, `fingerprint` (unique), `raw` (jsonb) |
| `daily_briefs` | `id`, `user_id`, `brief_date`, `content`, `alert_ids`, unique on (`user_id`, `brief_date`) |

**Row Level Security:** users can read and write only their own rows in `profiles`, `locations`, `schedule_entries`, and `daily_briefs`. `alerts` are readable by any signed-in user. Only the backend (service role) writes `alerts` and `daily_briefs`.

**Alert types:** `traffic`, `weather`, `flood`, `closure`, `power`, `water`, `advisory`, `news`
**Alert sources:** `tomtom`, `gnews`, `sunstar`, `open-meteo`, `manual`

---

## Core Logic (Backend)

1. **Matching** (`matching.service.ts`): an alert is relevant to a user if it is active during the schedule window and within a set radius of one of their saved locations (Haversine distance in `utils/geo.ts`). Route-corridor matching is a later upgrade.
2. **Leave time** (`leaveTime.service.ts`): v1 is rule-based (base commute time plus a buffer per severity level of matched alerts). v2 can use TomTom Routing for live travel times, which may count toward the same free quota, so check first.
3. **Brief** (`brief.service.ts` + `ai.service.ts`): send only the matched alerts and the schedule to the LLM, ask for a short structured summary, and store the result in `daily_briefs`.

---

## Git Workflow

- `main`: protected release branch. `dev`: integration branch.
- Branch names: `frontend/<feature>`, `backend/<feature>`, `docs/<topic>`.
- Create a branch and open a pull request for each change; keep PRs small and squash-merge them.
- CI builds both apps and runs backend tests on pull requests and pushes to `main` or `dev`.
- CODEOWNERS automatically requests the relevant reviewers. It coordinates review requests only; it does not restrict folder access.
- Commit style: `feat(frontend): add alert card`, `fix(backend): dedupe tomtom incidents`

### Repository security setup

The repository includes security automation in `.github/`:

- `workflows/ci.yml`: builds the frontend and backend, then runs backend tests.
- `dependabot.yml`: opens weekly dependency update pull requests.
- `CODEOWNERS`: requests reviews for the appropriate areas.
- `rulesets/protect-main.json`: defines pull-request and branch-protection rules for `main` and `dev`.

After publishing the repository to GitHub and confirming CI has run once, an administrator applies the settings with:

```powershell
gh auth login
powershell -ExecutionPolicy Bypass -File .\scripts\apply-github-security.ps1 -Repo En1gM-a/sugbo-now
```

Rulesets are available for public repositories on GitHub Free. Private repositories require a GitHub plan that supports rulesets.

## Code Conventions

- TypeScript strict mode on both sides. No `any` without a comment explaining why.
- Backend: routes stay thin, logic goes in `services/`, one file per external API in `integrations/`.
- Frontend: data fetching only through `hooks/`, never directly inside components.
- Validate all request bodies with Zod. Validate `process.env` once in `config/env.ts`.

## Deployment (Suggested)

- **Frontend:** Vercel or Netlify (static Vite build).
- **Backend:** Render or Railway. It needs a long-running process for cron jobs, so avoid serverless-only hosts for it.
- **Database/Auth:** Supabase hosted project.
- Set all environment variables in each host's dashboard and update `FRONTEND_ORIGIN` and `VITE_API_URL` to the deployed URLs.

---

## Roadmap

- [ ] **Phase 0: Scaffold.** Repo structure, `/api/health`, frontend shell, Supabase project
- [ ] **Phase 1: Foundations.** Schema + RLS, auth, locations and schedule CRUD, frontend pages running on mocks
- [ ] **Phase 2: Ingestion.** TomTom, Open-Meteo, GNews, and SunStar jobs writing to `alerts`
- [ ] **Phase 3: Intelligence.** Matching, leave-time suggestion, AI Cebu Daily Brief
- [ ] **Phase 4: Polish.** Map view, empty and error states, demo data, deployment

---

## Team

| Name | Role | Area |
| --- | --- | --- |
| [@En1gM-a](https://github.com/En1gM-a) | Lead reviewer / Backend | Backend, Supabase, repository security |
| [@Rouge999xx](https://github.com/Rouge999xx) | Backend developer | Backend, Supabase |
| [@gnthril](https://github.com/gnthril) | Frontend developer | Frontend |
| [@Tiamporado](https://github.com/Tiamporado) | Frontend developer | Frontend |

*Course project for Software Development 1.*
