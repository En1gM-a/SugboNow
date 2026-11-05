import type { IconName } from '@/components/icons/Icon';
import type { LocationKind } from '@/types/api';

export const KIND_META: Record<LocationKind, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'house' },
  school: { label: 'School', icon: 'graduation-cap' },
  work: { label: 'Work', icon: 'briefcase' },
  other: { label: 'Other', icon: 'map-pin' },
};

export const KINDS = Object.keys(KIND_META) as LocationKind[];

/** Where a pin starts when nothing better is known: Cebu City. */
export const CEBU_CENTER = { lat: 10.3157, lng: 123.8854 };
