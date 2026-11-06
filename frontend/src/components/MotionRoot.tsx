import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { useDisplay } from '@/lib/display';
import { whenSettled } from '@/lib/idle';

const loadFeatures = () =>
  new Promise<void>((resolve) => {
    whenSettled(resolve);
  })
    .then(() => import('@/lib/motionFeatures'))
    .then((mod) => mod.default);

/**
 * Motion, loaded the light way (handoff <motion>): m components, with the domAnimation features fetched after the page
 * has appeared. Still mode turns every Motion animation off.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const { still } = useDisplay();
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={still ? 'always' : 'user'}>{children}</MotionConfig>
    </LazyMotion>
  );
}
