import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createAlertsRepository } from '../src/services/alerts.repository.js';

// A stand-in for the Supabase client. Every filter returns the same query, and a
// read answers with rows `from`..`to` of what is saved, as the real API does.
function savedAlerts(count: number) {
  const saved = Array.from({ length: count }, (_, index) => ({ id: `alert-${index}` }));
  const reads: Array<[number, number]> = [];
  const query: Record<string, unknown> = {
    range(from: number, to: number) {
      reads.push([from, to]);
      return Promise.resolve({ data: saved.slice(from, to + 1), error: null });
    },
  };
  for (const filter of ['select', 'or', 'in', 'ilike', 'order']) query[filter] = () => query;
  return { db: { from: () => query } as unknown as SupabaseClient, saved, reads };
}

describe('alerts in effect', () => {
  const filter = { now: new Date('2026-11-14T10:34:00Z'), startsBefore: new Date('2026-11-16T10:34:00Z'), limit: 200 };

  it('returns every alert when more are in effect than one read asks for', async () => {
    // 217 were in effect at 6:34 PM on 2026-11-14, and only the newest 200 came back.
    const { db, saved, reads } = savedAlerts(217);
    expect(await createAlertsRepository(db).listActive(filter)).toEqual(saved);
    expect(reads).toEqual([
      [0, 199],
      [200, 399],
    ]);
  });

  it('reads once when that read comes back short', async () => {
    const { db, reads } = savedAlerts(183);
    expect(await createAlertsRepository(db).listActive(filter)).toHaveLength(183);
    expect(reads).toEqual([[0, 199]]);
  });
});
