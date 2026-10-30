// Original abstract "ribbon" artwork used as mock news/post images, so mock mode never
// loads images from outside sites. Returns an SVG data URL.

const PALETTES = [
  ['#0E7490', '#14213D', '#F5A623'],
  ['#C8102E', '#F5A623', '#FFF8EC'],
  ['#15803D', '#0E7490', '#FDF0D5'],
  ['#14213D', '#C8102E', '#F5A623'],
  ['#B45309', '#F5A623', '#14213D'],
  ['#475569', '#0E7490', '#E0F2F6'],
];

export function ribbonArt(seed: number, label = ''): string {
  const [a, b, c] = PALETTES[seed % PALETTES.length];
  const y1 = 40 + ((seed * 37) % 80);
  const y2 = 120 + ((seed * 53) % 70);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
<rect width="400" height="225" fill="${a}"/>
<path d="M-20 ${y1} C 90 ${y1 - 60}, 210 ${y1 + 90}, 420 ${y1 - 10} L420 ${y1 + 34} C 220 ${y1 + 120}, 100 ${y1 - 20}, -20 ${y1 + 40} Z" fill="${b}" opacity="0.9"/>
<path d="M-20 ${y2} C 120 ${y2 - 40}, 260 ${y2 + 50}, 420 ${y2 - 30} L420 ${y2 - 8} C 260 ${y2 + 70}, 120 ${y2 - 18}, -20 ${y2 + 18} Z" fill="${c}" opacity="0.85"/>
<circle cx="${320 - (seed % 5) * 30}" cy="${50 + (seed % 3) * 20}" r="18" fill="${c}" opacity="0.5"/>
${label ? `<text x="20" y="205" font-family="Poppins, sans-serif" font-weight="700" font-size="22" fill="#FFFFFF" opacity="0.92">${label}</text>` : ''}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
