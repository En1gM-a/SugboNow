/** Types for stage.js, which stays plain JavaScript like the diorama kit it is built on. */
export interface Stage {
  /** Shows the happening's diorama; false when that happening has none. */
  show(id: string): boolean;
  setPlaying(on: boolean): void;
  dispose(): void;
}

export function mountStage(el: HTMLElement): Stage | null;
