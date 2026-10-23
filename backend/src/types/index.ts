// Shared backend types.

import type { SupabaseClient } from "@supabase/supabase-js";

// The signed-in user making a request. The access token is forwarded to
// Supabase so Row Level Security applies to their own data.
export interface RequestUser {
  id: string;
  accessToken: string;
}

// Creates a Supabase client that acts as the user who owns `accessToken`.
export type UserClientFactory = (accessToken: string) => SupabaseClient;

// ---------------------------------------------------------------------------
// Alerts (public.alerts)
// ---------------------------------------------------------------------------

export const ALERT_TYPES = ["traffic", "weather", "flood", "closure", "power", "water", "advisory", "news"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ["low", "medium", "high"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

// Alert sources that are news outlets; /api/news lists alerts from these.
export const NEWS_SOURCES = ["sunstar", "cebudailynews", "gnews"] as const;
export type NewsSource = (typeof NEWS_SOURCES)[number];

export interface AlertRow {
  id: string;
  source: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  summary: string | null;
  lat: number | null;
  lng: number | null;
  area_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  source_url: string | null;
  image_url: string | null;
  created_at: string;
}

// An alert produced by an ingestion job, ready to upsert by fingerprint.
export interface NewAlert {
  source: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  summary: string | null;
  lat: number | null;
  lng: number | null;
  areaName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  fingerprint: string;
  raw: Record<string, unknown>;
}

// A news article from any news source, before classification.
export interface NewsArticle {
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date | null;
  imageUrl: string | null;
  extra: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// User data (profiles, locations, schedule_entries)
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  display_name: string | null;
  first_name: string | null;
  city: string | null;
  address_text: string | null;
  subscribed_mayor: string | null;
  commute_origin_location_id: string | null;
  commute_destination_location_id: string | null;
  created_at: string;
  updated_at: string;
}

export const LOCATION_KINDS = ["home", "school", "work", "other"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export interface LocationRow {
  id: string;
  label: string;
  kind: LocationKind;
  address_text: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

export interface LocationRef {
  id: string;
  label: string;
  kind: LocationKind;
}

export interface ScheduleRow {
  id: string;
  title: string;
  days_of_week: number[];
  arrive_by: string; // "HH:MM:SS"
  origin_location_id: string;
  destination_location_id: string;
  origin: LocationRef | null;
  destination: LocationRef | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Weather (public.weather_snapshots) and briefs (public.daily_briefs)
// ---------------------------------------------------------------------------

export interface WeatherConditions {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  iconUrl: string | null;
  isDay: boolean;
  humidity: number;
  windKph: number;
  precipMm: number;
  chanceOfRain: number | null;
}

export interface WeatherHour {
  time: string; // ISO timestamp
  tempC: number;
  condition: string;
  iconUrl: string | null;
  chanceOfRain: number;
  precipMm: number;
}

export interface WeatherSnapshotRow {
  area_slug: string;
  area_name: string;
  lat: number;
  lng: number;
  observed_at: string;
  current_conditions: WeatherConditions;
  hourly_forecast: WeatherHour[];
  fetched_at: string;
}

export interface DailyBriefRow {
  id: string;
  user_id: string;
  brief_date: string; // YYYY-MM-DD, Asia/Manila
  content: string;
  alert_ids: string[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// LGU Facebook pages and posts
// ---------------------------------------------------------------------------

export type LguType = "city" | "municipality" | "province";
export type OfficialTitle = "mayor" | "governor";

// Row shape of public.lgu_sources (columns the backend uses).
export interface LguSource {
  id: string;
  slug: string;
  display_name: string;
  official_name: string | null;
  official_title: OfficialTitle | null;
  lgu_type: LguType;
  fb_page_url: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
}

export type FbPostType = "text" | "photo" | "video" | "album" | "link" | "shared" | "event" | "other";

// One item of lgu_posts.media.
export interface FbMediaItem {
  type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  width: number | null;
  height: number | null;
  alt_text?: string | null;
  duration_seconds?: number | null;
}

// A post as read from a Facebook page, before it is saved.
export interface ScrapedFbPost {
  fbPostId: string;
  permalink: string | null;
  caption: string | null;
  postType: FbPostType;
  linkUrl: string | null;
  postedAt: Date | null;
  media: FbMediaItem[];
  reactionCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  contentHash: string;
  // lgu_posts.category, set from the caption before saving.
  category?: string | null;
  // Small, curated summary of the source data. Never comments or commenters.
  raw: Record<string, unknown>;
}

// Row shape of public.lgu_posts returned to the API layer.
export interface LguPostRow {
  id: string;
  fb_post_id: string;
  permalink: string | null;
  caption: string | null;
  post_type: FbPostType;
  link_url: string | null;
  posted_at: string | null;
  first_seen_at: string;
  media: FbMediaItem[];
  reaction_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  view_count: number | null;
  category: string | null;
}
