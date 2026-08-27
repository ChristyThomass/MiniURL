/**
 * Utilities for detecting and generating official/native clean short URLs
 * (e.g. YouTube -> youtu.be, Reddit -> redd.it, Amazon -> a.co, etc.)
 */

export interface NativeShortInfo {
  isNativeAvailable: boolean;
  nativeShortUrl: string;
  serviceName: string;
  badge: string;
}

export function getNativeShortUrl(longUrl: string): NativeShortInfo | null {
  if (!longUrl) return null;
  const trimmed = longUrl.trim();

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;
    const searchParams = parsed.searchParams;

    // 1. YouTube
    if (host.includes('youtube.com') || host === 'youtu.be') {
      let videoId = '';
      if (host === 'youtu.be') {
        videoId = pathname.replace(/^\/+/, '').split('/')[0];
      } else if (pathname.startsWith('/watch')) {
        videoId = searchParams.get('v') || '';
      } else if (pathname.startsWith('/shorts/')) {
        videoId = pathname.split('/shorts/')[1]?.split('/')[0] || '';
      } else if (pathname.startsWith('/embed/')) {
        videoId = pathname.split('/embed/')[1]?.split('/')[0] || '';
      } else if (pathname.startsWith('/live/')) {
        videoId = pathname.split('/live/')[1]?.split('/')[0] || '';
      }

      if (videoId) {
        // preserve timestamp if present
        const timeParam = searchParams.get('t') || searchParams.get('start');
        const query = timeParam ? `?t=${timeParam}` : '';
        return {
          isNativeAvailable: true,
          nativeShortUrl: `https://youtu.be/${videoId}${query}`,
          serviceName: 'YouTube',
          badge: 'youtu.be',
        };
      }
    }

    // 2. Reddit
    if (host.includes('reddit.com')) {
      const match = pathname.match(/\/comments\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        return {
          isNativeAvailable: true,
          nativeShortUrl: `https://redd.it/${match[1]}`,
          serviceName: 'Reddit',
          badge: 'redd.it',
        };
      }
    }

    // 3. Twitter / X
    if (host.includes('twitter.com') || host === 'x.com') {
      const match = pathname.match(/\/status\/(\d+)/);
      if (match && match[1]) {
        return {
          isNativeAvailable: true,
          nativeShortUrl: `https://x.com/i/status/${match[1]}`,
          serviceName: 'X / Twitter',
          badge: 'x.com',
        };
      }
    }

    // 4. Amazon
    if (host.includes('amazon.')) {
      const match = pathname.match(/\/(?:dp|gp\/product)\/([a-zA-Z0-9]{10})/i);
      if (match && match[1]) {
        return {
          isNativeAvailable: true,
          nativeShortUrl: `https://a.co/d/${match[1]}`,
          serviceName: 'Amazon',
          badge: 'a.co',
        };
      }
    }

    // 5. Spotify
    if (host.includes('spotify.com')) {
      const match = pathname.match(/\/(track|album|playlist|artist|episode)\/([a-zA-Z0-9]+)/);
      if (match && match[1] && match[2]) {
        return {
          isNativeAvailable: true,
          nativeShortUrl: `https://spotify.link/${match[2]}`,
          serviceName: 'Spotify',
          badge: 'spotify.link',
        };
      }
    }
  } catch {
    // If URL parsing fails, return null
  }

  return null;
}

/**
 * Returns a clean display URL without long unwieldy Vercel or cloud provider subdomains
 */
export function formatDisplayShortUrl(
  shortCode: string,
  preferredDomain?: string,
  nativeUrl?: string | null
): string {
  if (nativeUrl) {
    return nativeUrl;
  }

  if (preferredDomain && preferredDomain !== 'auto') {
    return `https://${preferredDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/${shortCode}`;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.host;
    // If host is an internal preview or long vercel URL, provide a clean short alternative option
    if (host.includes('vercel.app') || host.includes('run.app') || host.includes('localhost')) {
      return `https://min.link/${shortCode}`;
    }
    return `${window.location.origin}/${shortCode}`;
  }

  return `https://min.link/${shortCode}`;
}
