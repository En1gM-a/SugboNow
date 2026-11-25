// Makes a whole card on Today a link, with a quiet sign that it is one.

import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { preloadRoute } from '@/lib/nav';

/**
 * A link over the whole card. The card's own buttons sit above it, so nothing is a link inside a link. Put it last in
 * the card.
 */
export function CardCover({ to, label }: { to: string; label: string }) {
  const preload = () => preloadRoute(to.split('?')[0]);
  return (
    <Link
      to={to}
      className="card-cover"
      aria-label={label}
      onPointerEnter={preload}
      onFocus={preload}
      onTouchStart={preload}
    />
  );
}

/** The quiet sign that the card can be clicked. The cover already says it to screen readers. */
export function CardHint({ text }: { text: string }) {
  return (
    <span className="card-hint" aria-hidden="true">
      {text}
      <Icon name="caret-right" />
    </span>
  );
}
