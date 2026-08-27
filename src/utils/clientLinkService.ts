import { ShortenResponse, UrlItem, GlobalMetrics } from '../types';

const STORAGE_KEY = 'miniurl_links_data';

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateRandomBase62(len: number = 6): string {
  let res = '';
  for (let i = 0; i < len; i++) {
    res += BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)];
  }
  return res;
}

export function getLocalStoredLinks(): UrlItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalStoredLinks(links: UrlItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {
    // Ignore storage quota errors
  }
}

export function createLocalShortLink(params: {
  url: string;
  customCode?: string;
  title?: string;
  expiresAt?: string;
}): ShortenResponse {
  const links = getLocalStoredLinks();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Normalize URL
  let targetUrl = params.url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  // Check custom code or generate random code
  let shortCode = params.customCode?.trim();
  if (!shortCode) {
    // Check if longUrl already exists
    const existing = links.find((l) => l.long_url === targetUrl && (!l.expires_at || new Date(l.expires_at).getTime() > Date.now()));
    if (existing) {
      return {
        short_code: existing.short_code,
        short_url: existing.short_url,
        long_url: existing.long_url,
        title: existing.title,
        created_at: existing.created_at,
        expires_at: existing.expires_at,
        click_count: existing.click_count,
        is_duplicate: true,
        message: 'Existing short URL retrieved.',
      };
    }

    let code = generateRandomBase62(6);
    let attempts = 0;
    while (links.some((l) => l.short_code === code) && attempts < 10) {
      code = generateRandomBase62(6);
      attempts++;
    }
    shortCode = code;
  }

  const shortUrl = `${origin}/${shortCode}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const newLink: UrlItem = {
    short_code: shortCode,
    short_url: shortUrl,
    long_url: targetUrl,
    title: params.title?.trim() || null,
    created_at: now,
    expires_at: params.expiresAt || null,
    click_count: 0,
    is_expired: params.expiresAt ? new Date(params.expiresAt).getTime() <= Date.now() : false,
  };

  const updatedLinks = [newLink, ...links.filter((l) => l.short_code !== shortCode)];
  saveLocalStoredLinks(updatedLinks);

  return {
    short_code: newLink.short_code,
    short_url: newLink.short_url,
    long_url: newLink.long_url,
    title: newLink.title,
    created_at: newLink.created_at,
    expires_at: newLink.expires_at,
    click_count: newLink.click_count,
    is_duplicate: false,
    message: 'Short URL created successfully.',
  };
}

export function computeLocalMetrics(links: UrlItem[]): GlobalMetrics {
  const now = Date.now();
  const activeCount = links.filter((l) => !l.expires_at || new Date(l.expires_at).getTime() > now).length;
  const totalClicks = links.reduce((sum, l) => sum + (l.click_count || 0), 0);

  return {
    totalUrls: links.length,
    totalClicks,
    activeUrls: activeCount,
  };
}

export function recordLocalClick(shortCode: string): void {
  const links = getLocalStoredLinks();
  const updated = links.map((l) => {
    if (l.short_code === shortCode) {
      return { ...l, click_count: (l.click_count || 0) + 1 };
    }
    return l;
  });
  saveLocalStoredLinks(updated);
}

export function deleteLocalLink(shortCode: string): void {
  const links = getLocalStoredLinks();
  const updated = links.filter((l) => l.short_code !== shortCode);
  saveLocalStoredLinks(updated);
}
