import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';

/** "Show as a table": a text alternative for a chart or map, kept out of the way until asked for. */
export function TableDisclosure({ children }: { children: ReactNode }) {
  return (
    <details className="table-details">
      <summary className="btn btn-quiet">
        Show as a table
        <Icon name="caret-down" className="table-caret" />
      </summary>
      <div className="table-scroll">{children}</div>
    </details>
  );
}
