import { useId, type ReactNode, type Ref } from 'react';
import { Expander } from '@/components/Expander';
import { Icon } from '@/components/icons/Icon';
import { LiveIcon } from '@/components/LiveIcon';
import { SeverityBadge } from '@/components/ui/Tag';
import { alertKind } from '@/lib/weatherKind';
import type { Alert, AlertSource, AlertType, Severity } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { ago, formatShortDate, formatTime } from '@/utils/format';

export const ALERT_TYPE: Record<AlertType, string> = {
  advisory: 'Class advisory',
  weather: 'Weather',
  flood: 'Flood',
  closure: 'Road closure',
  traffic: 'Traffic',
  power: 'Power interruption',
  water: 'Water interruption',
};

const SEVERITY: Record<Severity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

const SOURCE: Record<AlertSource, string> = {
  tomtom: 'TomTom',
  weatherapi: 'WeatherAPI',
  facebook: 'Facebook',
  sunstar: 'SunStar',
  cebudailynews: 'Cebu Daily News',
  gnews: 'GNews',
  manual: 'SugboNow',
};

function alertWhen(alert: Alert, now: number): string {
  if (alert.status === 'upcoming' && alert.startsAt) return `Starts ${formatShortDate(alert.startsAt)}, ${formatTime(alert.startsAt)}`;
  const since = ago(alert.startsAt ?? alert.createdAt, now);
  return alert.endsAt ? `Since ${since}, until ${formatShortDate(alert.endsAt)}, ${formatTime(alert.endsAt)}` : `Since ${since}`;
}

/** An alert's details: what, where, when, from whom and the nearby places. They open in place, never in a modal. */
export function AlertDetails({ alert, now = Date.now() }: { alert: Alert; now?: number }) {
  const near = alert.nearPlaces ?? [];
  return (
    <div className="alert-details">
      {alert.summary && <p>{alert.summary}</p>}
      <dl className="alert-facts">
        <div>
          <dt>Type</dt>
          <dd>{ALERT_TYPE[alert.type]}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>{SEVERITY[alert.severity]}</dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{alert.areaName ?? 'All of Metro Cebu'}</dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>{alertWhen(alert, now)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{SOURCE[alert.source]}</dd>
        </div>
        {near.length > 0 && (
          <div>
            <dt>Near</dt>
            <dd className="tabular-nums">{near.map((p) => `${p.label}, ${p.distanceKm} km`).join(' · ')}</dd>
          </div>
        )}
      </dl>
      {alert.sourceUrl && (
        <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="out-link">
          Read on {SOURCE[alert.source]}
          <Icon name="arrow-up-right" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

interface AlertRowProps {
  alert: Alert;
  /** The line under the title: a distance, or "Adds about 9 min". */
  detail: ReactNode;
  /** Its place in the card's entrance (rows enter 50 ms apart). */
  j?: number;
  /** Makes the row a button: the map and the list stay in sync through it. */
  onSelect?: () => void;
  selected?: boolean;
  /** False when the details open somewhere else, like a phone's bottom sheet. */
  expands?: boolean;
  ref?: Ref<HTMLLIElement>;
}

/** An alert: its live icon, title, one line of detail and severity chip. */
export function AlertRow({ alert, detail, j = 0, onSelect, selected = false, expands = true, ref }: AlertRowProps) {
  const panel = useId();
  const body = (
    <>
      <span className="row-ico">
        <LiveIcon kind={alertKind(alert)} />
      </span>
      <span className="row-main">
        <b>{alert.title}</b>
        <span className="muted small">{detail}</span>
      </span>
      <SeverityBadge severity={alert.severity} className="e-pop" />
    </>
  );

  if (!onSelect) {
    return (
      <li ref={ref} className="row e-row" style={vars({ '--j': j })}>
        {body}
      </li>
    );
  }
  return (
    <li ref={ref} className={cx('row-pick e-row', selected && 'is-on')} style={vars({ '--j': j })}>
      <button type="button" className="row row-btn" aria-expanded={expands ? selected : undefined} aria-controls={expands ? panel : undefined} aria-pressed={expands ? undefined : selected} onClick={onSelect}>
        {body}
      </button>
      {expands && (
        <Expander open={selected} id={panel}>
          <AlertDetails alert={alert} />
        </Expander>
      )}
    </li>
  );
}
