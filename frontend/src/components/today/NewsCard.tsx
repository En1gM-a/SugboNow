import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { PLACEHOLDER, SOURCE } from '@/components/news/storyArt';
import { Skeleton } from '@/components/ui/Skeleton';
import { useNews } from '@/hooks/useFeeds';
import { USE_MOCKS } from '@/lib/supabaseClient';
import type { NewsArticle } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { ago } from '@/utils/format';
import { Card, CardError } from './Card';

/** The story's image in a fixed box, or its placeholder when there's none or it fails to load. */
function Thumb({ article }: { article: NewsArticle }) {
  const [failed, setFailed] = useState(false);
  if (article.imageUrl && !failed) {
    return (
      <span className="thumb">
        <img src={article.imageUrl} alt="" loading="lazy" decoding="async" width={56} height={56} onError={() => setFailed(true)} />
      </span>
    );
  }
  const placeholder = PLACEHOLDER[article.type];
  return (
    <span className={cx('thumb', placeholder.tone)} aria-hidden="true">
      <Icon name={placeholder.icon} />
    </span>
  );
}

/** Top Cebu news (Today, item 9): 3 compact rows (headline, source, time, small thumbnail), linking to /news. */
export function NewsCard({ i, span }: { i: number; span: string }) {
  const news = useNews(3);
  const title = (
    <div className="card-head">
      <h2 id="news-h" className="card-title">
        Top Cebu news
      </h2>
      {USE_MOCKS && <span className="muted small">Sample headlines</span>}
    </div>
  );

  if (news.isPending) {
    return (
      <Card i={i} span={span} className="news">
        <div className="rows-skel" aria-hidden="true">
          <Skeleton className="skel-line w-36" />
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} className="skel-row" />
          ))}
        </div>
      </Card>
    );
  }
  if (news.isError) {
    return (
      <Card i={i} span={span} className="news" labelledBy="news-h">
        {title}
        <CardError what="the news" onRetry={() => void news.refetch()} />
      </Card>
    );
  }

  return (
    <Card i={i} span={span} className="news" labelledBy="news-h">
      {title}
      {news.data.length === 0 ? (
        <p className="muted small mt-2">No Cebu stories in the last 3 days.</p>
      ) : (
        <ul className="news-rows">
          {news.data.map((article, j) => (
            <li key={article.id} className="news-row e-row" style={vars({ '--j': j })}>
              <Thumb article={article} />
              <div className="news-main">
                <Link to="/news" className="news-title stretch">
                  {article.title}
                </Link>
                <span className="muted small">
                  {SOURCE[article.source]} · {ago(article.publishedAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
