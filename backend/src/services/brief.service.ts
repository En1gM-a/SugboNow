// The Cebu Daily Brief (README "Core Logic" 3): today's weather, trips with
// leave times, and alerts near the user's places, written up by the brief
// writer and saved to daily_briefs.
//
// The brief text is a once-a-day snapshot (05:30 job, or the first time the
// user opens it that day). Alerts and leave times in GET /api/brief/today are
// recomputed on every request so they stay current. Building a brief only
// reads the database, so opening it never calls an outside service.

import { getArea } from "../config/areas";
import type { DailyBriefRow, LocationRef, LocationRow, WeatherSnapshotRow } from "../types";
import { nearestArea } from "../utils/geo";
import type { Logger } from "../utils/logger";
import { addHours, manilaDate, manilaWeekday } from "../utils/time";
import type { AlertsRepository } from "./alerts.repository";
import { DEFAULT_ALERT_TYPES, type AlertWithPlaces } from "./alerts.service";
import type { BriefInput, BriefWriter } from "./ai.service";
import type { BriefProfile, BriefRepository } from "./brief.repository";
import { computeLeaveTime, type LeaveTimeResult } from "./leaveTime.service";
import { compareAlerts, matchAlertsToPlaces } from "./matching.service";
import type { WeatherRepository } from "./weather.repository";

const BRIEF_ALERT_LIMIT = 10;
const BRIEF_TEXT_ALERT_LIMIT = 5;
const LGU_POST_MAX_AGE_HOURS = 36;
const RAIN_CHANCE_THRESHOLD = 60;
const DEFAULT_WEATHER_AREA = "cebu_city";

export interface LatestLguPost {
  officialName: string;
  caption: string | null;
  postedAt: string | null;
}

export interface LeaveTimeSuggestion extends LeaveTimeResult {
  scheduleEntryId: string;
  title: string;
  arriveBy: string; // "HH:MM"
  origin: LocationRef;
  destination: LocationRef;
}

export interface TodayBrief {
  date: string;
  brief: DailyBriefRow;
  alerts: AlertWithPlaces[];
  leaveTimes: LeaveTimeSuggestion[];
  weather: WeatherSnapshotRow | null;
}

export interface BriefServiceDeps {
  briefs: BriefRepository;
  alerts: AlertsRepository;
  weather: WeatherRepository;
  latestLguPost: (slug: string) => Promise<LatestLguPost | null>;
  writer: BriefWriter;
  logger: Logger;
  now?: () => Date;
}

interface BriefContext {
  date: string;
  profile: BriefProfile | null;
  locations: LocationRow[];
  matched: AlertWithPlaces[];
  leaveTimes: LeaveTimeSuggestion[];
  weather: WeatherSnapshotRow | null;
  lguPost: LatestLguPost | null;
}

function ref(location: LocationRow): LocationRef {
  return { id: location.id, label: location.label, kind: location.kind };
}

// The profile's city, else the area nearest the user's home (or first place).
export function pickWeatherArea(city: string | null | undefined, locations: LocationRow[]): string {
  if (city && getArea(city)) return city;
  const home = locations.find((location) => location.kind === "home") ?? locations[0];
  return home ? nearestArea(home).area.slug : DEFAULT_WEATHER_AREA;
}

// The first rainy stretch in the next 12 hours, if any.
function rainWindow(weather: WeatherSnapshotRow, now: Date) {
  const horizon = addHours(now, 12).getTime();
  const rainy = weather.hourly_forecast.filter((hour) => {
    const time = Date.parse(hour.time);
    return time >= now.getTime() - 3_600_000 && time <= horizon && hour.chanceOfRain >= RAIN_CHANCE_THRESHOLD;
  });
  if (rainy.length === 0) return null;
  return {
    from: new Date(rainy[0].time),
    to: addHours(new Date(rainy[rainy.length - 1].time), 1),
    chance: Math.max(...rainy.map((hour) => hour.chanceOfRain)),
  };
}

