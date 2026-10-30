import type { LocationKind } from '@/types/api';

/** Fixed pin colors per kind of place, shared by the map pins and the list markers so they always match. */
export const KIND_HEX: Record<LocationKind, string> = { home: '#C8102E', school: '#0E7490', work: '#15803D', other: '#14213D' };
