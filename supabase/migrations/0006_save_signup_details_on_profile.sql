-- Sign-up now collects the first name, home city, address and mayor (docs/handoffs/signup.md).
-- With "Confirm email" on, signUp returns no session, so the browser can't PATCH /api/profile afterwards.
-- This trigger saves the details from the auth metadata when the account is created.
--
-- It replaces only the function: the trigger stays attached, no columns change.
-- To undo it, run the function from 0001_init_schema.sql again.
-- Migration history on the live project is empty, so run this in the SQL Editor, not with `supabase db push`.

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
