-- Optimize the LGU Facebook tables from 0003 in place.
--
-- 1. lgu_sources: add constraints and fetch-health columns; fill in the
--    confirmed pages and officials; remove Talisay City (a component city of
--    the Province of Cebu, which is covered by the cebu_province source).
-- 2. lgu_posts (still empty): add the fields ingestion needs to track post
--    type, pinned posts, edits and deletions, and make the indexes partial so
--    they match the read paths.
-- 3. Index four existing foreign keys flagged by the Supabase performance
--    advisor (profiles and schedule_entries).
--
-- As before: only the pages' own posts are stored, never comments, commenter
-- names, or other Facebook user data. Signed-in users can read; only the
-- service role (backend ingestion jobs) writes. Existing RLS policies and
-- grants on both tables are unchanged.

-- ---------------------------------------------------------------------------
-- 1. lgu_sources
-- ---------------------------------------------------------------------------

alter table public.lgu_sources
  add column official_title text,
  add column last_fetch_error text,
  add constraint lgu_sources_slug_format check (slug ~ '^[a-z0-9_]+$'),
  add constraint lgu_sources_official_title_check
    check (official_title in ('mayor', 'governor')),
  add constraint lgu_sources_fb_page_url_format
    check (fb_page_url ~ '^https://www\.facebook\.com/[A-Za-z0-9.]+/?$'),
  add constraint lgu_sources_fb_page_url_key unique (fb_page_url),
  add constraint lgu_sources_fb_page_id_key unique (fb_page_id);

comment on column public.lgu_sources.last_fetch_error is
  'Error from the most recent failed fetch; cleared on success.';

update public.lgu_sources
set official_name = 'Nestor Archival', official_title = 'mayor'
where slug = 'cebu_city';

update public.lgu_sources
set official_name = 'Cindi King Chan', official_title = 'mayor',
    fb_page_url = 'https://www.facebook.com/mayorcindichan'
where slug = 'lapu_lapu_city';

update public.lgu_sources
set official_name = 'Thadeo "Jonkie" Ouano', official_title = 'mayor',
    fb_page_url = 'https://www.facebook.com/JonkieOuanoPH'
where slug = 'mandaue_city';

-- The Provincial Government's official page (run by the Provincial
-- Information Office), not the governor's personal page.
update public.lgu_sources
set official_name = 'Pamela Baricuatro', official_title = 'governor',
    fb_page_url = 'https://www.facebook.com/cebugovph'
where slug = 'cebu_province';

delete from public.lgu_sources where slug = 'talisay_city';

-- ---------------------------------------------------------------------------
-- 2. lgu_posts
-- ---------------------------------------------------------------------------

alter table public.lgu_posts
  add column post_type text not null default 'other'
    check (post_type in ('text', 'photo', 'video', 'album', 'link', 'shared', 'event', 'other')),
  -- Outbound link attached to the post, if any.
  add column link_url text,
  -- Pinned posts stay at the top of a page; ingestion must not treat them as
  -- the newest post.
  add column is_pinned boolean not null default false,
  add column first_seen_at timestamptz not null default now(),
  -- Set when content_hash changes after the first fetch.
  add column edited_at timestamptz,
  -- Set when a previously seen post is no longer on the page.
  add column deleted_at timestamptz,
  add column view_count integer check (view_count >= 0),
  -- Original fetched payload for reprocessing. Must not contain comments or
  -- commenter data.
  add column raw jsonb not null default '{}'::jsonb;

comment on column public.lgu_posts.fetched_at is
  'When ingestion last saw this post on the page.';
comment on column public.lgu_posts.media is
  'Array of {type: image|video, url, thumbnail_url, storage_path, width, height}. Facebook media URLs expire; storage_path is for a copy in Supabase Storage.';

-- "Latest live posts for this LGU" is the main read path, so skip deleted
-- posts. Category lookups are always newest-first and only for classified
-- posts.
drop index public.lgu_posts_source_posted_at_idx;
drop index public.lgu_posts_category_idx;

create index lgu_posts_source_latest_idx
  on public.lgu_posts(source_id, posted_at desc)
  where deleted_at is null;

create index lgu_posts_category_idx
  on public.lgu_posts(category, posted_at desc)
  where category is not null;

-- ---------------------------------------------------------------------------
-- 3. Foreign-key indexes flagged by the performance advisor
-- ---------------------------------------------------------------------------

create index profiles_commute_origin_location_id_idx
  on public.profiles(commute_origin_location_id);
create index profiles_commute_destination_location_id_idx
  on public.profiles(commute_destination_location_id);
create index schedule_entries_origin_location_id_idx
  on public.schedule_entries(origin_location_id);
create index schedule_entries_destination_location_id_idx
  on public.schedule_entries(destination_location_id);
