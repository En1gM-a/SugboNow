import { Fragment, type CSSProperties } from 'react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { cx } from '@/utils/cx';

/** Custom properties for an inline style. */
export const vars = (values: Record<string, string | number>) => values as CSSProperties;

/** A still control icon that also takes this page's styles. */
export function Ic({ name, className }: { name: IconName; className?: string }) {
  return <Icon name={name} className={cx('lp-ic', className)} />;
}

/** A symbol from the page's sprite: #i-… is a live icon's drawing and #t-… a tab icon. */
export function Sym({ href, className = 'lp-ico' }: { href: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <use href={href} />
    </svg>
  );
}

/** A section heading whose words rise and lean as it scrolls into view. */
export function RiseWords({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="lp-w">
            <span style={vars({ '--wi': i })}>
              <span className="lp-wv">{word}</span>
            </span>
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** One word of text that fades up on scroll. */
export function Word({ text, i }: { text: string; i: number }) {
  return (
    <span className="lp-sw" style={vars({ '--wi': i })}>
      {text}
    </span>
  );
}

export function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <Word text={word} i={i} />
        </Fragment>
      ))}
    </>
  );
}

/** A paragraph whose words fade up in order as it scrolls into view. */
export function ScrollText({ text, className }: { text: string; className: string }) {
  return (
    <p className={cx(className, 'lp-sd-p')} style={vars({ '--t': text.split(' ').length })}>
      <Words text={text} />
    </p>
  );
}

/** Static markup from lib/landing/art.ts. */
export const html = (markup: string) => ({ __html: markup });
