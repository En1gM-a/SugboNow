# Handoff: land the frontend stack and fix what's left

**Written:** 2026-11-06, checked against GitHub at that time. Teammates also push and merge, so run "Check first" before trusting the tables.

**Covers:** PRs #45 to #49, five small fixes, and the follow-up work that was only in notes on the old PC.

## Start here

Save this file as `docs/handoffs/stack-landing.md` in your clone. Don't commit it: it goes stale as the PRs land.

Paste this to your agent:

```text
I'm continuing the SugboNow frontend stack from another device. Read docs/handoffs/stack-landing.md and CLAUDE.md. Run the handoff's "Check first" commands and tell me what has changed since it was written. You have my OK to edit frontend/ for Part 1. Ask me before every push, approval and merge, one at a time. Start with Part 1.
```

Setup, if this device doesn't have the repo yet:

```bash
git clone https://github.com/En1gM-a/SugboNow.git
```

```bash
gh auth status
```

```bash
npm --prefix frontend install
```

`gh` must be signed in as `En1gM-a`. To run the site on mock data (no `.env` needed):

```bash
VITE_USE_MOCKS=true npm --prefix frontend run dev
```

In PowerShell, use `$env:VITE_USE_MOCKS='true'; npm --prefix frontend run dev`. Open http://localhost:5173 and sign in with any email and a password of 6 or more characters. The mock's followed mayor survives reloads, so set it back to Cebu City after testing the follow flow.

## Check first

```bash
git fetch origin --prune
git log --oneline -3 origin/main
gh pr list --state open --json number,headRefName,baseRefName,mergeable,mergeStateStatus,reviewDecision,headRefOid --jq '.[] | "#\(.number) \(.headRefName) -> \(.baseRefName) \(.mergeable)/\(.mergeStateStatus) \(.reviewDecision) \(.headRefOid[0:7])"'
gh api 'repos/En1gM-a/SugboNow/activity?per_page=5' --jq '.[] | "\(.timestamp) \(.activity_type) by \(.actor.login) \(.ref)"'
```

Compare the output with the table below. If a head differs, someone has pushed: read that first, because Part 1's patches may no longer apply.

## Where things stand

`main` is at `e80203c`. PRs #41 to #44 are merged, and CI passes on `main`. Each open PR is built on the one below it, and all are by Rouge999xx:

