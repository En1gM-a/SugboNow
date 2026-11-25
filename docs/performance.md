# Performance

How to measure the app's speed, what the backend audit of 2026-11-14 found and changed, and what's left. The frontend audit comes next and isn't started.

## Measuring the backend

```bash
cd backend
npm run build   # the start-up line times the built entry file
npm run bench
```

`npm run bench` (`backend/scripts/bench.ts`) runs the real API: Express, auth, services, repositories and the Supabase client. Every network call the API makes is answered inside the same process by a fake Supabase, after a fixed delay (20 ms; change it with `BENCH_LATENCY_MS`). It never contacts the real project, and it refuses any other address.

The fake holds data sized like production's on 2026-11-14: a 393 KB traffic flow (1,753 road lines), 200 alerts in effect, 9 weather areas. So the numbers show what the code does, not how fast the network is that day:

| Column | Meaning |
| --- | --- |
| First request | Time with a token the API hasn't checked yet, as right after sign-in |
| Later requests | Time with a token it checked in the last minute |
| Auth calls | Calls to Supabase Auth, for the first and for later requests |
| Database calls | Reads the request makes |
| Read from database | Bytes of those reads. This is what counts toward Supabase's egress allowance |
| Response | Bytes sent to the browser, before Vercel compresses them |

The last two rows send what a page sends at once (`frontend/src/lib/nav.ts`).

The time is mostly waiting: each call that has to wait for another adds one delay. An endpoint that takes 109 ms at 20 ms a call is making 5 calls in a row.

**Not measured:** the deployed API on Vercel. Real cold starts, and the real delay between Vercel and Supabase, need Vercel's own logs and observability.

## Backend audit, 2026-11-14

Measured with `npm run bench` on `main` before the changes and on the branch after, with the same data.

