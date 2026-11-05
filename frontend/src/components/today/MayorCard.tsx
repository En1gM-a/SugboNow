import { Link } from 'react-router-dom';
import { compact, CountUp } from '@/components/CountUp';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { useAuth } from '@/context/AuthContext';
import { useLguPosts } from '@/hooks/useLguPosts';
import type { LguPostCategory } from '@/types/api';
import { ago, initials } from '@/utils/format';
import { Card, CardError, timing } from './Card';

const CATEGORY: Partial<Record<LguPostCategory, string>> = {
  class_suspension: 'Naay klase?',
  traffic: 'Traffic',
  weather: 'Weather',
  utility: 'Utility',
};

/**
 * From your mayor (Today, item 8): the latest post as a preview (avatar, LGU, time, 2-line caption, counts), linking
 * to /mayor. On sign-in it calls POST /api/lgu-posts/refresh once; the browser never contacts Facebook.
 */
export function MayorCard({ i, span }: { i: number; span: string }) {
  const { user } = useAuth();
  const posts = useLguPosts(user?.id ?? null);
  const t = timing(i);
  const title = (
    <h2 id="mayor-h" className="card-title">
      <Link to="/mayor" className="stretch">
        From your mayor
      </Link>
    </h2>
  );

  if (posts.isPending) {
    return (
      <Card i={i} span={span} className="mayor">
        <div className="post-skel" aria-hidden="true">
          <Skeleton className="skel-line w-32" />
          <Skeleton className="skel-row" />
          <Skeleton className="skel-line w-full" />
          <Skeleton className="skel-cover" />
        </div>
      </Card>
    );
  }
  if (posts.isError) {
    return (
      <Card i={i} span={span} className="mayor" labelledBy="mayor-h">
        {title}
        <CardError what="your mayor's posts" onRetry={() => void posts.refetch()} />
      </Card>
    );
  }

  const { source, posts: list } = posts.data;
  const post = list[0];
  if (!source || !post) {
    return (
      <Card i={i} span={span} className="mayor" labelledBy="mayor-h">
        <h2 id="mayor-h" className="card-title">
          From your mayor
        </h2>
        <p className="muted small mt-2">{source ? 'No posts yet.' : 'Pick your mayor in Profile to see their latest post here.'}</p>
        {!source && (
          <Link to="/profile?section=details" className="btn btn-quiet">
            Pick your mayor
          </Link>
        )}
      </Card>
    );
  }

  const category = post.category ? CATEGORY[post.category] : undefined;
  const counts: Array<[number, string]> = [];
  if (post.reactionCount !== null) counts.push([post.reactionCount, 'reactions']);
  if (post.commentCount !== null) counts.push([post.commentCount, 'comments']);
  if (post.shareCount !== null) counts.push([post.shareCount, 'shares']);

  return (
    <Card i={i} span={span} className="mayor linked" labelledBy="mayor-h">
      {title}
      <div className="post-head">
        <span className="lgu e-pop" aria-hidden="true">
          {initials(source.displayName)}
        </span>
        <div className="min-w-0">
          <b className="block">{source.displayName}</b>
          <span className="muted small">{post.postedAt ? ago(post.postedAt) : 'Recently'}</span>
        </div>
        {category && (
          <Tag tone={post.category === 'class_suspension' ? 'mango' : 'quiet'} className="e-pop ml-auto">
            {category}
          </Tag>
        )}
      </div>
      <p className="caption">{post.caption?.replace(/\s+/g, ' ')}</p>
      <div className="cover e-wipe" aria-hidden="true" />
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
    </Card>
  );
}
