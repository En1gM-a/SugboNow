// The content of the landing page. The happenings are real events with their sources; the trips, delays, briefs and
// alerts are examples, and the page says so wherever they appear.

import type { SkyMix, SkyWeather } from '@/lib/sky';
import type { TimeName } from '@/lib/time';

export type BriefId = 'rain' | 'haze' | 'storm' | 'sinulog' | 'clear';

export interface Scene {
  id: string;
  kind: 'Weather' | 'Traffic';
  date: string;
  icon: string;
  /** Which sample brief the Mornings section shows after you step into this happening. */
  brief: BriefId;
  short: string;
  place: string;
  title: string;
  /** Where the happening sits on the map, and the point of its drawing the camera aims at (fxn and fyn on a phone). */
  card: { x: number; y: number; w: number; h: number; fx: number; fy: number; fxn: number; fyn: number };
  ask: string;
  stops: [string, string, string];
  /** The dial's starting position, from 0 to 1. */
  amt: number;
  delay: [number, number];
  why: string;
  /** From this tier of the dial (0, 1 or 2), classes are off and there's no trip. */
  stayAt?: number;
  /** arrive is in minutes past midnight; base is the usual trip in minutes. */
  trip: { label: string; route: string; arrive: number; base: number };
  /** The sky this happening asks for: each mix value goes from the first number to the second as the dial moves. */
  sky: { time: TimeName; weather: SkyWeather; mix: Partial<Record<keyof SkyMix, [number, number]>> };
  line: string;
  real: string;
  srcs: Array<{ t: string; u: string }>;
  /** Rows of [icon, text at tier 0, text at tier 1, text at tier 2]. */
  chain: Array<[string, string, string, string]>;
}

