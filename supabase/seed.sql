-- Development seed data for Sugbo Now.

insert into public.alerts (
  source,
  type,
  severity,
  title,
  summary,
  area_name,
  starts_at,
  ends_at,
  fingerprint,
  raw
)
values (
  'manual',
  'advisory',
  'medium',
  'Sample Cebu traffic advisory',
  'This is development-only test data.',
  'Cebu City',
  now(),
  now() + interval '1 day',
  'sample-cebu-advisory-001',
  '{}'::jsonb
)
on conflict (fingerprint) do nothing;
