// Decides whether a news article or LGU Facebook post is an alert, by keyword
// (English, Cebuano and Tagalog). Alerts are for things that disrupt daily
// life in Cebu, or major events that can lead to them:
//
//   advisory  class suspensions, and class advisories such as resumptions
//   weather   typhoons, storm signals, heavy-rain warnings, calamity
//   flood     flooding (not "flood control" projects)
//   closure   road closures, rerouting, landslides, impassable roads
//   power     brownouts and power interruptions (not power-rate news)
//   water     water interruptions
//   traffic   traffic advisories and heavy congestion
//
// Everything else (politics, crime, sports, business, …) stays plain news
// (type "news"): listed by /api/news, never shown as an alert. An AI
// classifier can replace this behind the same function.

import type { AlertSeverity, AlertType } from "../types";

export interface Classification {
  type: AlertType;
  severity: AlertSeverity;
  // How long the alert stays active after publication.
  ttlHours: number;
}

interface Rule extends Classification {
  include: RegExp[];
  exclude?: RegExp[];
}

// First matching rule wins, so more specific rules come first.
const RULES: Rule[] = [
  {
    // Class suspensions.
    type: "advisory",
    severity: "high",
    ttlHours: 24,
    include: [
      /\bclass(es)? suspen/i,
      /\bsuspen\w* (of )?(all )?(face-to-face |f2f |in-person )?classes\b/i,
      /\bclasses (are |were |will be |have been )?suspended\b/i,
      /\bno (face-to-face |in-person )?classes\b/i,
      /\bwalay (klase|eskwela)\b/i,
      /\bwalang pasok\b/i,
    ],
    exclude: [/\bsuspension (rules|guidelines|policy|policies|matrix|protocols?)\b/i],
  },
  {
    // Other class advisories, e.g. classes resume or continue as scheduled.
    type: "advisory",
    severity: "medium",
    ttlHours: 24,
    include: [
      /\bclass(es)? advisory\b/i,
      /\bclasses (will |shall )?(resume|continue)\b/i,
      /\b(resumption|continuation) of (face-to-face )?classes\b/i,
      /\bnaay klase\b/i,
    ],
  },
  {
    // Major weather that can cause floods, closures or class suspensions.
    type: "weather",
    severity: "high",
    ttlHours: 36,
    include: [
      /\b(super )?typhoon\b/i,
      /\b(severe )?tropical (storm|depression)\b/i,
      /\bsignal no\.? ?[1-5]\b/i,
      /\bstorm signal\b/i,
      /\b(heavy )?rainfall (warning|advisory)\b/i,
      /\bheavy rain (warning|advisory)\b/i,
      /\bstorm surge\b/i,
      /\bgale warning\b/i,
      /\bstate of calamity\b/i,
    ],
  },
  {
    type: "flood",
    severity: "high",
    ttlHours: 24,
    include: [/\bflood(s|ed|ing)?\b/i, /\bflash floods?\b/i, /\b(baha|nabaha|binaha)\b/i, /\b(knee|waist)-deep\b/i],
    exclude: [/\bflood[- ]control\b/i, /\bflood ?walls?\b/i, /\bflood (mitigation|insurance)\b/i, /\bflood of\b/i],
  },
  {
    // Road blockages.
    type: "closure",
    severity: "high",
    ttlHours: 24,
    include: [
      /\broads? (closure|closed|block(ed|age))\b/i,
      /\b(closed|close) to (traffic|motorists|vehicles)\b/i,
      /\bimpassable\b/i,
      /\brerout(e|ed|es|ing)\b/i,
      /\blandslides?\b/i,
      /\b(hillside|road|bridge) collapse\b/i,
      /\bnarrows? (the )?road\b/i,
      /\bbridge (is )?closed\b/i,
    ],
  },
  {
    // Utilities rank below class, weather and road alerts.
    type: "power",
    severity: "low",
    ttlHours: 48,
    include: [
      /\bbrownouts?\b/i,
      /\bpower (interruption|outage|cut)s?\b/i,
      /\bscheduled (power )?interruptions?\b/i,
      /\bwalay (suga|kuryente)\b/i,
    ],
    exclude: [/\bpower rates?\b/i, /\brate (hike|increase|adjustment|cut)s?\b/i, /\bper kwh\b/i],
  },
  {
    type: "water",
    severity: "low",
    ttlHours: 48,
    include: [/\bwater (service )?(interruption|outage|shortage)s?\b/i, /\bwalay tubig\b/i, /\bno water\b/i],
  },
  {
    type: "traffic",
    severity: "medium",
    ttlHours: 12,
    include: [/\btraffic advisory\b/i, /\b(heavy|monstrous) traffic\b/i, /\btraffic (jam|gridlock|congestion)\b/i, /\bgridlock\b/i],
  },
];

const NEWS: Classification = { type: "news", severity: "low", ttlHours: 24 };

// Plain letters for styled Unicode text: Facebook captions often use
// "𝗖𝗟𝗔𝗦𝗦 𝗔𝗗𝗩𝗜𝗦𝗢𝗥𝗬"-style bold letters, which NFKC turns into "CLASS ADVISORY".
export function plainText(text: string): string {
  return text.normalize("NFKC");
}

export function classifyAdvisory(input: string): Classification {
  const text = plainText(input);
  for (const rule of RULES) {
    if (rule.exclude?.some((pattern) => pattern.test(text))) continue;
    if (rule.include.some((pattern) => pattern.test(text))) {
      return { type: rule.type, severity: rule.severity, ttlHours: rule.ttlHours };
    }
  }
  return NEWS;
}

// True when the classification should show as an alert, not just news.
export function isAlert(classification: Classification): boolean {
  return classification.type !== "news";
}

// lgu_posts.category for a classification.
export function lguPostCategory(classification: Classification): string {
  switch (classification.type) {
    case "advisory":
      return "class_suspension";
    case "closure":
    case "traffic":
      return "traffic";
    case "flood":
    case "weather":
      return "weather";
    case "power":
    case "water":
      return "utility";
    default:
      return "general";
  }
}
