// PAGASA Visayas regional page (VisPRSD). Public HTML, no key, no official API:
// the night and day forecast, the extended outlook, the heavy-rainfall warning,
// and the thunderstorm advisories and watches. Cebu's become weather alerts.
// It reads a web page, so a PAGASA redesign breaks it: the job then fails
// instead of saving nothing (docs/data-sources.md).

import { load } from "cheerio";
import { CEBU_AREAS, type CebuArea } from "../config/areas";
import type { ForecastPeriod, NewAlert, OutlookDay } from "../types";
import { sha1, truncate } from "../utils/text";
import { addHours, manilaDateTime } from "../utils/time";
import { fetchText } from "./http";

export const PAGASA_SOURCE = "pagasa";
export const PAGASA_VISAYAS_URL = "https://www.pagasa.dost.gov.ph/regional-forecast/visprsd";

// shortcut: PAGASA gives no end time for a thunderstorm advisory; it covers the next hour or two and is
// re-issued about hourly, so 2 hours. Upgrade if PAGASA starts publishing a validity time.
const ADVISORY_HOURS = 2;

export interface PagasaAdvisory {
  heading: string; // "Thunderstorm Advisory No. 2" or "Thunderstorm Watch"
  issuedAt: Date;
  text: string;
}

export interface PagasaRegionalPage {
  issuedAt: Date | null;
  periods: ForecastPeriod[];
  outlookIssuedAt: Date | null;
  outlook: OutlookDay[];
  rainfallWarning: string | null;
  advisories: PagasaAdvisory[];
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const pad = (n: number) => String(n).padStart(2, "0");
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** "05:00 PM, 6 November, 2026" or "01:53 AM 07 November 2026", in Manila time. */
export function parsePagasaTime(text: string): Date | null {
  const m = text.match(/(\d{1,2}):(\d{2})\s*([AP]M),?\s*(\d{1,2})\s+([A-Za-z]+),?\s*(\d{4})/i);
  const month = m ? MONTHS.indexOf(m[5].toLowerCase()) : -1;
  if (!m || month < 0) return null;
  const hour = (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return manilaDateTime(`${m[6]}-${pad(month + 1)}-${pad(Number(m[4]))}`, `${pad(hour)}:${m[2]}`);
}

// "… 27° 30° Wind Speed: Light to Moderate Direction: Northeast Coastal Condition: Slight to Moderate"
function conditions(text: string) {
  const temps = [...text.matchAll(/(-?\d+)\s*°/g)].map((m) => Number(m[1]));
  const field = (label: string, stop: string) => text.match(new RegExp(`${label}:?\\s*(.+?)\\s*(?:${stop})`, "i"))?.[1] ?? null;
  return {
    minC: temps[0] ?? null,
    maxC: temps[1] ?? null,
    wind: field("Wind Speed", "Direction|$"),
    direction: field("Direction", "Coastal Condition|$"),
    coastal: field("Coastal Condition", "$"),
  };
}

export function parsePagasaRegional(html: string): PagasaRegionalPage {
  const $ = load(html);

  const periods: ForecastPeriod[] = $(".regional-forecast")
    .toArray()
    .map((el) => {
      const block = $(el);
      return {
        part: block.hasClass("day") ? ("day" as const) : ("night" as const),
        description: clean(block.find(".description").first().text()),
        ...conditions(clean(block.text())),
      };
    })
    .filter((period) => period.description);

  const outlookBox = $(".outlook-container").first();
  const outlook: OutlookDay[] = outlookBox
    .find(".outlook-item")
    .toArray()
    .map((el) => {
      const text = clean($(el).text());
      return { day: text.match(/^[A-Za-z]+/)?.[0] ?? "", ...conditions(text) };
    })
    .filter((day) => day.day);

  const rain = clean($("#rainfalls").text());

  const advisories = $("#thunderstorms")
    .children("div")
    .toArray()
    .flatMap((el) => {
      const item = $(el);
      item.find("br").replaceWith("\n");
      const lines = item.text().split("\n").map(clean).filter(Boolean);
      const issuedLine = lines.findIndex((line) => /^Issued at/i.test(line));
      const issuedAt = issuedLine >= 0 ? parsePagasaTime(lines[issuedLine]) : null;
      if (!issuedAt) return [];
      return [{ heading: lines[0].replace(/#\w+/g, "").trim(), issuedAt, text: lines.slice(issuedLine + 1).join(" ") }];
    });

  return {
    issuedAt: parsePagasaTime($(".regional-forecast").first().closest(".col-md-12").text()),
    periods,
    outlookIssuedAt: parsePagasaTime(outlookBox.parent().text()),
    outlook,
    rainfallWarning: !rain || /no heavy rainfall warning/i.test(rain) ? null : truncate(rain, 500),
    advisories,
  };
}

const areaFor = (name: string): CebuArea | undefined => CEBU_AREAS.find((area) => area.aliases.some((alias) => alias.test(name)));

// "MandaueCity" → "Mandaue City"; a Metro Cebu town gets its usual name ("LapuLapuCity" → "Lapu-Lapu City").
function townName(raw: string): string {
  const name = raw.trim().replace(/([a-z])([A-Z])/g, "$1 $2");
  return areaFor(name)?.name ?? name;
}

/** Weather alerts for the advisories and watches that name Cebu and haven't ended. */
export function cebuWeatherAlerts(advisories: PagasaAdvisory[], now: Date, sourceUrl = PAGASA_VISAYAS_URL): NewAlert[] {
  return advisories.flatMap((advisory): NewAlert[] => {
    // "#Cebu(Consolacion and MandaueCity)" names towns; a bare "#Cebu" means the whole province.
    const groups = [...advisory.text.matchAll(/#Cebu(?![A-Za-z])(?:\(([^)]*)\))?/g)];
    if (groups.length === 0) return [];
    const watch = /watch/i.test(advisory.heading);
    const hours = watch ? Number(advisory.text.match(/within (\d+) hours/i)?.[1] ?? 12) : ADVISORY_HOURS;
    const endsAt = addHours(advisory.issuedAt, hours);
    if (endsAt <= now) return [];

    const towns = [...new Set(groups.flatMap((group) => (group[1] ?? "").split(/,|\band\b/).map(townName).filter(Boolean)))];
    const where = towns.length > 0 ? towns.join(", ") : "Cebu";
    // One alert per Metro Cebu area named, so each matches the places near it; otherwise one for Cebu with no pin.
    const areas = [...new Set(towns.map(areaFor).filter((area): area is CebuArea => Boolean(area)))];
    const hazard = advisory.text.match(/^(.*?)\s+(?:are|is)\s+(?:expected|being experienced)/i)?.[1];
    return (areas.length > 0 ? areas : [null]).map((area) => ({
      source: PAGASA_SOURCE,
      type: "weather",
      severity: watch ? "low" : "medium",
      title: truncate(`${watch ? "Thunderstorm watch" : "Thunderstorm advisory"}: ${area?.name ?? where}`, 200),
      summary: watch
        ? `Thunderstorms are more likely over Cebu within ${hours} hours. PAGASA Visayas thunderstorm watch.`
        : truncate(`${hazard ?? "Thunderstorms"} in ${where}. PAGASA Visayas ${advisory.heading}.`, 300),
      lat: area?.lat ?? null,
      lng: area?.lng ?? null,
      areaName: area?.name ?? "Cebu",
      startsAt: advisory.issuedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      sourceUrl,
      imageUrl: null,
      fingerprint: `pagasa:${sha1(`${advisory.heading}|${advisory.issuedAt.toISOString()}|${area?.slug ?? "cebu"}`)}`,
      raw: { heading: advisory.heading, issued_at: advisory.issuedAt.toISOString(), text: advisory.text },
    }));
  });
}

export function fetchPagasaPage(url = PAGASA_VISAYAS_URL): Promise<string> {
  return fetchText("PAGASA", url, { headers: { Accept: "text/html" } });
}
