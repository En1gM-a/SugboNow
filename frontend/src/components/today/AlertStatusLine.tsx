import type { UseQueryResult } from '@tanstack/react-query';
import { Icon } from '@/components/icons/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { getDisplay } from '@/lib/display';
import type { BriefTodayResponse } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { CardError } from './Card';

/**
 * The alert status line (Today, item 2): a slim glass strip that says whether anything serious is near the user's
 * places. Class advisories add a "Naay klase?" chip. Tapping it scrolls to "Near your places".
 */
export function AlertStatusLine({ i, brief }: { i: number; brief: UseQueryResult<BriefTodayResponse> }) {
  const className = 'card glass e-card span-12 status-line';
  if (brief.isPending) {
    return (
      <div className={className} style={vars({ '--i': i })}>
        <Skeleton className="skel-line w-56" />
      </div>
    );
  }
  if (brief.isError) {
    return (
      <div className={className} style={vars({ '--i': i })}>
        <CardError what="alerts near your places" onRetry={() => void brief.refetch()} />
      </div>
    );
  }

  const { alerts } = brief.data;
  const high = alerts.filter((a) => a.severity === 'high').length;
  const classAdvisory = alerts.some((a) => a.type === 'advisory');
  const jump = () =>
    document.getElementById('near-places')?.scrollIntoView({ behavior: getDisplay().still ? 'auto' : 'smooth', block: 'start' });

  return (
    <button type="button" className={cx(className, high > 0 && 'has-high')} style={vars({ '--i': i })} onClick={jump}>
      <span className="status-dot" aria-hidden="true" />
      <span className="status-text">
        {high > 0 ? `${high} high ${high === 1 ? 'alert' : 'alerts'} near you` : 'All clear near your places · Ingat sa dalan!'}
      </span>
      {classAdvisory && <Tag className="e-pop">Naay klase?</Tag>}
      <Icon name="caret-right" className="status-caret" />
    </button>
  );
}
