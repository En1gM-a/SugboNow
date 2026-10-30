// Image in a fixed aspect-ratio box: no layout shift, lazy by default, and a fallback
// when the URL fails (Facebook media URLs expire).

import { useState } from 'react';
import { cx } from '@/utils/cx';
import { Icon, type IconName } from './Icon';

interface ImgProps {
  src: string | null | undefined;
  alt: string;
  ratio?: string;
  className?: string;
  eager?: boolean;
  fallbackIcon?: IconName;
}

export function Img({ src, alt, ratio = '16 / 9', className, eager, fallbackIcon = 'news' }: ImgProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx('relative overflow-hidden bg-skeleton', className)} style={{ aspectRatio: ratio }}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-stone-400" role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          <Icon name={fallbackIcon} size={28} />
        </div>
      )}
    </div>
  );
}
