import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { useUnreadAlerts } from '@/hooks/useUnreadAlerts';
import { getDisplay } from '@/lib/display';

const RING = [0, 18, -16, 11, -8, 4, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));

// Rings once per sign-in for alerts that were already waiting.
const bell = { rangSinceSignIn: false };
export function resetBell() {
  bell.rangSinceSignIn = false;
}

/**
 * The bell (handoff <icons>): a control icon that stays still until a new alert arrives, then rings once. It rings
 * 1.1 s after sign-in if anything is unread, and whenever a refetch brings a new unread alert, never on a timer.
 * Tapping it opens /traffic and marks everything as seen.
 */
export function Bell() {
  const navigate = useNavigate();
  const { count, loaded, markAllSeen } = useUnreadAlerts();
  const icon = useRef<HTMLSpanElement>(null);
  const badge = useRef<HTMLElement>(null);
  const before = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!loaded) return;
    const ring = () => {
      if (getDisplay().still) return;
      icon.current?.animate(RING, { duration: 1000, easing: 'ease-in-out' });
      badge.current?.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
    };
    const prev = before.current;
    before.current = count;
    let timer: number | undefined;
    if (prev === null) {
      if (count > 0 && !bell.rangSinceSignIn) {
        timer = window.setTimeout(() => {
          bell.rangSinceSignIn = true;
          ring();
        }, 1100);
      }
    } else if (count > prev) {
      ring();
      const added = count - prev;
      setAnnouncement(added === 1 ? '1 new alert near your places' : `${added} new alerts near your places`);
    }
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        before.current = prev;
      }
    };
  }, [count, loaded]);

  return (
    <>
      <button
        type="button"
        className="btn btn-icon bell"
        aria-label={count ? `Alerts, ${count} new` : 'Alerts'}
        onClick={() => {
          markAllSeen();
          navigate('/traffic');
        }}
      >
        <span className="bell-i" ref={icon}>
          <Icon name="bell" />
        </span>
        {count > 0 && (
          <b className="badge tabular-nums" ref={badge} aria-hidden="true">
            {count}
          </b>
        )}
      </button>
      <span className="sr-only" role="status" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
