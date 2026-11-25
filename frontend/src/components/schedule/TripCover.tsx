import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { preloadRoute } from '@/lib/nav';

/**
 * Makes the whole trip card a link to that trip on Traffic. It covers the card, and the card's own buttons sit above it,
 * so nothing is a link inside a link.
 */
export function TripCover({ tripId, title }: { tripId: string; title: string }) {
  const preload = () => preloadRoute('/traffic');
  return (
    <Link
      to={`/traffic?trip=${encodeURIComponent(tripId)}`}
      className="card-cover"
      aria-label={`See ${title} on the traffic map`}
      onPointerEnter={preload}
      onFocus={preload}
      onTouchStart={preload}
    />
  );
}

/** The quiet sign that the card can be clicked. The cover already says it to screen readers. */
export function TripHint() {
  return (
    <span className="trip-hint" aria-hidden="true">
      See on map
      <Icon name="caret-right" />
    </span>
  );
}