export const SCENES: readonly Scene[] = [
  {
    "id": "flood",
    "kind": "Weather",
    "date": "Jul 2026",
    "icon": "#i-flood",
    "brief": "rain",
    "short": "Rain floods the avenue",
    "place": "M.J. Cuenco Ave, Cebu City",
    "title": "Rain floods M.J. Cuenco",
    "card": {
      "x": 647,
      "y": 378,
      "w": 400,
      "h": 270,
      "fx": 0.5,
      "fy": 0.62,
      "fxn": 0.54,
      "fyn": 0.72
    },
    "ask": "How hard is it raining?",
    "stops": [
      "Light",
      "Heavy",
      "Torrential"
    ],
    "amt": 0.62,
    "delay": [
      3,
      42
    ],
    "why": "rain",
    "trip": {
      "label": "Classes",
      "route": "Home → School · arrive 7:30 AM",
      "arrive": 450,
      "base": 35
    },
    "sky": {
      "time": "buntag",
      "weather": "rain",
      "mix": {
        "rain": [
          0.2,
          1
        ],
        "clouds": [
          8,
          13
        ],
        "storm": [
          0,
          0.7
        ]
      }
    },
    "line": "Hard rain fills the creeks and drains first, then the avenue. Move the rain and watch the water, the road and your leave time.",
    "real": "July 30, 2026: heavy rain flooded Fuente Osmeña, M.J. Cuenco Ave and N. Bacalso Ave. Hundreds of commuters were stranded, and the city sent free buses.",
    "srcs": [
      {
        "t": "The Freeman",
        "u": "https://www.philstar.com/metro/2026/07/31/2546029/flooding-worse-tino-heavy-rains-swamp-metro"
      }
    ],
    "chain": [
      [
        "#i-rain",
        "Rain chance 40%",
        "Rain chance 80%",
        "Rain chance 95%"
      ],
      [
        "#i-flood",
        "Wet, but the road is clear",
        "Flooding on M.J. Cuenco Ave",
        "Knee-deep on M.J. Cuenco Ave"
      ],
      [
        "#i-traffic",
        "Normal traffic",
        "Slow traffic on A.S. Fortuna St",
        "Stationary traffic on Osmeña Blvd"
      ]
    ]
  },
  {
    "id": "haze",
    "kind": "Weather",
    "date": "Sep 2026",
    "icon": "#i-fog",
    "brief": "haze",
    "short": "Haze shuts classrooms",
    "place": "All of Metro Cebu",
    "title": "Haze over Metro Cebu",
    "card": {
      "x": 1114,
      "y": 887,
      "w": 400,
      "h": 270,
      "fx": 0.55,
      "fy": 0.55,
      "fxn": 0.71,
      "fyn": 0.52
    },
    "ask": "How thick is the haze?",
    "stops": [
      "Hazy",
      "Unhealthy",
      "Acutely unhealthy"
    ],
    "amt": 0.5,
    "delay": [
      2,
      14
    ],
    "why": "haze",
    "trip": {
      "label": "Classes",
      "route": "Home → School · arrive 7:30 AM",
      "arrive": 450,
      "base": 35
    },
    "stayAt": 2,
    "sky": {
      "time": "buntag",
      "weather": "haze",
      "mix": {
        "haze": [
          0.3,
          1
        ],
        "clouds": [
          2,
          0
        ],
        "sunVis": [
          0.95,
          0.5
        ]
      }
    },
    "line": "Smoke from fires in Kalimantan rode the habagat to Central Visayas. Skies went gray, and distant buildings disappeared.",
    "real": "September 2026: Metro Cebu's air quality index peaked at 296, just under the 301 emergency line. Cebu City, Lapu-Lapu, Talisay, Carcar and Minglanilla had already suspended face-to-face classes.",
    "srcs": [
      {
        "t": "SunStar",
        "u": "https://www.sunstar.com.ph/cebu/metro-cebu-air-quality-stays-very-unhealthy-amid-haze"
      },
      {
        "t": "The Freeman",
        "u": "https://www.philstar.com/nation/2026/09/03/2553765/toxic-haze-halts-classes"
      }
    ],
    "chain": [
      [
        "#i-fog",
        "Hazy skies over the channel",
        "The air is unhealthy outdoors",
        "Acutely unhealthy air"
      ],
      [
        "#i-traffic",
        "Normal traffic",
        "Drivers slow down on the bridges",
        "Fewer trips on the road"
      ],
      [
        "#i-class",
        "Classes as usual",
        "Watch your mayor's page",
        "Face-to-face classes suspended"
      ]
    ]
  },
  {
    "id": "typhoon",
    "kind": "Weather",
    "date": "Nov 2025",
    "icon": "#i-typhoon",
    "brief": "storm",
    "short": "A storm signal goes up",
    "place": "Liloan to Talisay",
    "title": "A storm signal goes up",
    "card": {
      "x": 1450,
      "y": 513,
      "w": 340,
      "h": 340,
      "fx": 0.5,
      "fy": 0.5,
      "fxn": 0.56,
      "fyn": 0.5
    },
    "ask": "Which storm signal?",
    "stops": [
      "Signal 1",
      "Signal 2",
      "Signal 3"
    ],
    "amt": 0.5,
    "delay": [
      8,
      34
    ],
    "why": "storm",
    "trip": {
      "label": "Classes",
      "route": "Home → School · arrive 7:30 AM",
      "arrive": 450,
      "base": 35
    },
    "stayAt": 2,
    "sky": {
      "time": "buntag",
      "weather": "storm",
      "mix": {
        "rain": [
          0.4,
          1
        ],
        "storm": [
          0.2,
          1
        ],
        "clouds": [
          10,
          14
        ]
      }
    },
    "line": "A signal is the start of a chain: classes first, then roads, then power. Watch how fast one morning changes.",
    "real": "November 4, 2025: during Typhoon Tino, more than a month of rain fell and floods hit 46 areas across Liloan, Mandaue, Talisay, Consolacion, Danao and Compostela.",
    "srcs": [
      {
        "t": "The Freeman",
        "u": "https://www.philstar.com/the-freeman/cebu-news/2025/11/05/2485012/cebus-worst-flooding-48-dead-29-missing"
      }
    ],
    "chain": [
      [
        "#i-typhoon",
        "Signal No. 1 for Cebu",
        "Signal No. 2 for Cebu",
        "Signal No. 3 for Cebu"
      ],
      [
        "#i-closure",
        "Roads open, with rain",
        "Fallen trees on side streets",
        "Flooded roads are impassable"
      ],
      [
        "#i-class",
        "Watch your mayor's page",
        "A class suspension is likely",
        "Classes are suspended"
      ]
    ]
  },
  {
    "id": "landslide",
    "kind": "Weather",
    "date": "Jul 2026",
    "icon": "#i-closure",
    "brief": "rain",
    "short": "A landslide takes half the road",
    "place": "Miramonte, Barangay Pit-os",
    "title": "A landslide takes half the road",
    "card": {
      "x": 492,
      "y": 76,
      "w": 400,
      "h": 270,
      "fx": 0.55,
      "fy": 0.6,
      "fxn": 0.53,
      "fyn": 0.8
    },
    "ask": "How long has it rained?",
    "stops": [
      "An hour",
      "Half a day",
      "All day"
    ],
    "amt": 0.6,
    "delay": [
      4,
      45
    ],
    "why": "landslide",
    "trip": {
      "label": "Site visit",
      "route": "Talamban → Pit-os · arrive 9:00 AM",
      "arrive": 540,
      "base": 30
    },
    "sky": {
      "time": "buntag",
      "weather": "rain",
      "mix": {
        "rain": [
          0.25,
          0.95
        ],
        "clouds": [
          8,
          12
        ],
        "storm": [
          0,
          0.3
        ]
      }
    },
    "line": "The uplands go first when the hills are soaked. A slide on a mountain road leaves you only one way around.",
    "real": "July 30, 2026: a landslide in Miramonte, Barangay Pit-os covered half the road. During Typhoon Tino, slides also blocked the Transcentral Highway.",
    "srcs": [
      {
        "t": "The Freeman, July 2026",
        "u": "https://www.philstar.com/metro/2026/07/31/2546029/flooding-worse-tino-heavy-rains-swamp-metro"
      },
      {
        "t": "The Freeman, on Tino",
        "u": "https://www.philstar.com/the-freeman/cebu-news/2025/11/05/2485012/cebus-worst-flooding-48-dead-29-missing"
      }
    ],
    "chain": [
      [
        "#i-rain",
        "Steady rain in the uplands",
        "Heavy rain warning",
        "Hours of heavy rain"
      ],
      [
        "#i-closure",
        "Road open",
        "Half the road is blocked",
        "Road closed by a landslide"
      ],
      [
        "#i-traffic",
        "Normal traffic",
        "One lane moves at a time",
        "Queuing traffic below the slide"
      ]
    ]
  },
  {
    "id": "bridge",
    "kind": "Traffic",
    "date": "Sep 2025",
    "icon": "#i-traffic",
    "brief": "clear",
    "short": "A lane closes on Fernan Bridge",
    "place": "Marcelo Fernan Bridge",
    "title": "A lane closes on Fernan Bridge",
    "card": {
      "x": 1434,
      "y": 76,
      "w": 400,
      "h": 270,
      "fx": 0.5,
      "fy": 0.62,
      "fxn": 0.5,
      "fyn": 0.56
    },
    "ask": "How long is the queue?",
    "stops": [
      "Short",
      "Long",
      "Standstill"
    ],
    "amt": 0.55,
    "delay": [
      3,
      32
    ],
    "why": "queue",
    "trip": {
      "label": "Late shift",
      "route": "Lapu-Lapu → Mandaue · arrive 11:45 PM",
      "arrive": 1425,
      "base": 25
    },
    "sky": {
      "time": "gabii",
      "weather": "clear",
      "mix": {
        "clouds": [
          2,
          2
        ]
      }
    },
    "line": "The bridges are how Mactan gets to the rest of Cebu. Close one lane, and the queue reaches back fast.",
    "real": "September 2025: the northbound lane closed nightly from 11 PM to 5 AM for deck repairs, with a zipper lane keeping traffic moving.",
    "srcs": [
      {
        "t": "SunStar",
        "u": "https://www.sunstar.com.ph/cebu/northbound-lane-closures-for-rehab"
      }
    ],
    "chain": [
      [
        "#i-closure",
        "Northbound lane closes at 11 PM",
        "Zipper lane is running",
        "One lane each way"
      ],
      [
        "#i-traffic",
        "Slow traffic near the bridge",
        "Queuing traffic on Marcelo Fernan Bridge",
        "Stationary traffic on the bridge"
      ],
      [
        "#i-clock",
        "Your time barely moves",
        "Your leave time moves up",
        "You leave a lot earlier"
      ]
    ]
  },
  {
    "id": "sinulog",
    "kind": "Traffic",
    "date": "Jan 2025",
    "icon": "#i-closure",
    "brief": "sinulog",
    "short": "Sinulog closes downtown",
    "place": "Osmeña Blvd and Fuente Osmeña",
    "title": "Sinulog closes downtown",
    "card": {
      "x": 492,
      "y": 770,
      "w": 400,
      "h": 270,
      "fx": 0.5,
      "fy": 0.65,
      "fxn": 0.5,
      "fyn": 0.6
    },
    "ask": "Which day of the Sinulog weekend?",
    "stops": [
      "Friday",
      "Saturday",
      "Sunday"
    ],
    "amt": 0.5,
    "delay": [
      8,
      45
    ],
    "why": "Sinulog",
    "trip": {
      "label": "Shift at the shop",
      "route": "Home → Colon St · arrive 9:00 AM",
      "arrive": 540,
      "base": 30
    },
    "sky": {
      "time": "udto",
      "weather": "clear",
      "mix": {
        "clouds": [
          3,
          3
        ]
      }
    },
    "line": "The closures build across the weekend, then the parade takes over downtown. It's the one big happening you can plan for weeks ahead.",
    "real": "Sinulog 2025: parts of Osmeña Blvd closed by 2 AM on parade day, and the rest of the route was sealed by 5 AM.",
    "srcs": [
      {
        "t": "myTV Cebu",
        "u": "https://mytv.ph/article/traffic-rerouting-for-sinulog-festival-bared"
      }
    ],
    "chain": [
      [
        "#i-closure",
        "Procession closes V. Rama Ave at 4 AM",
        "Osmeña Blvd partly closed from noon",
        "Osmeña Blvd closed by 2 AM"
      ],
      [
        "#i-traffic",
        "Traffic resumes after the procession",
        "Slow traffic around Fuente Osmeña",
        "Parade route sealed by 5 AM"
      ],
      [
        "#i-clock",
        "Leave a little early",
        "Leave earlier",
        "Colon St is open to private vehicles only"
      ]
    ]
  }
];

