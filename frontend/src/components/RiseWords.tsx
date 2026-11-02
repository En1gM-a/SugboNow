import { Fragment, type Ref } from 'react';
import { cx, vars } from '@/utils/cx';

interface RiseWordsProps {
  text: string;
  as?: 'h1' | 'h2' | 'p' | 'span';
  /** big: the home headline (700 ms, 70 ms apart, a slight tilt). small: titles (420 ms, 35 ms apart). */
  variant?: 'big' | 'small';
  /** Whether the words rise. Change the element's key to play it again. */
  play: boolean;
  /** When the first word starts, in ms. */
  delay?: number;
  id?: string;
  className?: string;
  tabIndex?: number;
  ref?: Ref<HTMLElement>;
}

/**
 * Words that rise out of a mask (handoff: RiseWords; sample: words and rise). Each word sits in an inline-block that
 * clips it, with real spaces between the words, so the text stays selectable and reads normally in a screen reader.
 */
export function RiseWords({ text, as: Tag = 'span', variant = 'small', play, delay = 0, id, className, tabIndex, ref }: RiseWordsProps) {
  const words = text.trim().split(/\s+/);
  return (
    <Tag
      id={id}
      ref={ref as Ref<never>}
      tabIndex={tabIndex}
      className={cx('rise', className)}
      data-rise={play ? variant : undefined}
      style={vars({ '--rise-delay': `${delay}ms` })}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="w">
            <span style={vars({ '--wi': i })}>{word}</span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
