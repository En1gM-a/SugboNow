-- Add profile personalization columns.
-- Adds first name, home city/address, a subscribed-mayor slug, and
-- typical commute endpoints (by reference into public.locations) to
-- public.profiles. All columns are nullable: existing profile rows are
-- created by the handle_new_user() signup trigger with no location data
-- yet on hand, and the commute columns cannot be populated until the user
-- has saved at least one location.

alter table public.profiles
  add column first_name text,
  add column city text,
  add column address_text text,
  add column subscribed_mayor text,
  add column commute_origin_location_id uuid references public.locations(id) on delete set null,
  add column commute_destination_location_id uuid references public.locations(id) on delete set null;
