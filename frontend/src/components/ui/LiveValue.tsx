// A value that slides: when it changes on refetch, the old one slides up and out, the new one in (4px, 150 ms).

import { useEffect, useRef, useState } from 'react';

export function LiveValue({ value, className }: { value: string; className?: string }) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<string | null>(null);
  const last = useRef(value);

  useEffect(() => {
    if (value === last.current) return;
    setPrevious(last.current);
    setCurrent(value);
    last.current = value;
    const t = setTimeout(() => setPrevious(null), 150);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className={`relative inline-block tabular-nums ${className ?? ''}`}>
      {previous !== null && (
        <span aria-hidden="true" className="absolute inset-0 animate-[live-out_150ms_var(--ease-in)_both] motion-reduce:animate-none">
          {previous}
        </span>
      )}
      <span key={current} className={previous !== null ? 'inline-block animate-[live-in_150ms_var(--ease-out)_both] motion-reduce:animate-fade-in' : undefined}>
        {current}
      </span>
    </span>
  );
}
