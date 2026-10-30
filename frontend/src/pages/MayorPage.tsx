import { useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge, Card, PageHeader } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Img } from '@/components/ui/Img';
import { EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonLines, UpdatedAgo } from '@/components/ui/States';
import { useNow } from '@/hooks/useBrowser';
import { useLguPostsLatest } from '@/hooks/useFeeds';
import { useLguSources, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { USE_MOCKS } from '@/lib/supabaseClient';
import { toast } from '@/lib/toast';
import type { LguPost, LguPostCategory } from '@/types/api';
import { cx } from '@/utils/cx';
import { formatAgo, formatCount, initials } from '@/utils/format';

const CATEGORY: Record<LguPostCategory, { label: string; icon: IconName; tone: 'high' | 'medium' | 'low' | 'sea' | 'neutral' }> = {
  class_suspension: { label: 'Class suspension', icon: 'school', tone: 'high' },
  traffic: { label: 'Traffic', icon: 'car', tone: 'medium' },
  weather: { label: 'Weather', icon: 'storm', tone: 'sea' },
  utility: { label: 'Power & water', icon: 'zap', tone: 'low' },
  general: { label: 'General', icon: 'megaphone', tone: 'neutral' },
};

const SHORT: Record<string, string> = { cebu_city: 'Cebu City', lapu_lapu_city: 'Lapu-Lapu', mandaue_city: 'Mandaue', cebu_province: 'Province' };

export default function MayorPage() {
  const now = useNow();
  const profile = useProfile();
  const sources = useLguSources();
  const update = useUpdateProfile();
  const mine = profile.data?.subscribedMayor ?? null;
  // The LGU being browsed lives in the URL (?lgu=mandaue_city); no param means your own.
  const [params, setParams] = useSearchParams();
  const viewing = params.get('lgu') ?? mine ?? 'cebu_city';
  const setPicked = (slug: string) => setParams(slug === mine ? {} : { lgu: slug }, { replace: true });
  const isMine = viewing === mine;
  // Other LGUs' posts are mock-only for now; the real API returns only the followed LGU's posts.
  const canPreview = isMine || USE_MOCKS;
  const posts = useLguPostsLatest(10, isMine ? undefined : viewing, canPreview && !profile.isPending);
  const source = sources.data?.find((s) => s.slug === viewing);

  return (
    <div>
      <PageHeader title="From your mayor" subtitle="Official Facebook posts from your LGU, checked by Sugbo Now. We never connect your browser to Facebook." />

      <div role="group" aria-label="Choose an LGU" className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(sources.data ?? []).map((s) => (
          <button
            key={s.slug}
            type="button"
            aria-pressed={viewing === s.slug}
            onClick={() => setPicked(s.slug)}
            className={cx(
              'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
              viewing === s.slug ? 'border-selected bg-selected text-on-selected' : 'border-line bg-surface text-ink hover:border-mactan-sea/50',
            )}
          >
            {SHORT[s.slug] ?? s.displayName}
            {s.slug === mine && <Icon name="check" size={16} label="(you follow this)" className={viewing === s.slug ? 'text-marigold' : 'text-status-ok'} />}
          </button>
        ))}
        {sources.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-28 rounded-full" />)}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card featured>
            {!source ? (
              <SkeletonLines lines={4} />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-selected font-heading text-lg font-bold text-on-selected">
                    {initials(source.officialName ?? source.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-lg leading-tight font-semibold">{source.officialName ?? `Office of the ${source.officialTitle === 'governor' ? 'Governor' : 'Mayor'}`}</p>
                    <p className="text-sm text-muted capitalize">
                      {source.officialTitle ?? 'Official'}, {source.displayName}
                    </p>
                  </div>
                </div>
                {isMine ? (
                  <p className="mt-4 flex min-h-11 items-center gap-2 text-sm font-semibold text-status-ok">
                    <Icon name="checkCircle" size={18} />
                    You follow this LGU
                  </p>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    loading={update.isPending}
                    onClick={() =>
                      update.mutate(
                        { subscribedMayor: viewing },
                        { onSuccess: () => toast.success(`You now follow ${source.displayName}.`) },
                      )
                    }
                  >
                    Make this my mayor
                  </Button>
                )}
                {source.fbPageUrl && (
                  <a
                    href={source.fbPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:bg-mactan-sea-soft"
                  >
                    Open Facebook page
                    <Icon name="external" size={14} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
                <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                  Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions. Every other town follows the Province of Cebu.
                </p>
                {posts.data && <UpdatedAgo at={posts.data.source?.lastFetchedAt ?? posts.dataUpdatedAt} className="mt-2" />}
              </>
            )}
          </Card>
        </aside>

        <section aria-label="Posts">
          {!canPreview ? (
            <Card>
              <EmptyState title="Preview coming soon" action={<Button onClick={() => update.mutate({ subscribedMayor: viewing })}>Make this my mayor</Button>}>
                Follow this LGU to see its latest posts here.
              </EmptyState>
            </Card>
          ) : posts.isPending ? (
            <div className="space-y-4">
              <LoadingLabel>Loading posts…</LoadingLabel>
              {[0, 1].map((i) => (
                <Card key={i}>
                  <SkeletonLines lines={4} />
                  <Skeleton className="mt-4 aspect-[2/1] rounded-xl" />
                </Card>
              ))}
            </div>
          ) : posts.isError ? (
            <Card>
              <ErrorState message="We couldn’t load the posts." onRetry={() => void posts.refetch()} />
            </Card>
          ) : posts.data.posts.length === 0 ? (
            <Card>
              <EmptyState title="No posts saved yet">We check the page when someone signs in, at most every 10 minutes.</EmptyState>
            </Card>
          ) : (
            <ul className={cx('space-y-4 transition-opacity duration-150', posts.isPlaceholderData && 'opacity-60')}>
              {posts.data.posts.map((p, i) => (
                <li key={p.id} className={i >= 2 ? 'cv-auto' : undefined}>
                  <PostCard post={p} now={now} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function PostCard({ post: p, now }: { post: LguPost; now: number }) {
  const [expanded, setExpanded] = useState(false);
  const capId = useId();
  const long = (p.caption?.length ?? 0) > 220;
  const cat = p.category ? CATEGORY[p.category] : null;
  const media = p.media.slice(0, 4);

  return (
    <Card as="article">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {cat ? (
          <Badge tone={cat.tone} icon={cat.icon}>
            {cat.label}
          </Badge>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted tabular-nums">{p.postedAt ? formatAgo(p.postedAt, now) : ''}</span>
      </div>
      {p.caption && (
        <div className="mt-3">
          <p id={capId} className={cx('max-w-[70ch] whitespace-pre-line text-ink', !expanded && long && 'line-clamp-4')}>
            {p.caption}
          </p>
          {long && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={capId}
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 min-h-11 rounded-lg text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark"
            >
              {expanded ? 'See less' : 'See more'}
            </button>
          )}
        </div>
      )}
      {media.length > 0 && (
        <div className={cx('mt-3 grid max-w-xl gap-1.5 overflow-hidden rounded-xl', media.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {media.map((m, i) => {
            const inner = <Img src={m.thumbnailUrl ?? m.url} alt={m.altText ?? 'Photo from the post'} ratio={media.length === 1 ? '16 / 10' : media.length === 3 && i === 0 ? '2 / 1' : '1 / 1'} fallbackIcon="megaphone" />;
            const span = media.length === 3 && i === 0 ? 'col-span-2' : '';
            return m.type === 'video' ? (
              <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className={cx('group relative block cursor-pointer', span)} aria-label="Play video on Facebook (opens in a new tab)">
                {inner}
                <span className="absolute inset-0 flex items-center justify-center bg-mactan-navy/30 transition-colors duration-150 group-hover:bg-mactan-navy/45">
                  <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-mactan-navy">
                    <Icon name="play" size={24} />
                  </span>
                </span>
                {m.durationSeconds && (
                  <span className="absolute right-2 bottom-2 rounded-md bg-mactan-navy/85 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                    {Math.floor(m.durationSeconds / 60)}:{String(m.durationSeconds % 60).padStart(2, '0')}
                  </span>
                )}
              </a>
            ) : (
              <div key={i} className={span}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <dl className="flex gap-4 text-sm text-muted tabular-nums">
          <div className="flex items-center gap-1">
            <dt>
              <Icon name="heart" size={16} label="Reactions" />
            </dt>
            <dd>{formatCount(p.reactionCount)}</dd>
          </div>
          <div className="flex items-center gap-1">
            <dt>
              <Icon name="message" size={16} label="Comments" />
            </dt>
            <dd>{formatCount(p.commentCount)}</dd>
          </div>
          <div className="flex items-center gap-1">
            <dt>
              <Icon name="share" size={16} label="Shares" />
            </dt>
            <dd>{formatCount(p.shareCount)}</dd>
          </div>
        </dl>
        {p.permalink && (
          <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark hover:underline">
            View on Facebook
            <Icon name="external" size={14} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </Card>
  );
}