function writerInput(context: BriefContext, now: Date): BriefInput {
  const post = context.lguPost;
  const recentPost =
    post?.caption && post.postedAt && now.getTime() - Date.parse(post.postedAt) <= LGU_POST_MAX_AGE_HOURS * 3_600_000
      ? { officialName: post.officialName, text: post.caption.split("\n").find((line) => line.trim())?.trim() ?? post.caption }
      : null;

  return {
    date: now,
    firstName: context.profile?.first_name ?? context.profile?.display_name ?? null,
    weather: context.weather
      ? {
          areaName: context.weather.area_name,
          tempC: context.weather.current_conditions.tempC,
          condition: context.weather.current_conditions.condition,
          rain: rainWindow(context.weather, now),
        }
      : null,
    commutes: context.leaveTimes.map((trip) => ({
      title: trip.title,
      destination: trip.destination.label,
      leaveAt: trip.leaveAt,
      arriveAt: trip.arriveAt,
      delayMinutes: trip.delayMinutes,
      topReason: trip.reasons[0] ? `${trip.reasons[0].title} near your ${trip.reasons[0].nearPlace}` : null,
    })),
    alerts: context.matched.slice(0, BRIEF_TEXT_ALERT_LIMIT).map(({ alert, places }) => ({
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      areaName: alert.area_name,
      nearPlace: places[0]?.label ?? null,
    })),
    lguPost: recentPost,
    hasPlaces: context.locations.length > 0,
  };
}

export function createBriefService(deps: BriefServiceDeps) {
  const { briefs, alerts, weather, latestLguPost, writer, logger } = deps;
  const now = deps.now ?? (() => new Date());

  async function buildContext(userId: string, at: Date): Promise<BriefContext> {
    const date = manilaDate(at);
    const weekday = manilaWeekday(at);
    const [profile, locations, schedule, active] = await Promise.all([
      briefs.getProfile(userId),
      briefs.listLocations(userId),
      briefs.listSchedule(userId),
      alerts.listActive({ now: at, startsBefore: addHours(at, 24), types: DEFAULT_ALERT_TYPES, limit: 300 }),
    ]);

    const matched = matchAlertsToPlaces(active, locations)
      .sort((a, b) => compareAlerts(a.alert, b.alert))
      .slice(0, BRIEF_ALERT_LIMIT);

    const byId = new Map(locations.map((location) => [location.id, location]));
    const leaveTimes = schedule
      .filter((entry) => entry.days_of_week.includes(weekday))
      .flatMap((entry): LeaveTimeSuggestion[] => {
        const origin = byId.get(entry.origin_location_id);
        const destination = byId.get(entry.destination_location_id);
        if (!origin || !destination) return [];
        const result = computeLeaveTime({ date, arriveBy: entry.arrive_by, origin, destination, alerts: active });
        return [
          {
            scheduleEntryId: entry.id,
            title: entry.title,
            arriveBy: entry.arrive_by.slice(0, 5),
            origin: ref(origin),
            destination: ref(destination),
            ...result,
          },
        ];
      })
      .sort((a, b) => a.leaveAt.getTime() - b.leaveAt.getTime());

    const [snapshot, lguPost] = await Promise.all([
      weather.get(pickWeatherArea(profile?.city, locations)),
      profile?.subscribed_mayor ? latestLguPost(profile.subscribed_mayor) : Promise.resolve(null),
    ]);

    return { date, profile, locations, matched, leaveTimes, weather: snapshot, lguPost };
  }

  async function save(userId: string, context: BriefContext, at: Date): Promise<DailyBriefRow> {
    const content = await writer.write(writerInput(context, at));
    return briefs.saveBrief({
      userId,
      date: context.date,
      content,
      alertIds: context.matched.map(({ alert }) => alert.id),
    });
  }

  return {
    // Today's brief for the user, creating it on first open if the morning
    // job hasn't yet.
    async getToday(userId: string): Promise<TodayBrief> {
      const at = now();
      const context = await buildContext(userId, at);
      const brief = (await briefs.getBrief(userId, context.date)) ?? (await save(userId, context, at));
      return { date: context.date, brief, alerts: context.matched, leaveTimes: context.leaveTimes, weather: context.weather };
    },

    // Morning job: a fresh brief for every user with a trip today.
    async generateAll(at = now()): Promise<{ generated: number; failed: number }> {
      const userIds = await briefs.listUserIdsWithScheduleOn(manilaWeekday(at));
      let generated = 0;
      let failed = 0;
      for (const userId of userIds) {
        try {
          await save(userId, await buildContext(userId, at), at);
          generated++;
        } catch (error) {
          failed++;
          logger.warn("Could not generate brief", { userId, error: error instanceof Error ? error.message : String(error) });
        }
      }
      return { generated, failed };
    },
  };
}

export type BriefService = ReturnType<typeof createBriefService>;
