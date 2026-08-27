export interface UrlItem {
  id?: number;
  short_code: string;
  short_url: string;
  native_short_url?: string | null;
  long_url: string;
  title: string | null;
  click_count: number;
  created_at: string;
  expires_at: string | null;
  is_expired?: boolean;
}

export interface ShortenResponse {
  short_code: string;
  short_url: string;
  native_short_url?: string | null;
  long_url: string;
  title: string | null;
  created_at: string;
  expires_at: string | null;
  click_count: number;
  is_duplicate: boolean;
  message: string;
}

export interface ClickRecord {
  id: number;
  clicked_at: string;
  user_agent: string | null;
  referrer: string | null;
}

export interface UrlStatsResponse {
  short_code: string;
  short_url: string;
  long_url: string;
  title: string | null;
  click_count: number;
  created_at: string;
  expires_at: string | null;
  is_expired: boolean;
  recent_clicks: ClickRecord[];
}

export interface GlobalMetrics {
  totalUrls: number;
  totalClicks: number;
  activeUrls: number;
}

export interface TopAnalyticsResponse {
  metrics: GlobalMetrics;
  top_links: UrlItem[];
}
