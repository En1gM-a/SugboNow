// Pages for the local Facebook test tools (fb:latest, fb:demo).
// Mirrors the lgu_sources rows from supabase/migrations/0004_optimize_lgu_tables.sql;
// the database stays the source of truth for the app itself.

export interface LguPage {
  slug: string;
  name: string;
  official: string;
  url: string;
}

export const LGU_PAGES: LguPage[] = [
  { slug: "cebu_city", name: "Cebu City", official: "Mayor Nestor Archival", url: "https://www.facebook.com/EngrNestorArchival" },
  { slug: "lapu_lapu_city", name: "Lapu-Lapu City", official: "Mayor Cindi King Chan", url: "https://www.facebook.com/mayorcindichan" },
  { slug: "mandaue_city", name: "Mandaue City", official: 'Mayor Thadeo "Jonkie" Ouano', url: "https://www.facebook.com/JonkieOuanoPH" },
  { slug: "cebu_province", name: "Province of Cebu", official: "Governor Pamela Baricuatro", url: "https://www.facebook.com/cebugovph" },
];
