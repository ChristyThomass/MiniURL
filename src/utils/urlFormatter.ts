/**
 * URL formatting and native shortener recognition
 */

export interface CanonicalShortInfo {
  nativeShortUrl: string | null;
  serviceName: string | null;
}

/**
 * Extracts native / canonical short link for popular services if applicable
 * (e.g. YouTube -> youtu.be, Reddit -> redd.it, Amazon -> amzn.to, Spotify -> spoti.fi, etc.)
 */
export function getNativeShortUrl(longUrl: string): CanonicalShortInfo {
  try {
    const url = new URL(longUrl.startsWith('http') ? longUrl : `https://${longUrl}`);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // 1. YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      // Standard watch link: /watch?v=VIDEO_ID
      const videoId = searchParams.get('v');
      if (videoId) {
        return {
          nativeShortUrl: `https://youtu.be/${videoId}`,
          serviceName: 'YouTube',
        };
      }
      // Shorts: /shorts/VIDEO_ID
      const shortsMatch = pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch && shortsMatch[1]) {
        return {
          nativeShortUrl: `https://youtu.be/${shortsMatch[1]}`,
          serviceName: 'YouTube Shorts',
        };
      }
      // Embed: /embed/VIDEO_ID
      const embedMatch = pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch && embedMatch[1]) {
        return {
          nativeShortUrl: `https://youtu.be/${embedMatch[1]}`,
          serviceName: 'YouTube Embed',
        };
      }
      // Already youtu.be
      if (host.includes('youtu.be')) {
        const id = pathname.replace(/^\/+/, '').split('/')[0];
        if (id) {
          return {
            nativeShortUrl: `https://youtu.be/${id}`,
            serviceName: 'YouTube',
          };
        }
      }
    }

    // 2. Reddit (/r/.../comments/ID/...)
    if (host.includes('reddit.com')) {
      const redditMatch = pathname.match(/\/comments\/([a-zA-Z0-9]+)/);
      if (redditMatch && redditMatch[1]) {
        return {
          nativeShortUrl: `https://redd.it/${redditMatch[1]}`,
          serviceName: 'Reddit',
        };
      }
    }

    // 3. Amazon (/dp/ASIN or /gp/product/ASIN)
    if (host.includes('amazon.')) {
      const dpMatch = pathname.match(/\/(?:dp|gp\/product)\/([a-zA-Z0-9]{10})/i);
      if (dpMatch && dpMatch[1]) {
        return {
          nativeShortUrl: `https://amzn.to/${dpMatch[1]}`,
          serviceName: 'Amazon',
        };
      }
    }

    // 4. Spotify (/track/ID, /album/ID, /playlist/ID)
    if (host.includes('spotify.com')) {
      const spMatch = pathname.match(/\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
      if (spMatch && spMatch[2]) {
        return {
          nativeShortUrl: `https://spoti.fi/${spMatch[2]}`,
          serviceName: 'Spotify',
        };
      }
    }

    // 5. GitHub (github.com/owner/repo)
    if (host.includes('github.com')) {
      const ghMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/);
      if (ghMatch && ghMatch[1] && ghMatch[2] && !['orgs', 'settings', 'notifications', 'marketplace'].includes(ghMatch[1])) {
        return {
          nativeShortUrl: `https://git.io/${ghMatch[1]}-${ghMatch[2]}`,
          serviceName: 'GitHub',
        };
      }
    }

    // 6. Twitter / X
    if (host.includes('twitter.com') || host.includes('x.com')) {
      const tweetMatch = pathname.match(/\/status\/([0-9]+)/);
      if (tweetMatch && tweetMatch[1]) {
        return {
          nativeShortUrl: `https://x.com/i/status/${tweetMatch[1]}`,
          serviceName: 'X / Twitter',
        };
      }
    }

    // 7. LinkedIn
    if (host.includes('linkedin.com')) {
      const lnkdMatch = pathname.match(/\/posts\/([a-zA-Z0-9_-]+)/);
      if (lnkdMatch && lnkdMatch[1]) {
        return {
          nativeShortUrl: `https://lnkd.in/${lnkdMatch[1].substring(0, 10)}`,
          serviceName: 'LinkedIn',
        };
      }
    }

    return { nativeShortUrl: null, serviceName: null };
  } catch {
    return { nativeShortUrl: null, serviceName: null };
  }
}

/**
 * Format a clean, compact short link without ugly hostnames like vercel.app
 */
export function formatCleanShortUrl(
  shortCode: string,
  longUrl?: string,
  preferredDomain: 'native' | 'compact' | 'min' | 'app' = 'native'
): string {
  if (longUrl && preferredDomain === 'native') {
    const native = getNativeShortUrl(longUrl);
    if (native.nativeShortUrl) {
      return native.nativeShortUrl;
    }
  }

  if (preferredDomain === 'min') {
    return `https://min.url/${shortCode}`;
  }

  if (preferredDomain === 'compact') {
    return `https://s.link/${shortCode}`;
  }

  // Fallback to clean short URL
  return `https://min.url/${shortCode}`;
}
