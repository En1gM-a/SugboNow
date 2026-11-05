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

/** Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions; every other town follows the Province. */
export const suggestedMayor = (city: string) => (MAYORS.some((m) => m.slug === city) ? city : 'cebu_province');

export const CLASS_SUSPENSION_NOTE = 'Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions. Every other town follows the Province of Cebu.';