export const BRIEFS: Record<BriefId, string[]> = {
  "rain": [
    "Good morning, Thea! Here's your Cebu brief for today.",
    "Weather in Cebu City: 25°C, heavy rain this morning.",
    "Classes: leave by 6:23 AM to reach School by 7:30 AM (+32 min: flooding on M.J. Cuenco Ave)."
  ],
  "haze": [
    "Good morning, Thea! Here's your Cebu brief for today.",
    "Weather in Cebu City: 28°C, hazy.",
    "Cebu City: Walay klase today. Your mayor's post says face-to-face classes are suspended."
  ],
  "storm": [
    "Good morning, Thea! Here's your Cebu brief for today.",
    "Weather in Cebu City: 24°C, Signal No. 2.",
    "Cebu City: Walay klase. Flooded roads are near your places, so stay home if you can."
  ],
  "sinulog": [
    "Good morning, Thea! Here's your Cebu brief for today.",
    "Weather in Cebu City: 31°C, sunny.",
    "Shift at the shop: leave by 7:45 AM to reach Colon St by 9:00 AM (+45 min: Osmeña Blvd is closed)."
  ],
  "clear": [
    "Good morning, Thea! Here's your Cebu brief for today.",
    "Weather in Cebu City: 30°C, sunny.",
    "Classes: leave by 6:55 AM to reach School by 7:30 AM. No delays near your places."
  ]
};

