// Database rows → API response shapes (camelCase), as defined in
// docs/api-contract.md.

import type { CebuArea } from "../config/areas";
import type { NearbyPlace } from "../services/matching.service";
import type { LeaveTimeSuggestion, TodayBrief } from "../services/brief.service";
import type {
  AlertRow,
  LguSource,
  LocationRef,
  LocationRow,
  ProfileRow,
  ScheduleRow,
  WeatherSnapshotRow,
} from "../types";
import { manilaClock } from "../utils/time";

export function presentProfile(row: ProfileRow) {
  return {
    id: row.id,
    displayName: row.display_name,
    firstName: row.first_name,
    city: row.city,
    addressText: row.address_text,
    subscribedMayor: row.subscribed_mayor,
    commuteOriginLocationId: row.commute_origin_location_id,
    commuteDestinationLocationId: row.commute_destination_location_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function presentArea(area: CebuArea) {
  return { slug: area.slug, name: area.name, lat: area.lat, lng: area.lng };
}

export function presentLguSource(source: LguSource) {
  return {
    slug: source.slug,
    displayName: source.display_name,
    officialName: source.official_name,
    officialTitle: source.official_title,
    lguType: source.lgu_type,
    fbPageUrl: source.fb_page_url,
  };
}

export function presentLocation(row: LocationRow) {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind,
    addressText: row.address_text,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function presentLocationRef(ref: LocationRef | null) {
  return ref ? { id: ref.id, label: ref.label, kind: ref.kind } : null;
}

export function presentSchedule(row: ScheduleRow) {
  return {
    id: row.id,
    title: row.title,
    daysOfWeek: row.days_of_week,
    arriveBy: row.arrive_by.slice(0, 5),
    originLocationId: row.origin_location_id,
    destinationLocationId: row.destination_location_id,
    origin: presentLocationRef(row.origin),
    destination: presentLocationRef(row.destination),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function presentAlert(row: AlertRow, now: Date, nearPlaces?: NearbyPlace[]) {
  return {
    id: row.id,
    source: row.source,
    type: row.type,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    lat: row.lat,
    lng: row.lng,
    areaName: row.area_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.starts_at && Date.parse(row.starts_at) > now.getTime() ? "upcoming" : "active",
    sourceUrl: row.source_url,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    ...(nearPlaces ? { nearPlaces } : {}),
  };
}

export function presentNews(row: AlertRow) {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    summary: row.summary,
    url: row.source_url,
    imageUrl: row.image_url,
    areaName: row.area_name,
    publishedAt: row.starts_at,
    // "news" for ordinary stories; another alert type when the story is also an alert.
    type: row.type,
    isAlert: row.type !== "news",
  };
}

export function presentWeather(row: WeatherSnapshotRow) {
  return {
    area: { slug: row.area_slug, name: row.area_name, lat: row.lat, lng: row.lng },
    observedAt: row.observed_at,
    fetchedAt: row.fetched_at,
    current: row.current_conditions,
    hourly: row.hourly_forecast,
  };
}

function presentLeaveTime(trip: LeaveTimeSuggestion) {
  return {
    scheduleEntryId: trip.scheduleEntryId,
    title: trip.title,
    arriveBy: trip.arriveBy,
    leaveAt: manilaClock(trip.leaveAt),
    leaveAtIso: trip.leaveAt.toISOString(),
    origin: presentLocationRef(trip.origin),
    destination: presentLocationRef(trip.destination),
    distanceKm: trip.distanceKm,
    baseMinutes: trip.baseMinutes,
    delayMinutes: trip.delayMinutes,
    reasons: trip.reasons,
  };
}

export function presentTodayBrief(today: TodayBrief, now: Date) {
  return {
    date: today.date,
    brief: {
      id: today.brief.id,
      content: today.brief.content,
      generatedAt: today.brief.updated_at,
      alertIds: today.brief.alert_ids,
    },
    leaveTimes: today.leaveTimes.map(presentLeaveTime),
    alerts: today.alerts.map(({ alert, places }) => presentAlert(alert, now, places)),
    weather: today.weather ? presentWeather(today.weather) : null,
  };
}
