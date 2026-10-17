-- Add storage for official LGU / mayor Facebook posts.
-- lgu_sources: one row per official page we follow. Its slug matches
--   profiles.subscribed_mayor (e.g. 'cebu_city').
-- lgu_posts: one row per post from those pages, written only by backend
--   ingestion jobs (service role). Signed-in users can read both tables.
-- Only the pages' own posts are stored; never comments, commenter names, or
-- any other user data from Facebook.

create table public.lgu_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  official_name text,
  lgu_type text not null check (lgu_type in ('city', 'municipality', 'province')),
  fb_page_url text,
  fb_page_id text,
  is_active boolean not null default true,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lgu_posts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.lgu_sources(id) on delete cascade,
  fb_post_id text not null,
  permalink text,
  caption text,
  posted_at timestamptz,
  fetched_at timestamptz not null default now(),
  -- Array of {type: 'image'|'video', url, thumbnail_url, storage_path, width, height}.
  -- Facebook media URLs expire; storage_path is reserved for a later copy
  -- into Supabase Storage.
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
  reaction_count integer check (reaction_count >= 0),
  comment_count integer check (comment_count >= 0),
  share_count integer check (share_count >= 0),
  -- Hash of the normalized caption + media, used to detect edited posts.
  content_hash text,
  -- Filled in later by classification, e.g. 'class_suspension', 'traffic',
  -- 'weather', 'utility', 'event', 'general'.
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, fb_post_id)
);

create index lgu_posts_source_posted_at_idx on public.lgu_posts(source_id, posted_at desc);
create index lgu_posts_category_idx on public.lgu_posts(category);

create trigger lgu_sources_updated_at
before update on public.lgu_sources
for each row execute procedure public.set_updated_at();

create trigger lgu_posts_updated_at
before update on public.lgu_posts
for each row execute procedure public.set_updated_at();

alter table public.lgu_sources enable row level security;
alter table public.lgu_posts enable row level security;

revoke all on table public.lgu_sources from anon, authenticated;
revoke all on table public.lgu_posts from anon, authenticated;

grant select on public.lgu_sources to authenticated;
grant select on public.lgu_posts to authenticated;

grant all on public.lgu_sources to service_role;
grant all on public.lgu_posts to service_role;

-- No insert/update/delete policies: only the service role (backend jobs) writes.
create policy "Signed-in users can view LGU sources"
on public.lgu_sources for select to authenticated
using (true);

create policy "Signed-in users can view LGU posts"
on public.lgu_posts for select to authenticated
using (true);

-- Reference data. Only Cebu City's page is confirmed; the other pages and
-- officials are left NULL until confirmed. Never guess Facebook URLs.
insert into public.lgu_sources (slug, display_name, official_name, lgu_type, fb_page_url)
values
  ('cebu_city', 'Cebu City', 'Nestor Archival', 'city', 'https://www.facebook.com/EngrNestorArchival'),
  ('lapu_lapu_city', 'Lapu-Lapu City', null, 'city', null),
  ('mandaue_city', 'Mandaue City', null, 'city', null),
  ('talisay_city', 'Talisay City', null, 'city', null),
  ('cebu_province', 'Province of Cebu', null, 'province', null)
on conflict (slug) do nothing;
