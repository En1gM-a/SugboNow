import type { IconName } from '@/components/icons/Icon';
import type { NewsArticle, NewsSource } from '@/types/api';

export const SOURCE: Record<NewsSource, string> = { sunstar: 'SunStar', cebudailynews: 'Cebu Daily News', gnews: 'GNews' };

/** The source mark on a story card: initials in a circle. */
export const SOURCE_MARK: Record<NewsSource, string> = { sunstar: 'SS', cebudailynews: 'CD', gnews: 'GN' };

// Image placeholders (handoff <design_system>): one of four gradients with a white control icon.
export const PLACEHOLDER: Record<NewsArticle['type'], { tone: string; icon: IconName }> = {
  weather: { tone: 't-blue', icon: 'cloud-rain' },
  flood: { tone: 't-blue', icon: 'waves' },
  traffic: { tone: 't-amber', icon: 'traffic-signal' },
  closure: { tone: 't-amber', icon: 'barricade' },
  water: { tone: 't-teal', icon: 'drop' },
  power: { tone: 't-navy', icon: 'clock' },
  advisory: { tone: 't-navy', icon: 'megaphone' },
  news: { tone: 't-navy', icon: 'newspaper' },
};

export const ALERT_CHIP: Record<Exclude<NewsArticle['type'], 'news'>, string> = {
  advisory: 'Naay klase?',
  weather: 'Weather',
  flood: 'Flood',
  closure: 'Road closure',
  traffic: 'Traffic',
  power: 'Brownout',
  water: 'Water',
};
