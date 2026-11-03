// Live icon drawings (WI in docs/handoffs/frontend-sample.html): flat cartoon art, a #0E1726 outline 2.4 wide, flat fills
// and one hard-edged shade. Every moving part is its own small <svg> inside a <span>, and the CSS loops animate the
// span, never an element inside the SVG, so the browser runs them on the compositor (handoff <icons>).

const INK = '#0E1726';
const LINE = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;
const part = (cls: string, inner: string, style?: string) =>
  `<span class="${cls}"${style ? ` style="${style}"` : ''}><svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg></span>`;
const hop = (art: string) => `<span class="w-shadow"></span><span class="w-hop">${art}</span>`;

const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const d = `M${(32 + 18 * Math.cos(a)).toFixed(1)} ${(30 + 18 * Math.sin(a)).toFixed(1)}L${(32 + 24.5 * Math.cos(a)).toFixed(1)} ${(30 + 24.5 * Math.sin(a)).toFixed(1)}`;
  return `<path d="${d}" stroke="${INK}" stroke-width="6.2" stroke-linecap="round"/><path d="${d}" stroke="#FF9F1C" stroke-width="2.8" stroke-linecap="round"/>`;
}).join('');
const DISC = `<circle cx="32" cy="30" r="13.5" fill="#F5A300"/><circle cx="30.4" cy="28.2" r="11.6" fill="#FFC233"/><circle cx="32" cy="30" r="13.5" fill="none" ${LINE}/>`;
const MOON = `<path d="M27.76 14.05A19 19 0 1 0 47.68 36.45A15 15 0 0 1 27.76 14.05Z" fill="#F6D978" ${LINE}/>`;
const star = (x: number, y: number, k: number) =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M0-6L1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6Z" fill="#FFE9A8" ${LINE}/>`;
const CLOUD = 'M17 50a11 11 0 0 1-2-21.8 15 15 0 0 1 28.8-5.2 14 14 0 0 1 5.2 27Z';
const BAND = 'M5.2 41C12 46 20 46 26 43.5 32 47 40 46.5 44 43.5 50 46 54 44.5 57.5 40A14 14 0 0 1 49 50H17A11 11 0 0 1 5.2 41Z';
const cloud = (fill = '#FFFFFF', shade = '#CFDBEA', tf = '') =>
  `<g transform="${tf}"><path d="${CLOUD}" fill="${fill}"/><path d="${BAND}" fill="${shade}"/><path d="${CLOUD}" fill="none" ${LINE}/></g>`;
const drops = (xs: number[]) =>
  xs
    .map((x, i) =>
      part('w-drop', `<path transform="translate(${x} 56)" d="M0-7C3.2-2.6 4.8-.2 4.8 2.4A4.8 4.8 0 1 1-4.8 2.4C-4.8-.2-3.2-2.6 0-7Z" fill="#3E8BE8" ${LINE}/>`, `--n:${i}`),
    )
    .join('');
const fogLine = (x: number, y: number, w: number, cls: string) => part(cls, `<rect x="${x}" y="${y}" width="${w}" height="5.6" rx="2.8" fill="#E8EEF6" ${LINE}/>`);
const SMALL_SUN = 'translate(14 -6) scale(.78)';
const SMALL_MOON = 'translate(16 -8) scale(.74)';
const carWheel = (x: number, y: number) =>
  part(
    'w-wheel',
    `<circle cx="${x}" cy="${y}" r="7.4" fill="${INK}"/><circle cx="${x}" cy="${y}" r="3" fill="#C9D3DF"/><path d="M${x - 5.6} ${y}H${x + 5.6}" stroke="#8C99AA" stroke-width="1.6"/>`,
    `transform-origin:${(x / 0.64).toFixed(1)}% ${(y / 0.64).toFixed(1)}%`,
  );
const WATER = 'M32 9C40 20 48 28 48 38A16 16 0 1 1 16 38C16 28 24 20 32 9Z';