export const BRIEF_TABS: ReadonlyArray<[BriefId, string]> = [["rain","Rain"],["haze","Haze"],["storm","Storm"],["sinulog","Sinulog"],["clear","Clear"]];

export const ALERTS = [
  {
    "icon": "#i-traffic",
    "title": "Stationary traffic on Osmeña Blvd",
    "sub": "Adds about 4 min",
    "sev": "sev-medium",
    "label": "Medium"
  },
  {
    "icon": "#i-closure",
    "title": "Road closure: N. Bacalso Ave drainage works",
    "sub": "1.2 km from School",
    "sev": "sev-high",
    "label": "High"
  },
  {
    "icon": "#i-traffic",
    "title": "Queuing traffic on Marcelo Fernan Bridge",
    "sub": "Adds about 6 min",
    "sev": "sev-low",
    "label": "Low"
  },
  {
    "icon": "#i-flood",
    "title": "Flooding on M.J. Cuenco Ave near Mabolo",
    "sub": "0.8 km from Home",
    "sev": "sev-high",
    "label": "High"
  },
  {
    "icon": "#i-power",
    "title": "Scheduled power interruption in parts of Talisay",
    "sub": "Near your work",
    "sev": "sev-medium",
    "label": "Medium"
  }
] as const;

/** Name, the sign on the jeepney, and whose class suspensions apply. */
export const TOWNS: ReadonlyArray<[string, string, string]> = [
  [
    "Cebu City",
    "CEBU CITY",
    " decides its own class suspensions."
  ],
  [
    "Mandaue City",
    "MANDAUE",
    " decides its own class suspensions."
  ],
  [
    "Lapu-Lapu City",
    "LAPU-LAPU",
    " decides its own class suspensions."
  ],
  [
    "Talisay City",
    "TALISAY",
    " follows the Province of Cebu for class suspensions."
  ],
  [
    "Consolacion",
    "CONSOLACION",
    " follows the Province of Cebu for class suspensions."
  ],
  [
    "Liloan",
    "LILOAN",
    " follows the Province of Cebu for class suspensions."
  ],
  [
    "Minglanilla",
    "MINGLANILLA",
    " follows the Province of Cebu for class suspensions."
  ],
  [
    "Naga City",
    "NAGA",
    " follows the Province of Cebu for class suspensions."
  ],
  [
    "Cordova",
    "CORDOVA",
    " follows the Province of Cebu for class suspensions."
  ]
];
