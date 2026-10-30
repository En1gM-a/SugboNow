import type { Alert } from '@/types/api';
import { cx } from '@/utils/cx';
import { formatAgo, formatShortDate, formatTime } from '@/utils/format';
import { ALERT_TYPE, KlaseChip, SeverityBadge } from '../ui/Card';
import { Icon } from '../ui/Icon';

const SOURCE_LABEL: Record<Alert['source'], string> = {
  tomtom: 'TomTom',
  weatherapi: 'WeatherAPI',
  facebook: 'Facebook',
  sunstar: 'SunStar',
  cebudailynews: 'Cebu Daily News',
  gnews: 'GNews',
  manual: 'Sugbo Now',
};

function when(a: Alert, now: number) {
  if (a.status === 'upcoming' && a.startsAt) {
    const start = new Date(a.startsAt);
    const sameDay = start.toDateString() === new Date(now).toDateString();
    return `Starts ${sameDay ? '' : `${formatShortDate(a.startsAt)}, `}${formatTime(a.startsAt)}`;
  }
  return formatAgo(a.createdAt, now);
}

/** One alert row: severity (icon + label), type, title, then where, when and how near. */
export function AlertItem({
  alert: a,
  now = Date.now(),
  compact,
  selected,
  onSelect,
}: {
  alert: Alert;
  now?: number;
  compact?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const type = ALERT_TYPE[a.type];
  const linkable = a.sourceUrl && (a.source === 'facebook' || a.source === 'sunstar' || a.source === 'cebudailynews' || a.source === 'gnews');
  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SeverityBadge severity={a.severity} />
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
          <Icon name={type.icon} size={14} />
          {type.label}
        </span>
        {a.type === 'advisory' && <KlaseChip />}
        {a.status === 'upcoming' && <span className="text-xs font-semibold text-mactan-sea-dark">Upcoming</span>}
      </div>
      <p className={cx('mt-1.5 font-semibold text-ink', compact ? 'line-clamp-2 text-[15px] leading-snug' : 'leading-snug')}>{a.title}</p>
      {!compact && a.summary && <p className="mt-1 line-clamp-2 max-w-[70ch] text-sm text-muted">{a.summary}</p>}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted tabular-nums">
        {a.areaName && (
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={12} />
            {a.areaName}
          </span>
        )}
        <span>{when(a, now)}</span>
        {a.nearPlaces?.[0] && (
          <span className="font-semibold text-ink">
            {a.nearPlaces[0].distanceKm} km from your {a.nearPlaces[0].label}
          </span>
        )}
        {!compact && <span>via {SOURCE_LABEL[a.source]}</span>}
      </p>
      {!compact && linkable && (
        <a
          href={a.sourceUrl!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark hover:underline"
        >
          Read on {SOURCE_LABEL[a.source]}
          <Icon name="external" size={14} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </div>
  );

  const shell = cx('flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left', a.severity === 'high' && 'candle-glow');
  if (onSelect)
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cx(shell, 'border transition-colors duration-150', selected ? 'border-mactan-sea bg-mactan-sea-soft/50' : 'border-transparent hover:bg-stone-50')}
      >
        {body}
      </button>
    );
  return <div className={shell}>{body}</div>;
}
