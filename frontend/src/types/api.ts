// Frontend API types mirror docs/api-contract.md.

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: ApiErrorDetail[] };
}

// Profile

export interface Profile {
  id: string;
  displayName: string | null;
  firstName: string | null;
  city: string | null;
  addressText: string | null;
  subscribedMayor: string | null;
  commuteOriginLocationId: string | null;
  commuteDestinationLocationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'displayName'
    | 'firstName'
    | 'city'
    | 'addressText'
    | 'subscribedMayor'
    | 'commuteOriginLocationId'
    | 'commuteDestinationLocationId'
  >
>;

// Reference lists

export interface Area {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export interface AreasResponse {
  areas: Area[];
}

export interface LguSource {
  slug: string;
  displayName: string;
  officialName: string | null;
  officialTitle: 'mayor' | 'governor' | null;
  lguType: string;
  fbPageUrl: string | null;
}

export interface LguSourcesResponse {
  sources: LguSource[];
}

// Saved places

export type LocationKind = 'home' | 'school' | 'work' | 'other';

export interface Location {
  id: string;
  label: string;
  kind: LocationKind;
  addressText: string;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationInput {
  label: string;
  kind: LocationKind;
  addressText: string;
  lat: number;
  lng: number;
}

export interface LocationsResponse {
  locations: Location[];
}

// Schedule

export interface PlaceRef {
  id: string;
  label: string;
  kind: LocationKind;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  daysOfWeek: number[];
  arriveBy: string;
  originLocationId: string;
  destinationLocationId: string;
  origin: PlaceRef;
  destination: PlaceRef;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  title: string;
  daysOfWeek: number[];
  arriveBy: string;
  originLocationId: string;
  destinationLocationId: string;
}

export interface ScheduleResponse {
  entries: ScheduleEntry[];
}

// Alerts

export type AlertType = 'advisory' | 'weather' | 'flood' | 'closure' | 'traffic' | 'power' | 'water';
export type Severity = 'low' | 'medium' | 'high';
export type AlertSource = 'tomtom' | 'weatherapi' | 'facebook' | 'sunstar' | 'cebudailynews' | 'gnews' | 'manual';

export interface NearPlace {
  id: string;
  label: string;
  distanceKm: number;
}

export interface Alert {
  id: string;
  source: AlertSource;
  type: AlertType;
  severity: Severity;
  title: string;
  summary: string | null;
  lat: number | null;
  lng: number | null;
  areaName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: 'active' | 'upcoming';
  sourceUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
  nearPlaces?: NearPlace[];
}

export interface AlertsResponse {
  alerts: Alert[];
}

export interface AlertsQuery {
  type?: AlertType[];
  severity?: Severity[];
  area?: string;
  relevant?: boolean;
  limit?: number;
}

// News

export type NewsSource = 'sunstar' | 'cebudailynews' | 'gnews';

export interface NewsArticle {
  id: string;
  source: NewsSource;
  title: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  areaName: string | null;
  publishedAt: string;
  type: AlertType | 'news';
  isAlert: boolean;
}

export interface NewsResponse {
  articles: NewsArticle[];
}

// Weather

export interface WeatherCurrent {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  iconUrl: string | null;
  isDay: boolean;
  humidity: number;
  windKph: number;
  precipMm: number;
  chanceOfRain: number;
}

export interface WeatherHour {
  time: string;
  tempC: number;
  condition: string;
  iconUrl: string | null;
  chanceOfRain: number;
  precipMm: number;
}

export interface Weather {
  area: Area;
  observedAt: string;
  fetchedAt: string;
  current: WeatherCurrent;
  hourly: WeatherHour[];
}

export interface WeatherAllResponse {
  areas: Weather[];
}

// Daily brief

export interface LeaveTimeReason {
  alertId: string;
  title: string;
  severity: Severity;
  minutes: number;
  nearPlace: string;
}

export interface LeaveTime {
  scheduleEntryId: string;
  title: string;
  arriveBy: string;
  leaveAt: string;
  leaveAtIso: string;
  origin: PlaceRef;
  destination: PlaceRef;
  distanceKm: number;
  baseMinutes: number;
  delayMinutes: number;
  reasons: LeaveTimeReason[];
}

export interface BriefTodayResponse {
  date: string;
  brief: {
    id: string;
    content: string;
    generatedAt: string;
    alertIds: string[];
  };
  leaveTimes: LeaveTime[];
  alerts: Alert[];
  weather: Weather | null;
}

// LGU Facebook posts

export type LguPostType = 'text' | 'photo' | 'video' | 'album' | 'link' | 'shared' | 'event' | 'other';

export interface LguSourceSummary {
  slug: string;
  displayName: string;
  officialName: string | null;
  officialTitle: 'mayor' | 'governor' | null;
  fbPageUrl: string | null;
  lastFetchedAt: string | null;
}

export interface LguPostMedia {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  altText: string | null;
  durationSeconds: number | null;
}

export type LguPostCategory = 'class_suspension' | 'traffic' | 'weather' | 'utility' | 'general';

export interface LguPost {
  id: string;
  fbPostId: string;
  permalink: string | null;
  caption: string | null;
  postType: LguPostType;
  linkUrl: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  media: LguPostMedia[];
  reactionCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  category: LguPostCategory | null;
}

export interface LguPostsLatestResponse {
  source: LguSourceSummary | null;
  posts: LguPost[];
}

export type LguPostsRefreshStatus = 'refreshed' | 'fresh' | 'failed' | 'disabled' | 'no_subscription' | 'unknown_source';

export interface LguPostsRefreshResponse extends LguPostsLatestResponse {
  status: LguPostsRefreshStatus;
  newPosts: number;
}
