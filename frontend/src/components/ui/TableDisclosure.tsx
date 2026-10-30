// "Show as table": a text alternative for a chart or map, kept out of the way until asked for.

import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function TableDisclosure({ summary = 'Show as table', children }: { summary?: string; children: ReactNode }) {
  return (
    <details className="data-details mt-2">
      <summary className="inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark">
        {summary}
        <Icon name="chevronDown" size={16} className="data-details-chevron transition-transform duration-200 motion-reduce:transition-none" />
      </summary>
      <div className="mt-1 overflow-x-auto">{children}</div>
    </details>
  );
}

export const tableClass = 'w-full text-left text-sm [&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_td]:pr-4 [&_th]:border-b [&_th]:border-line [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted';
