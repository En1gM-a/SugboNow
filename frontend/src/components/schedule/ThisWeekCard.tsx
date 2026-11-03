import { Card, timing } from '@/components/today/Card';
import { useCountUp } from '@/hooks/useCountUp';
import { THIS_WEEK } from '@/lib/mockOnly';
import { vars } from '@/utils/cx';

const FULL = 2 * Math.PI * 40;

/** This week (Today, item 7): a ring of trips on time. Mock for now: the backend doesn't track it yet. */
export function ThisWeekCard({ i }: { i: number }) {
  const t = timing(i);
  const onTime = useCountUp(THIS_WEEK.onTime, t.count);
  const rest = FULL * (1 - THIS_WEEK.onTime / THIS_WEEK.total);

  return (
    <Card i={i} span="span-3" className="week" labelledBy="week-h">
      <h2 id="week-h" className="card-title">
        This week
      </h2>
      <div className="ring-wrap">
        <svg className="week-ring" viewBox="0 0 100 100" role="img" aria-label={`${THIS_WEEK.onTime} of ${THIS_WEEK.total} trips on time`}>
          <circle cx="50" cy="50" r="40" className="ring-track" />
          <circle
            cx="50"
            cy="50"
            r="40"
            className="ring-fill e-ring"
            strokeDasharray={FULL}
            strokeDashoffset={rest}
            transform="rotate(-90 50 50)"
            style={vars({ '--ring-full': FULL, '--ring-to': rest })}
          />
          <text x="50" y="57" textAnchor="middle" className="ring-text">
            <tspan>{Math.round(onTime)}</tspan>/{THIS_WEEK.total}
          </text>
        </svg>
        <p className="small">
          <b className="week-b">Trips on time</b>
          <span className="muted">{THIS_WEEK.note}</span>
        </p>
      </div>
    </Card>
  );
}
