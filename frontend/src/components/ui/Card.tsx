// Cards, the Sinulog ribbon, badges and section headers: the bento grid's building blocks.

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { AlertType, Severity } from '@/types/api';
import { cx } from '@/utils/cx';
import { Icon, type IconName } from './Icon';

export function SinulogRibbon({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('sinulog-ribbon h-1', className)} />;
}

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div' | 'li';
  featured?: boolean;
  padded?: boolean;
  style?: CSSProperties;
}

export function Card({ as: Tag = 'section', featured, padded = true, className, children, ...rest }: CardProps) {
  return (
    <Tag className={cx('relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card', className)} {...rest}>
      {featured && <SinulogRibbon />}
      <div className={cx(padded && 'p-4 sm:p-5', 'flex h-full flex-col')}>{children}</div>
    </Tag>
  );
}

export function CardHeader({ title, icon, action, id, subtitle }: { title: string; icon?: IconName; action?: ReactNode; id?: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-ink">
          {icon && <Icon name={icon} size={20} className="text-mactan-sea" />}
          {title}
        </h2>
        {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
      </div>
      {action && <div className="-my-2 shrink-0">{action}</div>}
    </div>
  );
}

type BadgeTone = 'neutral' | 'marigold' | 'sea' | 'ok' | 'high' | 'medium' | 'low' | 'navy';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-ink',
  marigold: 'bg-marigold text-on-accent',
  sea: 'bg-mactan-sea-soft text-mactan-sea-dark',
  ok: 'bg-status-ok-soft text-status-ok',
  high: 'bg-status-high text-on-status',
  medium: 'bg-status-medium text-on-status',
  low: 'bg-status-low text-on-status',
  navy: 'bg-selected text-on-selected',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 whitespace-nowrap', TONES[tone], className)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

const SEVERITY: Record<Severity, { label: string; icon: IconName }> = {
  high: { label: 'High', icon: 'alert' },
  medium: { label: 'Medium', icon: 'info' },
  low: { label: 'Low', icon: 'info' },
};

/** Severity is always icon + label, never color alone. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const s = SEVERITY[severity];
  return (
    <Badge tone={severity} icon={s.icon} className={className}>
      <span className="sr-only">Severity: </span>
      {s.label}
    </Badge>
  );
}

export const ALERT_TYPE: Record<AlertType, { label: string; icon: IconName }> = {
  advisory: { label: 'Advisory', icon: 'school' },
  weather: { label: 'Weather', icon: 'storm' },
  flood: { label: 'Flood', icon: 'waves' },
  closure: { label: 'Road closure', icon: 'ban' },
  traffic: { label: 'Traffic', icon: 'car' },
  power: { label: 'Power', icon: 'zap' },
  water: { label: 'Water', icon: 'droplet' },
};

export function TypeBadge({ type }: { type: AlertType }) {
  const t = ALERT_TYPE[type];
  return (
    <Badge tone="neutral" icon={t.icon}>
      {t.label}
    </Badge>
  );
}

/** "Naay klase?" chip for class advisories. */
export function KlaseChip() {
  return (
    <Badge tone="marigold" icon="school">
      Naay klase?
    </Badge>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 tabIndex={-1} data-page-heading className="text-2xl font-bold tracking-tight text-ink outline-none sm:text-3xl">
          {title}
        </h1>
        {subtitle && <div className="mt-1 max-w-[65ch] text-muted">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}
