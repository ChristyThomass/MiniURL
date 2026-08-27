import { Router, Request, Response } from 'express';
import { urlModel } from '../db/index';

export const statsRouter = Router();

/**
 * GET /api/resolve/:short_code
 * Quick resolver endpoint that logs telemetry and returns target long_url for client-side redirection
 */
statsRouter.get('/api/resolve/:short_code', (req: Request, res: Response): void => {
  try {
    const { short_code } = req.params;
    if (!short_code) {
      res.status(400).json({ error: 'Short code is required.' });
      return;
    }

    const record = urlModel.findByShortCode(short_code);
    if (!record) {
      res.status(404).json({ error: 'Short URL not found.' });
      return;
    }

    // Check expiration
    if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
      res.status(410).json({ error: 'Short URL has expired.', is_expired: true, expires_at: record.expires_at });
      return;
    }

    // Record click count
    const userAgent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;
    urlModel.recordClick(short_code, {
      userAgent: typeof userAgent === 'string' ? userAgent.substring(0, 255) : null,
      referrer: typeof referrer === 'string' ? referrer.substring(0, 255) : null,
    });

    res.json({
      success: true,
      short_code: record.short_code,
      long_url: record.long_url,
      title: record.title,
    });
  } catch (error) {
    console.error('Error resolving short code:', error);
    res.status(500).json({ error: 'Failed to resolve short code.' });
  }
});


/**
 * GET /api/stats/:short_code
 * Returns click_count, created_at, long_url, expires_at, and recent click analytics.
 */
statsRouter.get('/api/stats/:short_code', (req: Request, res: Response): void => {
  try {
    const { short_code } = req.params;
    if (!short_code) {
      res.status(400).json({ error: 'Short code is required.' });
      return;
    }

    const stats = urlModel.getStats(short_code);
    if (!stats.url) {
      res.status(404).json({ error: `Short URL with code '${short_code}' not found.` });
      return;
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const shortUrl = `${protocol}://${host}/${stats.url.short_code}`;

    res.json({
      short_code: stats.url.short_code,
      short_url: shortUrl,
      long_url: stats.url.long_url,
      title: stats.url.title,
      click_count: stats.url.click_count,
      created_at: stats.url.created_at,
      expires_at: stats.url.expires_at,
      is_expired: stats.isExpired,
      recent_clicks: stats.recentClicks.map(c => ({
        id: c.id,
        clicked_at: c.clicked_at,
        user_agent: c.user_agent,
        referrer: c.referrer,
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error while fetching statistics.' });
  }
});

/**
 * GET /api/analytics/top
 * Returns top 5 most-clicked links and global metrics.
 */
statsRouter.get('/api/analytics/top', (req: Request, res: Response): void => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const topLinks = urlModel.getTopLinks(limit);
    const metrics = urlModel.getGlobalMetrics();

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

    const formattedLinks = topLinks.map(link => ({
      short_code: link.short_code,
      short_url: `${protocol}://${host}/${link.short_code}`,
      long_url: link.long_url,
      title: link.title,
      click_count: link.click_count,
      created_at: link.created_at,
      expires_at: link.expires_at,
      is_expired: !!link.expires_at && new Date(link.expires_at).getTime() < Date.now(),
    }));

    res.json({
      metrics,
      top_links: formattedLinks,
    });
  } catch (error) {
    console.error('Error fetching top analytics:', error);
    res.status(500).json({ error: 'Internal server error while fetching analytics.' });
  }
});

/**
 * GET /api/links
 * Returns recent links for the dashboard list.
 */
statsRouter.get('/api/links', (req: Request, res: Response): void => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const links = urlModel.getAllLinks(limit);

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

    const formattedLinks = links.map(link => ({
      short_code: link.short_code,
      short_url: `${protocol}://${host}/${link.short_code}`,
      long_url: link.long_url,
      title: link.title,
      click_count: link.click_count,
      created_at: link.created_at,
      expires_at: link.expires_at,
      is_expired: !!link.expires_at && new Date(link.expires_at).getTime() < Date.now(),
    }));

    res.json({
      links: formattedLinks,
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Internal server error while fetching links.' });
  }
});

/**
 * DELETE /api/links/:short_code
 * Delete short URL.
 */
statsRouter.delete('/api/links/:short_code', (req: Request, res: Response): void => {
  try {
    const { short_code } = req.params;
    const deleted = urlModel.deleteByShortCode(short_code);
    if (!deleted) {
      res.status(404).json({ error: 'Link not found or already deleted.' });
      return;
    }
    res.json({ success: true, message: `Link ${short_code} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Internal server error while deleting link.' });
  }
});
