// "Leave by 6:50 AM": the leave time is the largest thing in the block; the trip, route and delay follow,
// and the reasons stay behind a disclosure. Unboxed: it sits inside a card, separated by dividers.

import { useId, useState } from 'react';
import type { LeaveTime } from '@/types/api';
import { cx } from '@/utils/cx';
import { formatClock, minutesLabel } from '@/utils/format';
import { SeverityBadge } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { LiveValue } from '../ui/LiveValue';

export function LeaveTimeSummary({ lt, now = Date.now() }: { lt: LeaveTime; now?: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const minsLeft = Math.round((new Date(lt.leaveAtIso).getTime() - now) / 60_000);
  const delayed = lt.delayMinutes > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="font-heading text-[28px] leading-tight font-bold tracking-tight text-ink">
          <span className="text-base font-semibold text-muted">Leave by </span>
          <LiveValue value={formatClock(lt.leaveAt)} />
        </p>
        {minsLeft > 0 && minsLeft < 180 ? (
          <span className={cx('mt-1 inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', minsLeft <= 15 ? 'bg-status-high text-on-status' : 'bg-selected text-on-selected')}>
            in {minutesLabel(minsLeft)}
          </span>
        ) : minsLeft <= 0 && minsLeft > -120 ? (
          <span className="mt-1 inline-flex shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-ink">Time to go</span>
        ) : null}
      </div>
      <p className="mt-0.5 text-sm text-ink">
        <strong>{lt.title}</strong> · {lt.origin.label} <Icon name="arrowRight" size={14} label="to" className="mx-0.5 inline align-[-2px]" /> {lt.destination.label} · arrive {formatClock(lt.arriveBy)}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted tabular-nums">
        <span>{lt.distanceKm} km</span>
        <span aria-hidden="true">·</span>
        <span>~{minutesLabel(lt.baseMinutes)} usually</span>
        {delayed && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-semibold text-status-medium">
              <Icon name="clock" size={14} />+{lt.delayMinutes} min delay
            </span>
          </>
        )}
      </p>

      {delayed && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark"
          >
            {open ? 'Hide' : 'Why'} the extra time?
            <Icon name="chevronDown" size={16} className={cx('transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} />
          </button>
          {/* Small content only: the grid-rows trick animates to auto height without measuring. */}
          <div id={panelId} inert={!open} className={cx('grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
            <ul className="space-y-2 overflow-hidden">
              {lt.reasons.map((r) => (
                <li key={r.alertId} className="flex items-start gap-2 text-sm">
                  <SeverityBadge severity={r.severity} />
                  <span className="flex-1 text-ink">
                    {r.title} <span className="text-muted">near your {r.nearPlace}</span>
                  </span>
                  <span className="font-semibold text-ink tabular-nums">+{r.minutes} min</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