| Request | Before | After, first request | After, later requests |
| --- | --- | --- | --- |
| Start-up (loading the API's code) | 797 ms, 557 files | 365 ms, 322 files | |
| `GET /api/brief/today` | 109 ms, 9 reads | 69 ms, 7 reads | 48 ms |
| `GET /api/alerts?relevant=true` | 66 ms | 47 ms | 25 ms |
| `GET /api/routes` | 106 ms, 483 KB read | 74 ms, 29 KB read | 53 ms |
| `GET /api/traffic-flow` | 61 ms, 412 KB read | 30 ms, nothing read | 11 ms |
| An endpoint with one read, such as `GET /api/profile` | 42 ms | 44 ms | 23 ms |
| `GET /api/lgu-posts/latest` | 83 ms | 83 ms | 63 ms |
| Today after sign-in (5 requests at once) | 107 ms, 5 auth calls, 16 reads | 90 ms, 1 auth call, 14 reads | 70 ms, no auth call |
| Traffic page (5 requests at once) | 117 ms, 5 auth calls, 994 KB read | 83 ms, 1 auth call, 127 KB read | 57 ms |

The traffic flow rows are for an API that already holds the flow. The first request after a start, and the first after the job saves a new flow, still read all of it once.

Response shapes didn't change. Two behaviours did, and both are in [`api-contract.md`](api-contract.md): a signed-out token can keep working for up to a minute, and new traffic flow can show up to 30 seconds late.

### What was found and changed

1. **Start-up loaded code the API never runs.** The Vercel entry (`backend/index.ts`) loaded Playwright, cheerio and all the job code: about half of its start-up time. On Vercel the Facebook check is off and the jobs run on GitHub Actions, and a cold start happens after every quiet spell.
   - Playwright now loads on the first Facebook check (`integrations/facebook.ts`).
   - `htmlToText`, the only helper that needs cheerio, moved to `utils/html.ts`, which only the jobs use.
   - `createContainer()` returns what the jobs need (`jobDependencies`) instead of building them. `server.ts` and `scripts/run-job.ts` call `buildJobs` themselves.
   - `tests/startup.test.ts` fails if the entry loads any of them again.
2. **Every request waited for Supabase Auth.** Each one sent its token to Supabase Auth and waited, so a page's 5 requests made 5 identical checks. An accepted token is now trusted for 60 seconds (`cacheVerifiedTokens` in `middleware/auth.ts`), never past its own expiry, and requests arriving together share one check. Refused tokens and failed checks aren't remembered.
   - **The cost:** signing out revokes a token in Supabase Auth at once, but the API accepts it for up to a minute more. Supabase's own database layer already accepts a signed-out token until it expires (an hour by default), so this adds little.
3. **The brief read one thing after another.** `GET /api/brief/today` is asked for every 5 minutes. It waited for its first reads, then the weather and the mayor's post (two reads in a row), then the saved brief: 4 waits. The saved brief is now read with the first reads, and the mayor's post only when the brief's text is about to be written, which is once a day. That leaves 2 waits.
4. **The alerts near a user's places waited for the places.** `GET /api/alerts?relevant=true` (the bell, every 5 minutes) now reads both at once.
5. **A route read every traffic alert, and the whole traffic flow, each time.** `GET /api/routes`:
   - reads the places and the routes at once (Row Level Security already limits routes to the user's own places);
   - asks only for alerts inside the box around the route's lines, 200 m wider on each side, instead of the newest 200 of every traffic alert in Metro Cebu. Checked against production: the same alerts on all 6 saved routes, in 6 to 38 KB instead of 76 KB. It also fixes a quiet limit: with more than 200 traffic alerts in effect, the old query could miss one on the route.
6. **The traffic flow was read in full on every use.** It's about 400 KB and changes once every 15 minutes, but `GET /api/traffic-flow` and `GET /api/routes` each read all of it every time, so the Traffic page read it twice.
   - The API now keeps the flow it last read. It asks the database at most every 30 seconds, and then only for a flow newer than the one it holds (`get(heldFetchedAt)` in `trafficFlow.repository.ts`): an unchanged flow costs an empty answer. Requests arriving together share one read.
   - The traffic job read the whole saved flow every run just to see how old it was. It now reads only the time (`fetchedAt()`). At 72 runs a day that was about 0.8 GB a month of the Supabase free plan's 5 GB of egress.

### Checked, and left alone

- **Database indexes and policies.** The migrations already follow Supabase's Postgres rules: every policy names its role and wraps `auth.uid()` in a `select`, foreign keys are indexed, and each query filters on an indexed column or reads a table of a few rows. The biggest table, `alerts`, had 1,685 rows. Nothing to add at this size. Query plans weren't looked at: that needs the Supabase dashboard. One index is redundant (`daily_briefs_user_id_idx` repeats the first column of the unique index on `user_id, brief_date`), which costs almost nothing.
- **Compression.** Vercel's CDN compresses JSON responses itself, so the API needs no compression middleware.
- **A Supabase client per request.** Creating one takes 0.04 ms.

### Left for later

- **LGU posts make 3 reads in a row** (the profile's mayor, the source, its posts). The last two can be one query. It's now the slowest part of the first page after sign-in.
- **The brief's weather is a second wait**, because the area comes from the profile. Reading it with the rest needs the area up front.
- **Alerts are the biggest steady read.** The bell reads up to 200 alerts (94 KB) and the brief up to 300, each every 5 minutes: 2 to 3 MB an hour for each open tab. That's fine for a few users. With many, it would use up the free plan's 5 GB of egress, and the fix is to read fewer columns first, or to keep the alerts in memory the way the traffic flow is kept.
- **Checking tokens without a call.** If the Supabase project uses asymmetric signing keys, `auth.getClaims()` checks a token locally, so even the first request wouldn't wait. A signed-out token would then work until it expires, so this is the team's call.
- **Playwright is still in the Vercel deployment**, unused, and it's large. Leaving it out needs a change to the Vercel settings.
- **The numbers on Vercel itself** (see "Not measured" above).

## Rules that keep the backend fast

- Reads that don't depend on each other go out together (`Promise.all`), not one after another.
- Nothing loads at start-up that the API doesn't use. Job code, scrapers and HTML parsers stay out of `backend/index.ts`'s imports.
- Read only what's needed: name the columns, filter in the query, and don't re-read what hasn't changed.
- Anything kept in memory says how stale it can be, in the code and in `api-contract.md`.
- Run `npm run bench` before and after a change to an endpoint, and put both numbers in the pull request.

## Frontend: next

Not started. The plan is to measure first, on a phone-sized screen with a slow connection and on desktop, then fix what the numbers show.

- **What to measure:** Largest Contentful Paint (2.5 s or less), Interaction to Next Paint (200 ms or less), Cumulative Layout Shift (0.1 or less), and how much JavaScript each page loads.
- **Known from the backend audit:** the All Cebu map's traffic flow is 412 KB of JSON before compression, and it's asked for again every 15 minutes.
- [`handoffs/frontend.md`](handoffs/frontend.md) already has performance, motion and scrolling rules. They win over any skill.

## Skills and tools

Looked at on 2026-11-14. None is installed in this repo yet.

| What | From | Use it for | Verdict |
| --- | --- | --- | --- |
| [`supabase-postgres-best-practices`](https://github.com/supabase/agent-skills) | Supabase | Queries, indexes, Row Level Security, connections. Used as the checklist for the database part of this audit | Use. `claude plugin marketplace add supabase/agent-skills`, then `claude plugin install postgres-best-practices@supabase-agent-skills` |
| [`web-quality-skills`](https://github.com/addyosmani/web-quality-skills) (`performance`, `core-web-vitals`, `web-quality-audit`) | Addy Osmani | The frontend audit: loading, Core Web Vitals, page weight budgets | Use for the frontend. `npx skills add addyosmani/web-quality-skills` |
| [`react-best-practices`](https://github.com/vercel-labs/agent-skills) | Vercel | React rules by impact: request waterfalls, bundle size, re-renders. Some rules are for Next.js only | Use for the frontend. `npx skills add vercel-labs/agent-skills` |
| [`vercel-optimize`](https://github.com/vercel-labs/agent-skills) | Vercel | Audits a Vercel project's functions, caching and cost | Worth a run on both Vercel projects. Same install as above |
| [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Chrome DevTools team | Lets Claude Code record real performance traces in Chrome | Use for the frontend. It sends usage statistics to Google and looks pages up in Chrome's public speed data unless started with `--no-usage-statistics --no-performance-crux` |
| `node --cpu-prof` | Node.js | Finding slow code in the backend. Built in | Use when the benchmark shows time that isn't waiting |
| [autocannon](https://github.com/mcollina/autocannon), [k6](https://k6.io) | | Load testing: many users at once | Not needed yet. A new dependency |
| [Clinic.js](https://github.com/clinicjs/node-clinic) | | Node.js profiling | Skip. Its README says it's no longer maintained |
| "Performance audit" skills from skill directories | Individuals | Checklists for an agent to read code against | Skip. They only read code and measure nothing |
