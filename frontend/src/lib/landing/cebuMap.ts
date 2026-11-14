/**
 * Sample, not for merging: Metro Cebu as simplified shapes for the landing background, in kilometres east (x) and
 * north (y) of Cebu City's center (10.3157, 123.8854), the center backend/src/config/areas.ts uses.
 * shortcut: the coastline, roads and bridges are hand-drawn and only roughly right; swap in OpenStreetMap's shapes
 * (and credit "© OpenStreetMap contributors") once its servers answer, they were at capacity on 2026-11-15.
 */
export type Pt = [number, number];

/** Land on the left of the line, as OpenStreetMap draws coastlines: Naga to Liloan, then closed far inland. */
export const MAINLAND: Pt[] = [
  [-16, -13.4], [-13.6, -12.3], [-11.6, -10.4], [-9.8, -8.7], [-7.6, -8.6], [-5.6, -8.7], [-3.6, -8.5], [-2.8, -7.6],
  [-2.4, -6.6], [-2.2, -6], [-1, -6.3], [0.6, -5.7], [1.4, -4.7], [1, -3.9], [1.9, -3.3], [2.4, -2.7], [2.9, -1.8],
  [3.5, -1.1], [4.3, -0.4], [5.3, 0.3], [5.9, 0.8], [6.3, 1.5], [6.5, 2.4], [6.8, 3.4], [7.4, 4.5], [8.6, 5.7],
  [9.7, 7], [11, 8.2], [12.6, 9.3], [14, 10.8], [15.5, 12.8], [17, 15], [12, 24], [-24, 12], [-24, -14],
];

/** Mactan Island, Lapu-Lapu and Cordova. */
export const MACTAN: Pt[] = [
  [7.2, 3], [7, 1.2], [6.75, 0], [6.45, -1.8], [5.9, -3.6], [5.5, -5.4], [5.8, -6.8], [7, -7.5], [8.6, -7.3],
  [10.4, -6.2], [12, -4.6], [13.2, -2.8], [14.3, -1], [15.6, 0.4], [16.2, 1.6], [15, 2.3], [13.2, 2.5], [11.4, 3.1],
  [9.6, 3.5], [8.4, 3.6],
];

/** A smooth line just inland of the coast, Naga to Liloan: the hills rise in steps behind it. */
export const HILL_BASE: Pt[] = [
  [-17, -12.2], [-12, -9.4], [-7, -7.4], [-3, -5.6], [0.2, -2.2], [3.6, 0.6], [6, 3.6], [8.6, 6.6], [12, 9.6], [16.5, 15],
];

/** Where the hills' highest step ends, far inland. */
export const FAR_INLAND: Pt[] = [[12, 24], [-24, 12], [-24, -14]];

/** From areas.ts: where each city or town is centered, so the model is built up around them. */
export const AREAS: Pt[] = [
  [0, 0], [4.04, 0.87], [7.01, -0.6], [-3.94, -7.85], [7.87, 6.73], [12.39, 9.25], [-9.77, -7.83], [-13.95, -11.76], [7.03, -7.02],
];

export const BRIDGES: Record<'osmena' | 'fernan' | 'cclex', [Pt, Pt]> = {
  osmena: [[5.6, 0.85], [7.2, 0.5]],
  fernan: [[6.1, 2.15], [7.5, 2.55]],
  cclex: [[0.2, -5.6], [6.1, -6.4]],
};

export const ROADS: Record<'bacalso' | 'fortuna' | 'osmenaBlvd', Pt[]> = {
  bacalso: [[1.3, -2.6], [0.2, -2.9], [-1, -3.1], [-2, -3.4], [-2.8, -3.8], [-3.6, -4.6], [-4.4, -5.6]],
  fortuna: [[1.4, 2.6], [2.4, 2.55], [3.4, 2.45], [4.4, 2.3], [5.2, 2.1]],
  osmenaBlvd: [[0.65, 0.2], [0.86, -0.53], [1.25, -1.35], [1.7, -2.2]],
};
