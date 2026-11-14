import { describe, expect, it, vi } from 'vitest';
import { flowLevel, flowTileToLines, METRO_CEBU_BBOX, tilePoint, tilesFor } from '../src/integrations/tomtom.js';
import { colorRoute, createTrafficFlowService } from '../src/services/trafficFlow.service.js';
import type { TrafficFlowLines, TrafficFlowRow } from '../src/types/index.js';
import { readVectorTile } from '../src/utils/vectorTile.js';

// A tiny protobuf writer, to build tiles the way TomTom sends them.
const varint = (n: number): number[] => {
  const out: number[] = [];
  while (n >= 0x80) {
    out.push((n % 0x80) | 0x80);
    n = Math.floor(n / 0x80);
  }
  out.push(n);
  return out;
};
const field = (number: number, wireType: number, payload: number[]) => [...varint(number * 8 + wireType), ...payload];
const message = (number: number, payload: number[]) => field(number, 2, [...varint(payload.length), ...payload]);
const text = (number: number, value: string) => message(number, [...new TextEncoder().encode(value)]);
const packed = (number: number, values: number[]) => message(number, values.flatMap(varint));
const double = (value: number) => {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, true);
  return field(3, 1, [...bytes]);
};

// The spec's own example line (Mapbox Vector Tile 2.1, 4.3.5): (2,2) → (2,10) → (10,10).
const SPEC_LINE = [9, 4, 4, 18, 0, 16, 16, 0];

function flowTile(tags: number[]): Uint8Array {
  const feature = [...packed(2, tags), ...field(3, 0, [2]), ...packed(4, SPEC_LINE)];
  // Keys and values after the feature, which encoders are free to do.
  const layer = [
    ...field(15, 0, [2]),
    ...text(1, 'Traffic flow'),
    ...message(2, feature),
    ...text(3, 'traffic_level'),
    ...text(3, 'road_closure'),
    ...message(4, double(0.3)),
    ...message(4, field(7, 0, [1])),
    ...field(5, 0, varint(4096)),
  ];
  return new Uint8Array(message(3, layer));
}

describe('vector tiles', () => {
  it('reads a layer with its lines and properties', () => {
    const [layer] = readVectorTile(flowTile([0, 0, 1, 1]));
    expect(layer.name).toBe('Traffic flow');
    expect(layer.extent).toBe(4096);
    expect(layer.features).toEqual([
      {
        properties: { traffic_level: 0.3, road_closure: true },
        lines: [
          [
            [2, 2],
            [2, 10],
            [10, 10],
          ],
        ],
      },
    ]);
  });

  it('rejects a tile that is cut short', () => {
    expect(() => readVectorTile(flowTile([0, 0]).slice(0, 20))).toThrow('Vector tile is cut short');
  });
});

describe('TomTom traffic flow', () => {
  it('covers Metro Cebu with 49 tiles at zoom 13', () => {
    const tiles = tilesFor(METRO_CEBU_BBOX, 13);
    expect(tiles).toHaveLength(49);
    expect(new Set(tiles.map((tile) => `${tile.x},${tile.y}`)).size).toBe(49);
  });

  it('places a point inside the tile it falls in', () => {
    const [tile] = tilesFor('123.8854,10.3157,123.8854,10.3157', 13);
    const [top, left] = tilePoint(tile, 0, 0, 4096);
    const [bottom, right] = tilePoint(tile, 4096, 4096, 4096);
    expect(top).toBeGreaterThan(10.3157);
    expect(bottom).toBeLessThan(10.3157);
    expect(left).toBeLessThan(123.8854);
    expect(right).toBeGreaterThan(123.8854);
  });

  it('grades speed against free flow: heavy under 40%, medium under 75%, and closed roads heavy', () => {
    expect([0.2, 0.39, 0.4, 0.74, 0.75, 1].map((level) => flowLevel(level, false))).toEqual(['heavy', 'heavy', 'medium', 'medium', 'free', 'free']);
    expect(flowLevel(1, true)).toBe('heavy');
  });

  it('turns a flow tile into lines with levels, and leaves out roads with no speed', () => {
    const tile = { z: 13, x: 6915, y: 3859 };
    expect(flowTileToLines(flowTile([0, 0]), tile)).toEqual([
      { level: 'heavy', line: [tilePoint(tile, 2, 2, 4096), tilePoint(tile, 2, 10, 4096), tilePoint(tile, 10, 10, 4096)] },
    ]);
    expect(flowTileToLines(flowTile([]), tile)).toEqual([]);
  });
});

