import { useState } from 'react';
import { vars } from '@/components/landing/parts';

/**
 * Sample, not for merging: the landing page's background as one day of what slows Cebu down, in real photographs.
 * Each section has one photo fixed behind it. The next photo's top edge rides up the screen with its section, so
 * wherever you stop scrolling each photo is whole, and it pushes in slowly while its section passes. Without scroll
 * timelines, or with motion off, the photo changes with the section instead.
 */

// shortcut: the photos load straight from Wikimedia Commons; save graded, compressed copies in the repo before this ships.
const COMMONS = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';

interface Shot {
  /** The section this photo sits behind. */
  at: string;
  /** The file's path on Commons, as its thumbnail address spells it. */
  file: string;
  /** The part of the photo to keep in view when it's cropped, and to push in toward. */
  focus: string;
  title: string;
  when: string;
  by: string;
  license: string;
}

const SHOTS: Shot[] = [
  { at: 'top', file: '8/85/Mandaue_2026-02-11_004.jpg', focus: '50% 100%', title: 'Morning traffic in Mandaue', when: 'Feb 2026', by: 'Martin Michlmayr', license: 'CC BY-SA 4.0' },
  { at: 'mornings', file: 'd/d4/Cebu_City_Traffic.jpg', focus: '42% 55%', title: 'Traffic in Cebu City', when: 'Mar 2025', by: 'Kozak005', license: 'CC BY 4.0' },
  { at: 'app', file: '0/09/Dark_clouds_on_rain_%2809-09-2022%29.jpg', focus: '50% 45%', title: 'Rain clouds over Mandaue', when: 'Sep 2022', by: 'PaulGorduiz106', license: 'CC BY-SA 4.0' },
  { at: 'checks', file: 'a/a5/Central_Nautical_Highway_construction_area_in_Mandaue_City_%282025-03-09%29.jpg', focus: '55% 50%', title: 'Road works on the Central Nautical Highway, Mandaue', when: 'Mar 2025', by: 'Wide Awake!', license: 'CC BY 4.0' },
  { at: 'how', file: 'a/a1/Mananga_River_5.jpg', focus: '55% 60%', title: 'The Mananga River in flood, Talisay', when: 'Typhoon Tino, Nov 2025', by: 'LadyPinayForever', license: 'CC0' },
  { at: 'place', file: 'c/c7/Effects_of_Typhoon_Tino_in_Cebu_City_2025-11-09_001.jpg', focus: '40% 55%', title: 'Water delivery after Typhoon Tino, Cebu City', when: 'Nov 2025', by: 'Martin Michlmayr', license: 'CC BY-SA 4.0' },
  { at: 'faq', file: 'c/c6/Mandaue_2026-03-27_004.jpg', focus: '50% 50%', title: 'Evening traffic in Mandaue', when: 'Mar 2026', by: 'Martin Michlmayr', license: 'CC BY-SA 4.0' },
  { at: 'start', file: '6/61/WikiNights_Cebu_-_Provincial_Capitol_%2809%29.jpg', focus: '45% 60%', title: 'Night on Osmeña Boulevard, Cebu City', when: 'Jan 2026', by: 'Bjeweld', license: 'CC BY-SA 4.0' },
];

const fileName = (file: string) => file.slice(file.lastIndexOf('/') + 1);
const photo = (file: string, width: number) => `${COMMONS}${file}/${width}px-${fileName(file)}`;
const indexOf = (section: string) => Math.max(0, SHOTS.findIndex((shot) => shot.at === section));

interface JourneyProps {
  section: string;
  /** The hero is showing one of its scenes, which brings its own sky. */
  away: boolean;
}

export function Journey({ section, away }: JourneyProps) {
  const active = indexOf(section);
  // A photo starts loading one section before it's needed, and stays once it has.
  const [reach, setReach] = useState(1);
  if (active + 1 > reach) setReach(active + 1);

  return (
    <div className="lp-journey" data-away={away ? '' : undefined} aria-hidden="true">
      {SHOTS.map((shot, i) => (
        <div
          key={shot.at}
          className="lp-j-shot"
          data-on={i <= active ? '' : undefined}
          data-under={i < active - 2 ? '' : undefined}
          style={i ? vars({ '--j-tl': `--j-${shot.at}` }) : undefined}
        >
          <div className="lp-j-hold">
            {i <= reach && (
              <img
                className="lp-j-img"
                src={photo(shot.file, 1920)}
                srcSet={`${photo(shot.file, 960)} 960w, ${photo(shot.file, 1920)} 1920w`}
                sizes="max(100vw, 178vh)"
                alt=""
                decoding="async"
                fetchPriority={i ? 'low' : 'high'}
                referrerPolicy="no-referrer"
                style={{ objectPosition: shot.focus, transformOrigin: shot.focus }}
                onLoad={(e) => e.currentTarget.setAttribute('data-in', '')}
              />
            )}
          </div>
        </div>
      ))}
      <div className="lp-j-grade" />
    </div>
  );
}

/** Names each photo as it arrives and credits it, as its licence asks, then leaves after a few seconds. */
export function JourneyNote({ section, away }: JourneyProps) {
  const shot = SHOTS[indexOf(section)];
  return (
    <div className="lp-j-note-wrap" data-away={away ? '' : undefined} aria-hidden="true">
      <p key={shot.at} className="lp-j-note">
        <span className="lp-j-note-title">{shot.title}</span>
        <span className="lp-j-note-by">
          {shot.when} · Photo: {shot.by}, {shot.license}
        </span>
      </p>
    </div>
  );
}
