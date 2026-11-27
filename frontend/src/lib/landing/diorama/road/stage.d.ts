/** Types for stage.js, which stays plain JavaScript like the rest of the dioramas. */
export interface RoadStage {
  /** Shows a happening by its place in ROAD_SCENES. While nothing is playing, that's its telling frame. */
  go(index: number): void;
  setPlaying(on: boolean): void;
  dispose(): void;
}

export interface RoadOptions {
  /** Fewer pixels and no shadows. */
  lite?: boolean;
  onScene?: (index: number) => void;
  /** How far through this happening it is, from 0 to 1, on every frame. */
  onProgress?: (part: number) => void;
}

/** Null when there is no WebGL. */
export function mountRoad(el: HTMLElement, options?: RoadOptions): Promise<RoadStage | null>;