export const LIVE_ART = {
  // Weather
  'clear-day': hop(part('w-spin', RAYS, 'transform-origin:50% 46.9%') + part('', DISC)),
  'clear-night':
    part('w-rock', MOON) + part('w-twinkle', star(50, 14, 1), 'transform-origin:78% 22%') + part('w-twinkle b', star(43, 27, 0.7), 'transform-origin:67% 42%'),
  'partly-day':
    '<span class="w-peek">' +
    part('w-spin', `<g transform="${SMALL_SUN}">${RAYS}</g>`, 'transform-origin:60.9% 27.2%') +
    part('', `<g transform="${SMALL_SUN}">${DISC}</g>`) +
    '</span>' +
    part('w-float', cloud()),
  'partly-night': part('w-rock', `<g transform="${SMALL_MOON}">${MOON}</g>`, 'transform-origin:62% 30%') + part('w-float', cloud()),
  cloudy: part('w-float b', cloud('#DDE6F1', '#BCCADB', 'translate(18 -9) scale(.72)')) + part('w-float', cloud()),
  fog: part('w-float', cloud('#FFFFFF', '#CFDBEA', 'translate(0 -10)')) + fogLine(12, 45, 40, 'w-slosh') + fogLine(19, 54, 30, 'w-slosh b'),
  rain2: drops([24, 40]) + part('w-bob', cloud()),
  rain3: drops([20, 32, 44]) + part('w-bob', cloud()),
  rain4: drops([16, 27, 38, 49]) + part('w-bob', cloud('#E4EBF4', '#BFCDDE')),
  storm:
    drops([17, 47]) +
    part('w-shake', cloud('#7B8AA3', '#5B6980')) +
    part('w-bolt', `<path d="M36 33 24 50H32L28 63 45 44H36L41 33Z" fill="#FFC233" ${LINE}/>`),
  // Alert types
  flood:
    part('w-slosh', `<path d="M4 30q7-7 14 0t14 0 14 0 14 0v22a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#8FC2F5" ${LINE}/>`) +
    part('w-slosh b', `<path d="M4 41q7 7 14 0t14 0 14 0 14 0v11a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#3E8BE8" ${LINE}/>`),
  closure:
    part(
      '',
      `<circle cx="20" cy="15" r="5.4" fill="#7A2E22" ${LINE}/><circle cx="44" cy="15" r="5.4" fill="#7A2E22" ${LINE}/>` +
        `<rect x="13" y="34" width="7" height="20" rx="1.6" fill="#9AA7B8" ${LINE}/><rect x="44" y="34" width="7" height="20" rx="1.6" fill="#9AA7B8" ${LINE}/>` +
        `<rect x="9" y="53" width="15" height="4.6" rx="2" fill="#9AA7B8" ${LINE}/><rect x="40" y="53" width="15" height="4.6" rx="2" fill="#9AA7B8" ${LINE}/>` +
        '<rect x="6" y="20" width="52" height="16" rx="3" fill="#FFC233"/><path d="M17 21.2h7l-7.4 13.6h-7Zm15 0h7l-7.4 13.6h-7Zm15 0h7l-7.4 13.6h-7Z" fill="#C8102E"/>' +
        `<rect x="6" y="20" width="52" height="16" rx="3" fill="none" ${LINE}/>`,
    ) +
    part('w-blink', '<circle cx="20" cy="15" r="4.2" fill="#FF6B4A"/>') +
    part('w-blink b', '<circle cx="44" cy="15" r="4.2" fill="#FF6B4A"/>'),
  traffic:
    part(
      'w-bob',
      '<path d="M7 44c0-4 3-6.5 7-7l6-1 7-10c1.2-1.7 3-2.5 5-2.5h11c2.6 0 4.8 1.3 6 3.6l4.2 8.4c5 1 8.8 3.4 8.8 8V47c0 1.7-1.3 3-3 3H10c-1.7 0-3-1.3-3-3Z" fill="#FFC233"/>' +
        '<path d="M7.2 44.6H62V47c0 1.7-1.3 3-3 3H10c-1.7 0-3-1.3-3-3Z" fill="#F5A300"/>' +
        '<path d="M24.5 35.5l4.6-6.6c.7-1 1.8-1.6 3-1.6H37v8.2ZM40 27.3h3c1.5 0 2.9.8 3.6 2.2l3 6H40Z" fill="#1F2A3A"/>' +
        '<circle cx="10.6" cy="41" r="1.9" fill="#FFF3C4"/>' +
        `<path d="M7 44c0-4 3-6.5 7-7l6-1 7-10c1.2-1.7 3-2.5 5-2.5h11c2.6 0 4.8 1.3 6 3.6l4.2 8.4c5 1 8.8 3.4 8.8 8V47c0 1.7-1.3 3-3 3H10c-1.7 0-3-1.3-3-3Z" fill="none" ${LINE}/>`,
    ) +
    carWheel(20, 50) +
    carWheel(47, 50),
  power:
    part(
      '',
      `<rect x="23" y="6" width="5" height="14" rx="2" fill="${INK}"/><rect x="36" y="6" width="5" height="14" rx="2" fill="${INK}"/>` +
        `<path d="M32 44v6c0 5 3 8 8 8h10" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
        '<path d="M16 19h32v8c0 10-7 17-16 17s-16-7-16-17Z" fill="#C9D3DF"/><path d="M16 19h27v8c0 9-5.6 15.4-13 16.8C22 42.4 16 35.8 16 27Z" fill="#EEF3F8"/>' +
        `<path d="M16 19h32v8c0 10-7 17-16 17s-16-7-16-17Z" fill="none" ${LINE}/>`,
    ) + part('w-blink', `<path d="M54 2 47 14h5l-3 9 10-12h-5l3-9Z" fill="#FFC233" ${LINE}/>`),
  water: hop(
    part(
      '',
      `<path d="${WATER}" fill="#2F6FC0"/><path d="M31 12.6C38 22.4 44.6 29.6 44.6 37.6A14 14 0 1 1 17.4 37C17.4 28.8 24.4 21.8 31 12.6Z" fill="#3E8BE8"/>` +
        `<path d="M23 38c0 4 2.4 7 6 8" fill="none" stroke="#BFE0FF" stroke-width="2.6" stroke-linecap="round"/><path d="${WATER}" fill="none" ${LINE}/>`,
    ),
  ),
  typhoon: part(
    'w-spin two',
    `<g fill="#5B7FB5" ${LINE}><path d="M32 19C38 11 48 7 58 9 50 11 46 18 45 27Z"/><path transform="rotate(180 32 32)" d="M32 19C38 11 48 7 58 9 50 11 46 18 45 27Z"/><circle cx="32" cy="32" r="14"/></g>` +
      `<circle cx="32" cy="32" r="5" fill="#FFFFFF" ${LINE}/>`,
  ),
  class: hop(
    part(
      '',
      `<path d="M25 16v-3a7 7 0 0 1 14 0v3" fill="none" stroke="${INK}" stroke-width="3"/><rect x="14" y="15" width="36" height="39" rx="11" fill="#1E5AA8"/>` +
        `<rect x="14" y="15" width="32" height="36" rx="11" fill="#2F7BE0"/><path d="M21 26h22" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<rect x="21" y="33" width="22" height="14" rx="5" fill="#FFC233" ${LINE}/><rect x="14" y="15" width="36" height="39" rx="11" fill="none" ${LINE}/>`,
    ),
  ),
  clock:
    part(
      '',
      `<circle cx="32" cy="32" r="24" fill="#CFDBEA"/><circle cx="30.6" cy="30.4" r="21.6" fill="#FFFFFF"/>` +
        `<path d="M32 13v4M32 47v4M13 32h4M47 32h4" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M32 32 24 26" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><circle cx="32" cy="32" r="24" fill="none" ${LINE}/>`,
    ) +
    part('w-spin two', '<path d="M32 32V15" stroke="#C8102E" stroke-width="3" stroke-linecap="round"/>') +
    part('', `<circle cx="32" cy="32" r="3" fill="${INK}"/>`),
} as const;

export type LiveKind = keyof typeof LIVE_ART;
