// Unread alerts for the bell (handoff <icons>): alerts near the user's places (GET /api/alerts?relevant=true)
// whose ids aren't in the seen list, which is saved in localStorage.

import { useCallback, useState } from 'react';
import { useAlerts } from './useFeeds';

const SEEN_KEY = 'sn-seen-alerts';

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-300)));
  } catch {
    // Private mode: the list lasts until the page reloads.
  }
}

export function useUnreadAlerts() {
  const alerts = useAlerts({ relevant: true });
  const [seen, setSeen] = useState(readSeen);
  const list = alerts.data;
  const count = list ? list.filter((a) => !seen.has(a.id)).length : 0;

  const markAllSeen = useCallback(() => {
    if (!list) return;
    const next = new Set(seen);
    list.forEach((a) => next.add(a.id));
    writeSeen(next);
    setSeen(next);
  }, [list, seen]);

  return { count, loaded: alerts.isSuccess, markAllSeen };
}
