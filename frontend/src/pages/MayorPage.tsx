// Mayor (/mayor, handoff <pages> page 6): "What did my mayor post?" A page like a Facebook Page: a cover, the LGU and a
// row of LGUs to switch between, then the feed beside an About card and the "Right now" glance. The browser never
// contacts Facebook: the backend checks the page, and post images come from the URLs the API returns.

import * as m from 'motion/react-m';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { compact, CountUp } from '@/components/CountUp';
import { Icon } from '@/components/icons/Icon';
import { Page } from '@/components/layout/Page';
import { RightNow } from '@/components/RightNow';
import { CardError, timing } from '@/components/today/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { useNow } from '@/hooks/useBrowser';
import { useLguPostsLatest } from '@/hooks/useFeeds';
import { useLguSources, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { CLASS_SUSPENSION_NOTE } from '@/lib/signupOptions';
import { USE_MOCKS } from '@/lib/supabaseClient';
import { toast } from '@/lib/toast';
import type { LguPost, LguPostCategory, LguPostMedia, LguSource } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { ago, initials } from '@/utils/format';

const SHORT_NAME: Record<string, string> = { cebu_city: 'Cebu City', mandaue_city: 'Mandaue', lapu_lapu_city: 'Lapu-Lapu', cebu_province: 'Province' };

const CATEGORY: Partial<Record<LguPostCategory, string>> = {
  class_suspension: 'Class suspension',
  traffic: 'Traffic',
  weather: 'Weather',
  utility: 'Power & water',
};

const officialLine = (source: LguSource) => {
  const title = source.officialTitle === 'governor' ? 'Governor' : 'Mayor';
  return source.officialName ? `${title} ${source.officialName}` : `Office of the ${title}`;
};

/** The caption, clamped to 4 lines with "See more". It opens in place (Motion height: "auto", 200 ms). */
function Caption({ text }: { text: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);
  // Null until first opened: the plain line clamp needs no JavaScript to look right.
  const [closedHeight, setClosedHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && closedHeight === null) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, closedHeight]);

  function toggle() {
    if (closedHeight === null && ref.current) setClosedHeight(ref.current.offsetHeight);
    setOpen((o) => !o);
  }

  return (
    <div className="post-caption">
      {closedHeight === null ? (
        <p id={id} ref={ref} className="is-clamped">
          {text}
        </p>
      ) : (
        <m.p id={id} className="is-opening" initial={{ height: closedHeight }} animate={{ height: open ? 'auto' : closedHeight }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          {text}
        </m.p>
      )}
      {overflows && (
        <button type="button" className="btn btn-quiet see-more" aria-expanded={open} aria-controls={id} onClick={toggle}>
          {open ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
}

function MediaImage({ media, label }: { media: LguPostMedia; label: string }) {
  const [failed, setFailed] = useState(false);
  const src = media.thumbnailUrl ?? (media.type === 'image' ? media.url : null);
  // Facebook image URLs expire after some days.
  if (!src || failed) {
    return (
      <span className="media-art t-navy" role="img" aria-label={label}>
        <Icon name={media.type === 'video' ? 'play' : 'megaphone'} />
      </span>
    );
  }
  return <img src={src} alt={media.altText ?? label} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

const minutesSeconds = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** 1 image full width, 2 side by side, 3 or more as one large plus smaller ones with "+N". */
function PostMediaGrid({ media }: { media: LguPostMedia[] }) {
  if (media.length === 0) return null;
  const shown = media.slice(0, 3);
  const extra = media.length - shown.length;
  return (
    <div className={cx('post-media', `n-${shown.length}`)}>
      {shown.map((item, i) => {
        const label = item.type === 'video' ? 'Video from this post' : 'Photo from this post';
        const more = extra > 0 && i === shown.length - 1 ? extra : 0;
        if (item.type === 'video') {
          return (
            <a key={item.url} className="media-tile" href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Play this video on Facebook (opens in a new tab)">
              <MediaImage media={item} label={label} />
              <span className="media-play" aria-hidden="true">
                <Icon name="play" />
              </span>
              {item.durationSeconds !== null && <span className="media-time tabular-nums">{minutesSeconds(item.durationSeconds)}</span>}
            </a>
          );
        }
        return (
          <div key={item.url} className="media-tile">
            <MediaImage media={item} label={label} />
            {more > 0 && (
              <span className="media-more tabular-nums">
                +{more}
                <span className="sr-only"> more photos on Facebook</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PostCard({ post, name, i, now }: { post: LguPost; name: string; i: number; now: number }) {
  const category = post.category ? CATEGORY[post.category] : undefined;
  const t = timing(Math.min(i + 1, 5));
  const counts: Array<[number, string]> = [];
  if (post.reactionCount !== null) counts.push([post.reactionCount, 'reactions']);
  if (post.commentCount !== null) counts.push([post.commentCount, 'comments']);
  if (post.shareCount !== null) counts.push([post.shareCount, 'shares']);

  return (
    <article className={cx('card glass e-card post', i >= 2 && 'below-fold')} style={vars({ '--i': Math.min(i + 1, 5) })} aria-label={`Post from ${name}, ${post.postedAt ? ago(post.postedAt, now) : 'recently'}`}>
      <div className="post-head">
        <span className="lgu" aria-hidden="true">
          {initials(name)}
        </span>
        <div className="min-w-0">
          <b className="block">{name}</b>
          <span className="muted small">{post.postedAt ? ago(post.postedAt, now) : 'Recently'}</span>
        </div>
        {category && (
          <Tag tone={post.category === 'class_suspension' ? 'mango' : 'quiet'} className="ml-auto">
            {category}
          </Tag>
        )}
      </div>
      {post.caption && <Caption text={post.caption} />}
      <PostMediaGrid media={post.media} />
      <div className="post-foot">
        <p className="react">
          {counts.map(([n, label]) => {
            const c = compact(n);
            return (
              <span key={label}>
                <CountUp value={c.value} decimals={c.decimals} suffix={c.suffix} delay={t.count} /> {label}
              </span>
            );
          })}
        </p>
        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="out-link">
            View on Facebook
            <Icon name="arrow-up-right" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}

function PostSkeleton() {
  return (
    <div className="card glass post-skel" aria-hidden="true">
      <Skeleton className="skel-row" />
      <Skeleton className="skel-line w-full" />
      <Skeleton className="skel-line w-64" />
      <Skeleton className="skel-media" />
    </div>
  );
}

export default function MayorPage() {
  const now = useNow();
  const profile = useProfile();
  const sources = useLguSources();
  const update = useUpdateProfile();
  const mine = profile.data?.subscribedMayor ?? null;
  // The LGU being browsed lives in the URL (/mayor?lgu=mandaue_city); no param means your own.
  const [params, setParams] = useSearchParams();
  const viewing = params.get('lgu') ?? mine ?? 'cebu_city';
  const isMine = viewing === mine;
  // The API only returns the followed LGU's posts, so other LGUs' posts are mock for now.
  const canPreview = isMine || USE_MOCKS;
  const posts = useLguPostsLatest(10, isMine ? undefined : viewing, canPreview && profile.isSuccess);
  const source = sources.data?.find((s) => s.slug === viewing);
  const name = source?.displayName ?? posts.data?.source?.displayName ?? 'Your mayor';
  const fbPage = source?.fbPageUrl ?? posts.data?.source?.fbPageUrl ?? null;
  const checkedAt = isMine ? posts.data?.source?.lastFetchedAt : null;

  function pick(slug: string) {
    setParams(slug === mine ? {} : { lgu: slug }, { replace: true, preventScrollReset: true });
  }

  function follow() {
    const previous = mine;
    update.mutate(
      { subscribedMayor: viewing },
      {
        onSuccess: () => {
          toast.success(`You now follow ${name}.`, { label: 'Undo', onClick: () => update.mutate({ subscribedMayor: previous }) });
        },
      },
    );
  }

  return (
    <Page name="/mayor">
      <section className="card glass e-card mayor-head" style={vars({ '--i': 0 })} aria-labelledby="lgu-h">
        <div className="cover cover-lg e-wipe" aria-hidden="true" />
        <div className="mayor-id">
          <span className="lgu lgu-lg e-pop" aria-hidden="true">
            {initials(name)}
          </span>
          <div className="mayor-names">
            {source ? (
              <>
                <h2 id="lgu-h" className="mayor-name">
                  {source.displayName}
                </h2>
                <p className="muted small">{officialLine(source)}</p>
              </>
            ) : (
              <>
                <h2 id="lgu-h" className="sr-only">
                  Your mayor
                </h2>
                <Skeleton className="skel-line w-48" />
              </>
            )}
          </div>
          <div className="mayor-cta">
            {isMine ? (
              <span className="following">
                <Icon name="check" />
                Following
              </span>
            ) : (
              <Button onClick={follow} disabled={!source || profile.isPending}>
                Make this my mayor
              </Button>
            )}
          </div>
        </div>
        <div className="lgu-row" role="group" aria-label="Choose an LGU">
          {sources.isPending
            ? [0, 1, 2, 3].map((k) => <Skeleton key={k} className="lgu-pick-skel" />)
            : (sources.data ?? []).map((s) => (
                <button key={s.slug} type="button" className="lgu-pick" aria-pressed={s.slug === viewing} onClick={() => pick(s.slug)}>
                  <span className="lgu" aria-hidden="true">
                    {initials(s.displayName)}
                  </span>
                  <span className="lgu-pick-name">
                    {SHORT_NAME[s.slug] ?? s.displayName}
                    {s.slug === mine && <span className="sr-only">, your mayor</span>}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <div className="grid12">
        <section className="feed span-8" aria-label={`Posts from ${name}`}>
          {!canPreview ? (
            <div className="card glass empty">
              <p className="empty-text">Follow {name} to see their posts here.</p>
              <p className="muted small">We check one mayor&apos;s page for you when you sign in.</p>
            </div>
          ) : posts.isPending ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.isError ? (
            <div className="card glass">
              <h2 className="card-title">Latest posts</h2>
              <CardError what="the posts" onRetry={() => void posts.refetch()} />
            </div>
          ) : posts.data.posts.length === 0 ? (
            <div className="card glass empty">
              <p className="empty-text">No posts saved yet.</p>
              <p className="muted small">We check the page when someone signs in, at most every 10 minutes.</p>
            </div>
          ) : (
            <>
              <div className={cx('feed-list', posts.isPlaceholderData && 'is-stale')}>
                {posts.data.posts.map((post, i) => (
                  <PostCard key={post.id} post={post} name={name} i={i} now={now} />
                ))}
              </div>
              <p className="feed-end small">
                <span>
                  That&apos;s the latest {posts.data.posts.length} posts
                  {fbPage && (
                    <>
                      {' · '}
                      <a href={fbPage} target="_blank" rel="noopener noreferrer" className="feed-link">
                        See more on Facebook <Icon name="arrow-up-right" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </>
                  )}
                </span>
              </p>
            </>
          )}
        </section>
        <div className="side span-4">
          <section className="card glass e-card about" style={vars({ '--i': 1 })} aria-labelledby="about-h">
            <h2 id="about-h" className="card-title">
              About
            </h2>
            <p className="small">{CLASS_SUSPENSION_NOTE}</p>
            {fbPage && (
              <a href={fbPage} target="_blank" rel="noopener noreferrer" className="out-link">
                Official page
                <Icon name="arrow-up-right" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            {checkedAt && <p className="muted small">Checked {ago(checkedAt, now)}</p>}
          </section>
          <RightNow i={2} />
        </div>
      </div>
    </Page>
  );
}
