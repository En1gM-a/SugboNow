import type { UseQueryResult } from '@tanstack/react-query';
import * as m from 'motion/react-m';
import { useLayoutEffect, useRef, useState } from 'react';
import { Card, CardError } from '@/components/today/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import type { BriefTodayResponse } from '@/types/api';
import { formatTime } from '@/utils/format';

/**
 * Today's brief (Today, item 5): the first 3 lines with "Read the full brief" (a Motion height expander), the
 * "AI summary" label, and a note that it's written automatically.
 */
export function BriefCard({ i, brief }: { i: number; brief: UseQueryResult<BriefTodayResponse> }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<number | null>(null);
  const [long, setLong] = useState(true);
  const text = useRef<HTMLDivElement>(null);
  const content = brief.data?.brief.content;

  useLayoutEffect(() => {
    const el = text.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24.8;
    setCollapsed(Math.round(lineHeight * 3));
    setLong(el.scrollHeight > lineHeight * 3 + 2);
  }, [content]);

  const head = (
    <div className="card-head">
      <h2 id="brief-h" className="card-title">
        Today&apos;s brief
      </h2>
      <Tag tone="quiet" className="e-pop">
        AI summary
      </Tag>
    </div>
  );

  if (brief.isPending) {
    return (
      <Card i={i} span="span-7" className="brief">
        <div className="brief-skel" aria-hidden="true">
          <Skeleton className="skel-line w-32" />
          <Skeleton className="skel-line w-full" />
          <Skeleton className="skel-line w-full" />
          <Skeleton className="skel-line w-3/4" />
        </div>
      </Card>
    );
  }
  if (brief.isError) {
    return (
      <Card i={i} span="span-7" className="brief" labelledBy="brief-h">
        {head}
        <CardError what="today's brief" onRetry={() => void brief.refetch()} />
      </Card>
    );
  }

  const { brief: b } = brief.data;
  return (
    <Card i={i} span="span-7" className="brief" labelledBy="brief-h">
      {head}
      <m.div className="brief-wrap" initial={false} animate={{ height: open || !long ? 'auto' : (collapsed ?? 'auto') }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
        <div ref={text} id="brief-text" className="brief-text">
          {b.content}
        </div>
      </m.div>
      <div className="brief-foot">
        {long && (
          <button type="button" className="btn btn-quiet" aria-expanded={open} aria-controls="brief-text" onClick={() => setOpen((o) => !o)}>
            {open ? 'Show less' : 'Read the full brief'}
          </button>
        )}
        <span className="muted small">Written automatically at {formatTime(b.generatedAt)}</span>
      </div>
    </Card>
  );
}