| PR | Page | Branch | Base | Head | Own size |
| --- | --- | --- | --- | --- | --- |
| [#45](https://github.com/En1gM-a/SugboNow/pull/45) | Weather | `frontend/weather` | `main` | `7a97d05` | 11 files, +1336/−30 |
| [#46](https://github.com/En1gM-a/SugboNow/pull/46) | Traffic | `frontend/traffic` | `frontend/weather` | `86fa3d0` | 5 files, +777/−4 |
| [#47](https://github.com/En1gM-a/SugboNow/pull/47) | Profile | `frontend/profile` | `frontend/traffic` | `6e9bb71` | 10 files, +697/−113 |
| [#48](https://github.com/En1gM-a/SugboNow/pull/48) | New password screen | `frontend/password-reset` | `frontend/profile` | `aec3a0f` | 6 files, +129/−8 |
| [#49](https://github.com/En1gM-a/SugboNow/pull/49) | First-load speed | `frontend/first-load-speed` | `frontend/password-reset` | `c10a5cb` | 15 files, +174/−44 |

#45 conflicts with `main` right now. No PR has reviews or comments. CI only runs on PRs into `main`, so #46 to #49 have no results yet. All five heads build locally.

## How this repo behaves

These rules caused every problem so far.

- **Each merge makes the next PR conflict.** The repo only allows squash merges and deletes merged branches. GitHub then moves the next PR to `main`, where it conflicts because `main` holds the same changes as one squash commit. This can't be fixed in advance, and it isn't anyone's mistake. Each PR is one page because [frontend.md:103](frontend.md) asks for "one branch per chunk". Landing them one at a time is the plan the user chose.
- **The last pusher can't approve.** `protect-main` needs one approval, passing `frontend` and `backend` checks, an up-to-date branch and resolved threads. A new push dismisses approvals, and the most recent push must be approved by someone other than the pusher. A PR's author can't approve it either.

  | Who pushes the conflict fix | Who can approve | Seen on |
  | --- | --- | --- |
  | Rouge999xx | The user | #44 |
  | The user (`En1gM-a`) | Tiamporado or gnthril, after the push | #43 |

  The user is the only repo admin and could add a bypass at [protect-main](https://github.com/En1gM-a/SugboNow/settings/rules/23698875): Repository admin, "For pull requests only". It skips every rule on that merge, including CI, so check CI by hand and merge with `--admin`. Re-running `scripts/apply-github-security.ps1` would remove it. An agent must not change this setting.
- **A fix on a lower branch gets wiped.** The conflict fix below keeps the branch's side, so a fix that isn't in the next branch is lost. This was tested. A fix must either go on the top branch or be merged up through every branch above it.
- **Don't reject a middle PR.** Closing one doesn't remove its code from the PRs above it, and they stay pointed at its branch. Traffic also imports Weather's `Sheet` and `AlertRow`. Use "Request changes" instead. It holds until the reviewer approves or someone with write access dismisses it, and a new push doesn't clear it.
- **Teammates act too.** Rouge999xx merged #43 minutes after Tiamporado approved it, while it was being checked. Fetch right before every push or merge, and always pass `--match-head-commit`.
- **Tell the user what a merge does to other open PRs before merging.** They asked for this after #42's merge surprised them.

A hidden Browser pane draws no frames, so page transitions and `ResizeObserver` stall there. That isn't an app bug. Open pages directly by URL, and take a screenshot to force a frame.

## Part 1: six fixes on the top branch

Put these on `frontend/first-load-speed`, so they survive the conflict fixes in Part 2. It's Rouge999xx's branch, so tell them first to avoid pushing over each other. They land with #49, and nothing is live until then.

| # | Bug | Where | Cause |
| --- | --- | --- | --- |
| 1 | After "Make this my mayor", the old mayor's posts show under the new name until the new ones load. Measured 0.7 s on mocks, including a class suspension post. | `MayorPage.tsx` | The cache key `['lgu-posts','latest',10,'mine']` doesn't say whose posts they are, and the follow updates the screen before the refetch. |
| 2 | `/mayor?lgu=garbage` leaves a loading placeholder stuck in the header, with the button disabled. | `MayorPage.tsx` | An unknown slug is used as the LGU. |
| 3 | Narrowing the screen, such as rotating a phone, can cut off a caption with no "See more" until reload. | `Caption` in `MayorPage.tsx` | Overflow is only measured once. |
| 4 | If the profile fails to load on the real API, the page says "Follow Cebu City" with the button enabled, which could replace the user's mayor. | `MayorPage.tsx` | The profile's error state isn't handled. |
| 5 | The PAGASA panel shows a made-up thunderstorm advisory for Talisay, Minglanilla and Naga on the real API too, marked only "Sample". | `WeatherPage.tsx` | It renders whether or not mocks are on. |
| 6 | Two tap targets are under the spec's 44px ([frontend.md:251](frontend.md)): the switch buttons ("My commute / All Cebu", and the ones on News and Weather) are 40px tall, and Traffic's phone list handle ("Expand the list") is 32px. Found 2026-11-06 while checking #46. There's no patch for it below yet. | `index.css` (`.segment-btn`, `.sheet-handle`) | `min-height: 40px` and `height: 32px`. |

**Item 5 is the user's call.** [frontend.md:582](frontend.md) allows the "Sample" panel, and Rouge999xx followed it and asked about it in #45. The recommendation is to hide it outside mock mode, because people could act on a fake storm warning. If it's hidden, also update that line of the handoff and the comment on `PAGASA_SAMPLE` in `frontend/src/lib/mockOnly.ts`.

Save each block below to a file, then:

```bash
git switch frontend/first-load-speed
git pull
git apply mayor.patch
git apply pagasa.patch
npm --prefix frontend run build
```

If `git apply` complains about line endings, add `--ignore-whitespace`. Skip `pagasa.patch` if the panel stays.

`mayor.patch` (items 1 to 4):

```diff
diff --git a/frontend/src/pages/MayorPage.tsx b/frontend/src/pages/MayorPage.tsx
index 8860ba9..2bf2159 100644
--- a/frontend/src/pages/MayorPage.tsx
+++ b/frontend/src/pages/MayorPage.tsx
@@ -46,9 +46,15 @@ function Caption({ text }: { text: string }) {
   // Null until first opened: the plain line clamp needs no JavaScript to look right.
   const [closedHeight, setClosedHeight] = useState<number | null>(null);
 
+  // Measured again on resize: rotating a phone can push a caption past 4 lines after the first render.
   useLayoutEffect(() => {
     const el = ref.current;
-    if (el && closedHeight === null) setOverflows(el.scrollHeight > el.clientHeight + 1);
+    if (!el || closedHeight !== null) return;
+    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
+    measure();
+    const observer = new ResizeObserver(measure);
+    observer.observe(el);
+    return () => observer.disconnect();
   }, [text, closedHeight]);
 
   function toggle() {
@@ -198,15 +204,20 @@ export default function MayorPage() {
   const mine = profile.data?.subscribedMayor ?? null;
   // The LGU being browsed lives in the URL (/mayor?lgu=mandaue_city); no param means your own.
   const [params, setParams] = useSearchParams();
-  const viewing = params.get('lgu') ?? mine ?? 'cebu_city';
+  const requested = params.get('lgu');
+  // A slug we don't know, from an old or mistyped link, falls back to the user's own LGU.
+  const known = requested !== null && (sources.isPending || sources.data?.some((s) => s.slug === requested));
+  const viewing = (known ? requested : null) ?? mine ?? 'cebu_city';
   const isMine = viewing === mine;
   // The API only returns the followed LGU's posts, so other LGUs' posts are mock for now.
   const canPreview = isMine || USE_MOCKS;
   const posts = useLguPostsLatest(10, isMine ? undefined : viewing, canPreview && profile.isSuccess);
+  // Right after following, the cache still holds the old mayor's posts. Never show them under the new name.
+  const oldPosts = !posts.isPlaceholderData && !posts.isError && !!posts.data?.source && posts.data.source.slug !== viewing;
   const source = sources.data?.find((s) => s.slug === viewing);
   const name = source?.displayName ?? posts.data?.source?.displayName ?? 'Your mayor';
   const fbPage = source?.fbPageUrl ?? posts.data?.source?.fbPageUrl ?? null;
-  const checkedAt = isMine ? posts.data?.source?.lastFetchedAt : null;
+  const checkedAt = isMine && !oldPosts ? posts.data?.source?.lastFetchedAt : null;
 
   function pick(slug: string) {
     setParams(slug === mine ? {} : { lgu: slug }, { replace: true, preventScrollReset: true });
@@ -256,7 +267,7 @@ export default function MayorPage() {
                 Following
               </span>
             ) : (
-              <Button onClick={follow} disabled={!source || profile.isPending}>
+              <Button onClick={follow} disabled={!source || !profile.isSuccess}>
                 Make this my mayor
               </Button>
             )}
@@ -281,12 +292,17 @@ export default function MayorPage() {
 
       <div className="grid12">
         <section className="feed span-8" aria-label={`Posts from ${name}`}>
-          {!canPreview ? (
+          {profile.isError ? (
+            <div className="card glass">
+              <h2 className="card-title">Latest posts</h2>
+              <CardError what="your profile" onRetry={() => void profile.refetch()} />
+            </div>
+          ) : !canPreview ? (
             <div className="card glass empty">
               <p className="empty-text">Follow {name} to see their posts here.</p>
               <p className="muted small">We check one mayor&apos;s page for you when you sign in.</p>
             </div>
-          ) : posts.isPending ? (
+          ) : posts.isPending || oldPosts ? (
             <>
               <PostSkeleton />
               <PostSkeleton />
```

`pagasa.patch` (item 5, mostly re-indentation):

```diff
diff --git a/frontend/src/pages/WeatherPage.tsx b/frontend/src/pages/WeatherPage.tsx
index 8f34a06..ab112b4 100644
--- a/frontend/src/pages/WeatherPage.tsx
+++ b/frontend/src/pages/WeatherPage.tsx
@@ -24,6 +24,7 @@ import { useMediaQuery, useNow } from '@/hooks/useBrowser';
 import { useAlerts, useWeatherAll } from '@/hooks/useFeeds';
 import { useProfile } from '@/hooks/useProfile';
 import { PAGASA_SAMPLE } from '@/lib/mockOnly';
+import { USE_MOCKS } from '@/lib/supabaseClient';
 import { rainAdvice, weatherKind } from '@/lib/weatherKind';
 import type { Weather, WeatherHour } from '@/types/api';
 import { cx, vars } from '@/utils/cx';
@@ -326,33 +327,35 @@ function Advisories({ wide, now }: { wide: boolean; now: number }) {
           </Sheet>
         )}
       </section>
-      <section className="pagasa" aria-labelledby="pagasa-h">
-        <div className="card-head">
-          <h3 id="pagasa-h" className="sub-title">
-            PAGASA forecast and advisories
-          </h3>
-          <Tag tone="quiet">Sample</Tag>
-        </div>
-        <p className="small">
-          <b>Tonight and tomorrow.</b> {pagasa.tonight}
-        </p>
-        <p className="small">
-          <b>{pagasa.advisory.title}.</b> {pagasa.advisory.text}
-        </p>
-        <ol className="outlook" aria-label="5-day outlook">
-          {pagasa.outlook.map((day, k) => (
-            <li key={k}>
-              <span className="muted small">{nextDay(k)}</span>
-              <LiveIcon kind={day.kind} still label={day.label} />
-              <b className="tabular-nums small">
-                {day.high}° <span className="muted">{day.low}°</span>
-              </b>
-              <span className="tabular-nums small hour-rain">{day.rain}%</span>
-            </li>
-          ))}
-        </ol>
-        <p className="muted small">Sample content. Official PAGASA forecasts appear here once the backend provides them.</p>
-      </section>
+      {USE_MOCKS && (
+        <section className="pagasa" aria-labelledby="pagasa-h">
+          <div className="card-head">
+            <h3 id="pagasa-h" className="sub-title">
+              PAGASA forecast and advisories
+            </h3>
+            <Tag tone="quiet">Sample</Tag>
+          </div>
+          <p className="small">
+            <b>Tonight and tomorrow.</b> {pagasa.tonight}
+          </p>
+          <p className="small">
+            <b>{pagasa.advisory.title}.</b> {pagasa.advisory.text}
+          </p>
+          <ol className="outlook" aria-label="5-day outlook">
+            {pagasa.outlook.map((day, k) => (
+              <li key={k}>
+                <span className="muted small">{nextDay(k)}</span>
+                <LiveIcon kind={day.kind} still label={day.label} />
+                <b className="tabular-nums small">
+                  {day.high}° <span className="muted">{day.low}°</span>
+                </b>
+                <span className="tabular-nums small hour-rain">{day.rain}%</span>
+              </li>
+            ))}
+          </ol>
+          <p className="muted small">Sample content. Official PAGASA forecasts appear here once the backend provides them.</p>
+        </section>
+      )}
     </div>
   );
 }
```

**Tested on `c10a5cb` in a throwaway copy, on mock data.** The build passes and there were no console errors.

| # | How to check | Result |
| --- | --- | --- |
| 1 | Open `/mayor`, pick Mandaue, click "Make this my mayor". | A watcher on the page caught 0 moments of old posts under the new name. Loading cards show until the new posts arrive. The toast still appears. |
| 2 | Open `/mayor?lgu=garbage`. | Opens the user's own mayor with 10 posts and "Following". |
| 3 | Open `/mayor` wide, narrow to 375px without reloading, and scroll down the feed. | The caption gets "See more" once it's on screen. Off-screen posts update when they scroll in, because they use `content-visibility`. |
| 4 | Make `GET /api/profile` fail in `frontend/src/mocks/handlers.ts`, temporarily. | Shows "Couldn't load your profile" with Retry, and the button is disabled. |
| 5 | Open `/weather?tab=advisories` with mocks on. | The panel still shows. |

**Not tested:** any of this with mocks off. Item 5's hidden state and item 4's real failure need a real Supabase setup.

## Part 2: land the PRs one at a time, in order

Each PR conflicts once it reaches `main`. Landing the whole stack was simulated: the same fix clears every conflict, leaves the frontend code unchanged, and each PR then shows only its own changes.

| PR | Conflicts with `main` | Check on localhost, and decisions to make |
| --- | --- | --- |
| #45 | `App.tsx`, `maps.tsx`, `index.css`, `nav.ts` | `/weather`, `?tab=map`, `?tab=advisories`. It asks whether "Right now" can be a strip along the bottom of this page. It breaks the home page's facts line onto four lines until #48 lands. |
| #46 | `App.tsx`, `index.css`, `nav.ts` | `/traffic`, `?view=all`, the phone sheet. Lighthouse 76, the slowest page. |
| #47 | `App.tsx`, `maps.tsx`, `Segmented.tsx`, `useStretchyPill.ts`, `index.css`, `nav.ts`, plus `PlaceholderPage.tsx` | `/profile` and its sections. Deleting a place a trip uses should roll back with a friendly message. |
| #48 | `App.tsx`, `AlertRow.tsx`, `index.css`, `nav.ts` | `/reset-password`: signed out shows "This link has expired", signed in shows the form. A real reset email is untested. Supabase's redirect list must allow the deployed URL. Anyone signed in can change the password without the old one. |
| #49 | `PlaceForm.tsx`, `AuthContext.tsx`, `HomePage.tsx`, `MayorPage.tsx`, plus `WeatherPage.tsx` if the PAGASA patch went in | Home, Today, News and signing in. It reports Home 92, Today 93, News 91, not re-run here. Today and News still miss the 2.5 s LCP target, at 2.9 s and 3.0 s. The first sign-in now waits for supabase-js to download. |

For each PR, with `N` as its number and `B` as its branch:

1. **Make sure only stack PRs have touched the frontend on `main`.** The fix keeps the branch's side, so it would silently drop anything else. If this lists anything else, stop and merge by hand:

   ```bash
   git fetch origin --prune
   git log --oneline e80203c..origin/main -- frontend
   ```

2. **Fix the conflicts,** after the user's yes for the push. On #47 the merge stops on `PlaceholderPage.tsx`, so run `git rm frontend/src/pages/PlaceholderPage.tsx` and then `git commit --no-edit`.

   ```bash
   git switch $B
   git pull
   git merge -X ours origin/main -m "Merge main into $B" -m "The PR below landed on main as one squash commit, so git no longer sees that this branch already contains it. This branch's version of each conflicting file is the complete one."
   ```

3. **Verify before pushing.** The first command must print nothing, the second must match the PR's own size, and the third must print nothing:

   ```bash
   git diff --stat origin/$B HEAD -- frontend
   git diff --stat origin/main...HEAD | tail -1
   git grep -c '^<<<<<<< ' -- frontend
   ```

4. **Push and wait for CI:**

   ```bash
   git push origin $B
   gh pr checks $N --watch --interval 10
   ```

5. **Review.** Check the page on localhost. Weather, Traffic and Profile haven't been read line by line, so review the PR's own diff. `CLAUDE.md` requires the `ui-ux-pro-max`, `impeccable` and `motion` skills for frontend reviews.

6. **Approve and merge,** after the user's yes. See "The last pusher can't approve" above.

   ```bash
   gh pr review $N --approve
   gh pr merge $N --squash --match-head-commit "$(git rev-parse HEAD)"
   ```

7. **Verify `main`.** The first command must print nothing:

   ```bash
   git fetch origin --prune
   git diff --stat HEAD origin/main
   gh run list --branch main --limit 1
   ```

**Already checked on all five:** every head builds, and with all of them together every page loads at 375px and 1440px with no sideways scrolling or console errors. A scan of the new code found no network calls outside the API client, no unsafe HTML, no `any`, no secrets and no new packages. The only outside host that loaded was map tiles.

**Not checked:** the real API, Safari or a real phone, animation timing, and clicking through Weather, Traffic and Profile.

## Part 3: after #49 lands

Remind the user first, then write `docs/future-improvements.md` on a new branch off `main`. Pushing and the PR need their yes. They asked for this list to come back to once the UI is done:

1. **Password rules:** make the rules clear at sign-up (length, which characters and so on), with a checkmark or similar for each rule. The form only checks for 8 or more characters today (`frontend/src/pages/HomePage.tsx`). The checklist has to match what Supabase enforces in its Password settings.
2. **Maps:** every map can zoom with the scroll wheel, and users can search for an address or a place.
   - All the maps set `scrollWheelZoom={false}` in `frontend/src/components/map/maps.tsx`. Turning it on can trap page scrolling when the pointer is over a map, so decide how to handle that.
   - `docs/handoffs/signup.md` says the browser must not call a geocoding service, `docs/api-contract.md` says the frontend geocodes, and `CLAUDE.md` requires the team's agreement for a new user-triggered external call. Settle this first. Any provider must be free with no card.
3. **Side panel labels:** hovering an icon in the side panel shows a label saying what it is, styled to follow the theme. The rail only has a browser `title` today (`frontend/src/components/layout/AppShell.tsx`). Show it on keyboard focus too. Only the desktop rail needs it, since the phone tab bar already has labels.
4. **Current time:** show what time it is now, as plain digital time beside the date in the page header, in Manila time, changing once a minute. It reads directly against "Leave by 6:43 AM". `frontend/src/hooks/useManilaTime.ts` only returns a time-of-day name today.

Re-check those file notes when writing the doc.

**Parked, not part of this work:**

- **Real sign-up test:** needs `frontend/.env` and one real account. Supabase's built-in email only reaches project team members, at 2 emails an hour across the project. URL Configuration and SMTP still need checking in the dashboard (`docs/handoffs/signup.md`).
- **Today page oddities:** it says "All clear" whenever there are no high alerts (`AlertStatusLine.tsx:41`), and "No rain expected" can appear beside "Light rain" (`lib/weatherKind.ts:85`).
- **Facebook check and hosting, undecided and not built:** the idea is a PC running the check on a schedule, about every 10 minutes, saving to Supabase. Edge Functions could host the API and jobs, and a static host such as Cloudflare Pages could serve the site.
- **Weekly schedule exceptions:** an idea only. Users enter a week once and can opt out of a single week.
- **`.mcp.json`:** it's untracked and not git-ignored on the old PC, so consider ignoring it.

## Rules that were only in the old PC's notes

- Never change the Supabase database directly. Give the user SQL and instructions. Read-only queries are fine.
- Only edit `frontend/` when the user asks in chat, because the frontend team works there.
- No paid hosting and no credit card, even on free tiers. Check a host's current docs before recommending it.
- Design samples and artifacts use hardcoded data and never call an API.
- The design decisions are in `docs/handoffs/frontend.md` and were made by the user. Keep them: the jeepney hidden until a button is pressed, cartoon smoke filling the card to switch forms and the whole screen on login, auth animations around 1 s, and looping icons only for conditions, with navigation still.
- PR #27 was rejected as looking AI-made. Its content is a checklist only. Don't copy its look.
