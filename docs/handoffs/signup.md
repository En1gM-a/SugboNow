# Sign-up handoff: collect the address and mayor at sign-up

- **For:** the frontend team (@gnthril, @Tiamporado) and their AI coding agents. Part 1 is for @En1gM-a and @Rouge999xx.
- **From:** @En1gM-a, November 2026
- **State:** checked against the live Supabase project `bhscrayqapftclrjesdb` on 2026-11-03. The current sign-up form and the jeepney ride are on `main` (PR #39). Onboarding (`/welcome`) is still a placeholder.

**Decision:** sign-up collects the user's home city, address and the mayor they follow, not just their name, email and password. Pages 2 and 3 in [`frontend.md`](frontend.md) describe the result. That file still decides the look and motion, and this one says how to build and save it.

## Summary

The database already has every column, so **no new tables or columns are needed**. Four things change:

1. **The sign-up form gets a second step** in the auth card: home city, address and mayor.
2. **A database trigger saves everything** when the account is created. This is the only way that works when "Confirm email" is on, because the user has no session yet.
3. **The email link goes to `/welcome`** instead of ending on Today.
4. **`/welcome` shrinks** to saved places and a first trip. A typed address can't replace those, because they need a map pin.

## What the live project shows

| Check | Result |
| --- | --- |
| Accounts | 0 in `auth.users` and 0 in `profiles`, so a real sign-up has never run on this project |
| Email confirmation | On (`mailer_autoconfirm: false`), so `signUp` returns no session until the link is opened |
| Sign-up trigger | `on_auth_user_created` is enabled. `handle_new_user()` saves only `id` and `display_name` |
| Row Level Security | On. Users can read and update their own profile, and only the trigger creates it |
| LGU list | Only signed-in users can read `lgu_sources`, and `GET /api/areas` and `GET /api/lgu-sources` need a token |
| Security advisor | No issues |
| Migration history | Empty, because the schema was run by hand. Don't use `supabase db push`, which would try to run `0001`–`0005` again |

### Where each value comes from after this work

| Column | Filled by | What it drives |
| --- | --- | --- |
| `display_name` | Sign-up step 1 | The Profile page |
| `first_name` | Sign-up step 1 | Today's greeting and the brief's greeting |
| `city` | Sign-up step 2 | Weather, the sky, Today's setup prompt |
| `address_text` | Sign-up step 2 | The location line in the header |
| `subscribed_mayor` | Sign-up step 2 | Mayor posts, Today's setup prompt |
| `commute_origin_location_id`, `commute_destination_location_id` | `/welcome`, from the first trip | Traffic's "My commute" |

Leave times also need rows in `locations` (`label`, `kind`, `address_text`, `lat`, `lng`) and `schedule_entries` (`title`, `days_of_week`, `arrive_by`, `origin_location_id`, `destination_location_id`). All of those are required, and the coordinates come from a map pin, so these rows are created on `/welcome`.

## Part 1: Supabase (@En1gM-a or @Rouge999xx)

### Save the sign-up details when the account is created

Run this in the dashboard's SQL Editor, before the frontend change ships.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- The browser can send anything here, so every value is checked. A bad value is saved as empty
  -- and never blocks the sign-up.
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, first_name, city, address_text, subscribed_mayor)
  values (
    new.id,
    coalesce(meta ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    left(nullif(trim(meta ->> 'first_name'), ''), 40),
    -- The same list as backend/src/config/areas.ts.
    case when meta ->> 'city' in (
      'cebu_city', 'mandaue_city', 'lapu_lapu_city', 'talisay_city', 'consolacion',
      'liloan', 'minglanilla', 'naga_city', 'cordova'
    ) then meta ->> 'city' end,
    left(nullif(trim(meta ->> 'address_text'), ''), 200),
    (select s.slug from public.lgu_sources s where s.slug = meta ->> 'subscribed_mayor' and s.is_active)
  );
  return new;
end;
$$;
```

- This replaces only the function. The trigger stays attached, no columns change, and there are no accounts to backfill.
- The limits (40 and 200 characters) match `PATCH /api/profile`.
- [Supabase warns](https://supabase.com/docs/guides/auth/managing-user-data) that a failing trigger can block sign-ups, so do one real sign-up right after running it. To undo it, run the function from `supabase/migrations/0001_init_schema.sql` again.
- If an area is ever added to `areas.ts`, add it to this list too. Until then, that town's users would just see Today's setup prompt.

Save the same SQL as `supabase/migrations/0006_save_signup_details_on_profile.sql`, and note in `docs/data-model.md` that these four columns now start from the sign-up form.

### Check these in the dashboard

**Authentication → URL Configuration.** The Site URL should not be the default `http://localhost:3000`. The redirect list needs `http://localhost:5173/**` and the deployed URL. A link that isn't on the list falls back to the Site URL. See [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

**Authentication → Emails → SMTP Settings.** [Without custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), the built-in service sends only to the project's team members, and [only 2 emails per hour](https://supabase.com/docs/guides/auth/rate-limits) across the project. Other addresses fail with `email_address_not_authorized`. Pick one:

- **Custom SMTP (included on the Free plan):** needed before real users. It starts at 30 emails per hour, and you can raise that.
- **Turn off "Confirm email" while building:** anyone can sign up at once and go straight to `/welcome`, but they can register an address they don't own, and password-reset emails still reach only team members.

The frontend steps below work with either choice.

## Part 2: Frontend

Rules:

- Only edit files inside `frontend/`, and follow `<rules>` and `<skills>` in `frontend.md`.
- Don't add tables, columns, API changes or npm packages. Leaflet is already installed.
- Stop and ask before pushing or opening a PR.

### 1. Add step 2 to the sign-up form

Update `SignUpForm` in [`HomePage.tsx`](../../frontend/src/pages/HomePage.tsx). The copy is in page 2 of `frontend.md`.

| Step | Fields | Rules |
| --- | --- | --- |
| 1. Your account | First name, email, password, confirm | As today, plus `maxLength={40}` on First name. "Next" checks these and moves on without calling Supabase |
| 2. Where you live | Home city (select), address (text), mayor to follow (select), and the class-suspension note | All three required. Address has `maxLength={200}`. "Create account" checks these, then calls `signUp` |

- **Suggested mayor:** choosing a city selects a mayor, until the user picks one themselves. `cebu_city`, `mandaue_city` and `lapu_lapu_city` suggest themselves, and every other city suggests `cebu_province`.
- **Address hint:** show "A barangay or street is enough." People don't need to give a house number.
- **Layout:** the two steps share one grid cell, like the two forms do, so the card never jumps. Use a select in the mayor field, not a list of cards, so step 2 fits that height.
- **Motion:** steps move like onboarding steps (`<motion>` in `frontend.md`), with no jeepney. The ride runs only when switching between sign in and sign up, and after the account is created.
- **Switching forms:** "Sign in" shows only on step 1. Step 2 has "Back", and going back keeps what was typed.
- **Errors from Supabase** show under the "Create account" button on step 2.
- **A new select field:** add a labeled `SelectField` next to `Field` in [`auth/Field.tsx`](../../frontend/src/components/auth/Field.tsx), styled like the inputs.

The form is signed out, so it can't load the lists from the API. Put them in a new file, `src/lib/signupOptions.ts`, with no network call, so the form never waits on the backend:

```ts
// shortcut: copied from backend/src/config/areas.ts and public.lgu_sources, because the API needs a signed-in user
// and this form is signed out. Update it when an area is added or an official changes.
export const HOME_CITIES = [
  { slug: 'cebu_city', name: 'Cebu City' },
  { slug: 'mandaue_city', name: 'Mandaue City' },
  { slug: 'lapu_lapu_city', name: 'Lapu-Lapu City' },
  { slug: 'talisay_city', name: 'Talisay City' },
  { slug: 'consolacion', name: 'Consolacion' },
  { slug: 'liloan', name: 'Liloan' },
  { slug: 'minglanilla', name: 'Minglanilla' },
  { slug: 'naga_city', name: 'Naga City' },
  { slug: 'cordova', name: 'Cordova' },
];

export const MAYORS = [
  { slug: 'cebu_city', label: 'Cebu City (Nestor Archival)' },
  { slug: 'mandaue_city', label: 'Mandaue City (Thadeo "Jonkie" Ouano)' },
  { slug: 'lapu_lapu_city', label: 'Lapu-Lapu City (Cindi King Chan)' },
  { slug: 'cebu_province', label: 'Province of Cebu (Pamela Baricuatro)' },
];

export const suggestedMayor = (city: string) => (MAYORS.some((m) => m.slug === city) ? city : 'cebu_province');
```

### 2. Send the details with `signUp`

In [`AuthContext.tsx`](../../frontend/src/context/AuthContext.tsx), change `signUp` to take all the fields (and update `handleSignUp` in `HomePage.tsx`). Don't call `PATCH /api/profile` here, because there may be no session yet.

```ts
options: {
  data: {
    display_name: firstName,
    first_name: firstName,
    city,
    address_text: addressText,
    subscribed_mayor: subscribedMayor,
  },
  emailRedirectTo: `${window.location.origin}/welcome`,
},
```

Always read these values from `profiles` (`GET /api/profile`), never from `user_metadata`. Supabase keeps this copy in `auth.users`, it can appear in the access token, and it doesn't change when the user edits their Profile.

### 3. Finish the "check your email" path

- `ProtectedRoute` already waits while Supabase reads the link, so `/welcome` needs no extra code for it.
- Change the text to: "We sent a confirmation link to {email}. Open it to add your places and a first trip. Already have an account? Sign in instead." With confirmation on, Supabase hides whether an email is taken, so an existing address sees this same screen and gets no email. Don't try to detect it.
- In `friendlyAuthError`, show "We couldn't send the confirmation email. Try again later." when the message mentions the email rate limit or an address that isn't authorized.

### 4. Build `/welcome` for places and the first trip

Replace `later('welcome')` at [`App.tsx:41`](../../frontend/src/App.tsx) with the real page. Its look follows page 3 and `<motion>` in `frontend.md`.

PR #27's step 3 logic and its data hooks are right, so reuse them but not its look. Its hooks already refresh the brief after a save.

```bash
git fetch origin frontend/sinulog-ui
git show origin/frontend/sinulog-ui:frontend/src/pages/OnboardingPage.tsx
```

Also read these from the same branch: `src/hooks/useProfile.ts`, `src/hooks/usePlaces.ts`, `src/components/locations/PlaceForm.tsx`, `src/components/schedule/TripForm.tsx` and `PinDropMap` in `src/components/map/maps.tsx`.

| Part | It asks for | It saves |
| --- | --- | --- |
| Places | At least two places: kind, label, address and a map pin. Home's address starts from `profile.addressText` | `POST /api/locations` for each |
| First trip | Title, days, arrive-by, from and to. It shows once two places are saved, because a trip needs two different places | `POST /api/schedule`, then `PATCH /api/profile` with `commuteOriginLocationId` and `commuteDestinationLocationId` |

- **Map pin:** start it at the user's city from `GET /api/areas`. The browser must not call a geocoding service, and Leaflet loads only when this page opens.
- **"Skip for now"** shows at the top and goes to Today. Anything already saved stays saved.
- **Errors** from the API show beside the matching field (`error.details[].path`).
- **Setup prompt:** Today's prompt now appears only if the trigger dropped a bad city or mayor. Change its link ([`TodayPage.tsx:29`](../../frontend/src/pages/TodayPage.tsx)) from `/welcome` to `/profile?section=details`, since `/welcome` no longer asks for those.

### 5. Make the mocks match

- **Save what was typed:** in the mock branch of `signUp`, store the sign-up details as JSON in `FRESH_USER_KEY` instead of `'1'`. Have `freshDb()` ([`handlers.ts:42`](../../frontend/src/mocks/handlers.ts)) use them for `firstName`, `displayName`, `city`, `addressText` and `subscribedMayor`.
- **Show the email path:** an email starting with `confirm@` returns `{ needsConfirmation: true }` without signing in, so the "check your email" screen can be seen without real email.

## Done when

With `VITE_USE_MOCKS=true`:

- [ ] Step 1 won't continue with a bad field, and step 2 won't submit without a city, address and mayor.
- [ ] Choosing Talisay City selects the Province of Cebu, and choosing Mandaue City selects Mandaue City, until the user picks a mayor themselves.
- [ ] "Back" keeps what was typed, and the card doesn't change height between steps.
- [ ] Finishing sign-up as "Thea" gives "Maayong …, Thea" on Today, the address in the header, the chosen mayor's post and no setup prompt.
- [ ] Signing up with `confirm@example.com` shows "check your email" with no ride.
- [ ] Saving two places and a trip on `/welcome` gives a next trip on Today, and "Skip for now" goes to Today.
- [ ] These work at 375px and 1440px, in light and dark mode.
- [ ] `npm --prefix frontend run build` passes.

Once against the real project, after Part 1:

- [ ] A real sign-up either shows "check your email" and the link opens `/welcome` signed in, or goes straight to `/welcome` if "Confirm email" is off.
- [ ] This query shows what was typed:

```sql
select first_name, display_name, city, address_text, subscribed_mayor
from public.profiles
order by created_at desc
limit 1;
```

## Also found (a separate task)

"Forgot password?" sends the email, but the app has no screen for setting a new password: `supabase.auth.updateUser` isn't called anywhere. The link signs the user in and opens Today, so their old password never changes.
