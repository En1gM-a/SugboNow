import { useEffect, useRef } from 'react';
import { mountStage, type Stage } from '@/lib/landing/diorama/stage';

interface SceneDioramaProps {
  /** The happening's id in data.ts. */
  id: string;
  play: boolean;
}

/** Sample, not for merging: a live miniature of the happening, in the open space above its copy. */
export default function SceneDiorama({ id, play }: SceneDioramaProps) {
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  useEffect(() => {
    const made = box.current ? mountStage(box.current) : null;
    stage.current = made;
    return () => {
      made?.dispose();
      stage.current = null;
    };
  }, []);

  // Without WebGL nothing turns on, and the happening keeps its drawing.
  useEffect(() => {
    if (stage.current?.show(id)) box.current?.setAttribute('data-on', '');
  }, [id]);

  useEffect(() => stage.current?.setPlaying(play), [play]);

  return <div ref={box} className="lp-dio" aria-hidden="true" />;
}
