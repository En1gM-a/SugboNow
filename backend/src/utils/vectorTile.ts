// Reads Mapbox Vector Tiles (protobuf, spec v2.1), as TomTom serves its traffic
// flow tiles: each layer's line features with their properties. Points stay in
// tile units (0..extent, y down); callers turn them into coordinates.
// shortcut: lines only, no polygons or points; use @mapbox/vector-tile if we ever need those.

export type TileValue = string | number | boolean;

export interface TileFeature {
  properties: Record<string, TileValue>;
  lines: Array<Array<[number, number]>>;
}

export interface TileLayer {
  name: string;
  extent: number;
  features: TileFeature[];
}

const LINESTRING = 2;
const MOVE_TO = 1;
const LINE_TO = 2;

class Reader {
  constructor(
    private readonly bytes: Uint8Array,
    public pos = 0,
    readonly end = bytes.length,
  ) {}

  more(): boolean {
    return this.pos < this.end;
  }

  varint(): number {
    let result = 0;
    for (let shift = 0; ; shift += 7) {
      if (this.pos >= this.end) throw new Error("Vector tile is cut short");
      const byte = this.bytes[this.pos++];
      result += (byte & 0x7f) * 2 ** shift;
      if (byte < 0x80) return result;
    }
  }

  // A field's number and wire type.
  header(): [number, number] {
    const tag = this.varint();
    return [Math.floor(tag / 8), tag & 7];
  }

  // A length-delimited field as its own reader, moving past it.
  sub(): Reader {
    const length = this.varint();
    const end = this.pos + length;
    if (end > this.end) throw new Error("Vector tile is cut short");
    const reader = new Reader(this.bytes, this.pos, end);
    this.pos = end;
    return reader;
  }

  string(): string {
    const field = this.sub();
    return new TextDecoder().decode(this.bytes.subarray(field.pos, field.end));
  }

  // A repeated varint field, packed (wire type 2) or one value at a time.
  varints(wireType: number): number[] {
    if (wireType !== 2) return [this.varint()];
    const field = this.sub();
    const values: number[] = [];
    while (field.more()) values.push(field.varint());
    return values;
  }

  fixed(size: 4 | 8): number {
    if (this.pos + size > this.end) throw new Error("Vector tile is cut short");
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.pos, size);
    this.pos += size;
    return size === 8 ? view.getFloat64(0, true) : view.getFloat32(0, true);
  }

  skip(wireType: number): void {
    if (wireType === 0) this.varint();
    else if (wireType === 1) this.pos += 8;
    else if (wireType === 2) this.sub();
    else if (wireType === 5) this.pos += 4;
    else throw new Error(`Vector tile has an unknown wire type ${wireType}`);
  }
}

const zigzag = (n: number) => (n % 2 === 1 ? -(n + 1) / 2 : n / 2);

function readValue(reader: Reader): TileValue {
  let value: TileValue = "";
  while (reader.more()) {
    const [field, wireType] = reader.header();
    if (field === 1) value = reader.string();
    else if (field === 2) value = reader.fixed(4);
    else if (field === 3) value = reader.fixed(8);
    else if (field === 4 || field === 5) value = reader.varint();
    else if (field === 6) value = zigzag(reader.varint());
    else if (field === 7) value = reader.varint() !== 0;
    else reader.skip(wireType);
  }
  return value;
}

// Geometry commands (spec 4.3): MoveTo starts a line, LineTo extends it, and every
// point is a zigzag-encoded step from the one before.
function readLines(commands: number[]): Array<Array<[number, number]>> {
  const lines: Array<Array<[number, number]>> = [];
  let x = 0;
  let y = 0;
  let i = 0;
  while (i < commands.length) {
    const command = commands[i] & 7;
    const count = Math.floor(commands[i++] / 8);
    if (command !== MOVE_TO && command !== LINE_TO) continue; // ClosePath: polygons only
    for (let k = 0; k < count && i + 1 < commands.length; k++) {
      x += zigzag(commands[i++]);
      y += zigzag(commands[i++]);
      if (command === MOVE_TO) lines.push([[x, y]]);
      else lines[lines.length - 1]?.push([x, y]);
    }
  }
  return lines;
}

function readLayer(reader: Reader): TileLayer {
  let name = "";
  let extent = 4096;
  const keys: string[] = [];
  const values: TileValue[] = [];
  const raw: Array<{ type: number; tags: number[]; geometry: number[] }> = [];
  while (reader.more()) {
    const [field, wireType] = reader.header();
    if (field === 1) name = reader.string();
    else if (field === 2) {
      const feature = { type: 0, tags: [] as number[], geometry: [] as number[] };
      const body = reader.sub();
      while (body.more()) {
        const [featureField, featureWireType] = body.header();
        if (featureField === 2) feature.tags.push(...body.varints(featureWireType));
        else if (featureField === 3) feature.type = body.varint();
        else if (featureField === 4) feature.geometry.push(...body.varints(featureWireType));
        else body.skip(featureWireType);
      }
      raw.push(feature);
    } else if (field === 3) keys.push(reader.string());
    else if (field === 4) values.push(readValue(reader.sub()));
    else if (field === 5) extent = reader.varint();
    else reader.skip(wireType);
  }
  // Tags point into the layer's keys and values, which can come after the features.
  const features = raw
    .filter((feature) => feature.type === LINESTRING)
    .map((feature) => {
      const properties: Record<string, TileValue> = {};
      for (let t = 0; t + 1 < feature.tags.length; t += 2) {
        const key = keys[feature.tags[t]];
        const value = values[feature.tags[t + 1]];
        if (key !== undefined && value !== undefined) properties[key] = value;
      }
      return { properties, lines: readLines(feature.geometry) };
    });
  return { name, extent, features };
}

export function readVectorTile(bytes: Uint8Array): TileLayer[] {
  const tile = new Reader(bytes);
  const layers: TileLayer[] = [];
  while (tile.more()) {
    const [field, wireType] = tile.header();
    if (field === 3) layers.push(readLayer(tile.sub()));
    else tile.skip(wireType);
  }
  return layers;
}
