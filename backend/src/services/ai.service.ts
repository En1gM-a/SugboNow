// Writes the text of the Cebu Daily Brief. The AI provider is not chosen yet
// (AI_API_KEY is empty), so a rules-based writer composes the brief from the
// same structured input an LLM would get. To add a provider, implement
// BriefWriter here and return it from createBriefWriter; nothing else changes.

import type { AlertSeverity, AlertType } from "../types";
import { formatClock12, formatDateLabel, manilaClock } from "../utils/time";
import { truncate } from "../utils/text";

export interface BriefWeather {
  areaName: string;
  tempC: number;
  condition: string;
  rain: { from: Date; to: Date; chance: number } | null;
}

export interface BriefCommute {
  title: string;
  destination: string;
  leaveAt: Date;
  arriveAt: Date;
  delayMinutes: number;
  topReason: string | null;
}

export interface BriefAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  areaName: string | null;
  nearPlace: string | null;
}

export interface BriefInput {
  date: Date;
  firstName: string | null;
  weather: BriefWeather | null;
  // Today's trips, earliest departure first.
  commutes: BriefCommute[];
  // Most important first.
  alerts: BriefAlert[];
  lguPost: { officialName: string; text: string } | null;
  hasPlaces: boolean;
}

export interface BriefWriter {
  readonly name: string;
  write(input: BriefInput): Promise<string>;
}

function greeting(input: BriefInput): string {
  const hour = Number(manilaClock(input.date).slice(0, 2));
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = input.firstName ? `, ${input.firstName}` : "";
  return `${salutation}${name}! Here's your Cebu brief for ${formatDateLabel(input.date)}.`;
}

function weatherSection(weather: BriefWeather | null): string | null {
  if (!weather) return null;
  const now = `Weather in ${weather.areaName}: ${Math.round(weather.tempC)}°C, ${weather.condition.toLowerCase()}.`;
  if (!weather.rain) return `${now} No rain expected in the next few hours.`;
  return `${now} Rain likely from ${formatClock12(weather.rain.from)} to ${formatClock12(weather.rain.to)} (${weather.rain.chance}% chance), so bring an umbrella.`;
}

function commuteSection(input: BriefInput): string {
  if (input.commutes.length === 0) {
    return input.hasPlaces
      ? "No trips on your schedule today."
      : "Add your home, school or work and your weekly schedule to get leave-time suggestions.";
  }
  const lines = input.commutes.map((commute) => {
    const extra = commute.delayMinutes > 0 && commute.topReason ? ` (+${commute.delayMinutes} min: ${commute.topReason})` : "";
    return `• ${commute.title}: leave by ${formatClock12(commute.leaveAt)} to reach ${commute.destination} by ${formatClock12(commute.arriveAt)}${extra}.`;
  });
  return ["Your trips today:", ...lines].join("\n");
}

function alertSection(input: BriefInput): string | null {
  if (input.alerts.length === 0) return input.hasPlaces ? "No alerts near your places right now." : null;
  const lines = input.alerts.map((alert) => {
    const where = alert.nearPlace ? ` (near your ${alert.nearPlace})` : alert.areaName ? ` (${alert.areaName})` : "";
    const flag = alert.severity === "high" ? "⚠️ " : "";
    return `• ${flag}${alert.title}${where}`;
  });
  return ["Heads-up near your places:", ...lines].join("\n");
}

export const rulesBriefWriter: BriefWriter = {
  name: "rules",
  async write(input) {
    const sections = [
      greeting(input),
      weatherSection(input.weather),
      commuteSection(input),
      alertSection(input),
      input.lguPost ? `From ${input.lguPost.officialName}: ${truncate(input.lguPost.text, 200)}` : null,
    ];
    return sections.filter((section): section is string => Boolean(section)).join("\n\n");
  },
};

export function createBriefWriter(_aiApiKey?: string): BriefWriter {
  // No LLM provider yet; see the note at the top of this file.
  return rulesBriefWriter;
}