describe('route colors', () => {
  // An east–west road at 10.3°N. Eastbound it's heavy on the west half and free on
  // the east half; westbound it's medium all along.
  const flow: TrafficFlowLines = {
    heavy: [
      [
        [10.3, 123.88],
        [10.3, 123.89],
      ],
    ],
    free: [
      [
        [10.3, 123.89],
        [10.3, 123.9],
      ],
    ],
    medium: [
      [
        [10.3, 123.9],
        [10.3, 123.88],
      ],
    ],
  };

  it('colors each stretch by the road under it, the way the route goes', () => {
    const east = colorRoute(
      [
        [10.3, 123.88],
        [10.3, 123.9],
      ],
      flow,
    );
    expect(east.map((stretch) => stretch.level)).toEqual(['heavy', 'free']);
    expect(east[0].line[0]).toEqual([10.3, 123.88]);
    expect(east[1].line[0]).toEqual(east[0].line[east[0].line.length - 1]);
    expect(east[1].line[east[1].line.length - 1]).toEqual([10.3, 123.9]);

    const west = colorRoute(
      [
        [10.3, 123.9],
        [10.3, 123.88],
      ],
      flow,
    );
    expect(west.map((stretch) => stretch.level)).toEqual(['medium']);
  });

  it('leaves a stretch uncolored when no road with a speed runs along it', () => {
    // 220 m north of the road, and a cross street over it.
    const north = colorRoute(
      [
        [10.302, 123.88],
        [10.302, 123.885],
      ],
      flow,
    );
    const across = colorRoute(
      [
        [10.299, 123.885],
        [10.301, 123.885],
      ],
      flow,
    );
    expect(north.map((stretch) => stretch.level)).toEqual([null]);
    expect(across.map((stretch) => stretch.level)).toEqual([null]);
  });

  it('only shows flow from the last 45 minutes', async () => {
    const row: TrafficFlowRow = { area: 'metro_cebu', lines: flow, fetched_at: '2026-11-12T00:00:00Z' };
    const at = (iso: string) => createTrafficFlowService({ get: vi.fn(async () => row) }, () => new Date(iso)).current();
    expect(await at('2026-11-12T00:45:00Z')).toBe(row);
    expect(await at('2026-11-12T00:46:00Z')).toBeNull();
  });
});

describe('the flow kept between requests', () => {
  const first: TrafficFlowRow = { area: 'metro_cebu', lines: { heavy: [], medium: [], free: [] }, fetched_at: '2026-11-12T00:00:00Z' };
  const second: TrafficFlowRow = { ...first, fetched_at: '2026-11-12T00:15:00Z' };

  // A database holding `saved`: like the real one, it answers null to a caller
  // that already holds the flow saved.
  function setup() {
    const state = { saved: first as TrafficFlowRow | null, at: Date.parse('2026-11-12T00:01:00Z') };
    const get = vi.fn(async (heldFetchedAt?: string) => (state.saved && state.saved.fetched_at !== heldFetchedAt ? state.saved : null));
    return { state, get, service: createTrafficFlowService({ get }, () => new Date(state.at)) };
  }

  it('serves the flow it holds for 30 seconds without asking the database', async () => {
    const { state, get, service } = setup();
    expect(await service.current()).toBe(first);
    state.at += 29_000;
    expect(await service.current()).toBe(first);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('then asks only for a newer flow, and keeps the one it holds when there is none', async () => {
    const { state, get, service } = setup();
    await service.current();
    state.at += 30_000;
    expect(await service.current()).toBe(first);
    expect(get).toHaveBeenLastCalledWith(first.fetched_at);

    state.saved = second;
    state.at += 30_000;
    expect(await service.current()).toBe(second);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('shares one read between requests that arrive together', async () => {
    const { get, service } = setup();
    const [map, route] = await Promise.all([service.current(), service.current()]);
    expect(map).toBe(first);
    expect(route).toBe(first);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('asks again after a failed read, and when nothing is saved yet', async () => {
    const { state, get, service } = setup();
    get.mockRejectedValueOnce(new Error('db down'));
    await expect(service.current()).rejects.toThrow('db down');
    expect(await service.current()).toBe(first);

    const empty = setup();
    empty.state.saved = null;
    expect(await empty.service.current()).toBeNull();
    empty.state.saved = first;
    empty.state.at += 30_000;
    expect(await empty.service.current()).toBe(first);
    expect(state.saved).toBe(first);
  });

  it('still stops showing a held flow once it is 45 minutes old', async () => {
    const { state, service } = setup();
    expect(await service.current()).toBe(first);
    state.at = Date.parse('2026-11-12T00:46:00Z');
    expect(await service.current()).toBeNull();
  });
});
