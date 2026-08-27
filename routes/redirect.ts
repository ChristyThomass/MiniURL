import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { urlModel } from '../db/index';

export const redirectRouter = Router();

// Reserved paths that should never be treated as short codes
const RESERVED_PATHS = new Set([
  'api',
  'src',
  'assets',
  'node_modules',
  'favicon.ico',
  'robots.txt',
  'index.html',
  '@vite',
  '@fs',
  '@id',
]);

redirectRouter.get('/:short_code', (req: Request, res: Response, next: NextFunction): void => {
  const { short_code } = req.params;

  // Ignore reserved words and static file requests
  if (!short_code || RESERVED_PATHS.has(short_code.toLowerCase()) || short_code.includes('.')) {
    return next();
  }

  try {
    const record = urlModel.findByShortCode(short_code);

    if (!record) {
      // Return 404
      res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>404 - Link Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-slate-50 text-slate-800 flex items-center justify-center min-h-screen p-4 font-sans">
            <div class="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
              <div class="inline-flex items-center justify-center w-14 h-14 bg-rose-50 text-rose-500 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-slate-900 mb-2">Short URL Not Found</h1>
              <p class="text-slate-600 text-sm mb-6">The short link <code class="bg-slate-100 px-2 py-0.5 rounded text-rose-600 font-mono font-medium">/${short_code}</code> does not exist or may have been deleted.</p>
              <a href="/" class="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm">
                Create a New Short Link
              </a>
            </div>
          </body>
        </html>
      `);
      return;
    }

    // Check expiration
    if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
      res.status(410).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>410 - Link Expired</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-slate-50 text-slate-800 flex items-center justify-center min-h-screen p-4 font-sans">
            <div class="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
              <div class="inline-flex items-center justify-center w-14 h-14 bg-amber-50 text-amber-600 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-slate-900 mb-2">Link Has Expired</h1>
              <p class="text-slate-600 text-sm mb-6">This short link expired on <strong>${new Date(record.expires_at).toLocaleString()}</strong> and is no longer active.</p>
              <a href="/" class="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm">
                Return to Homepage
              </a>
            </div>
          </body>
        </html>
      `);
      return;
    }

    // Extract telemetry (anonymize IP with salt/hash)
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
    const ipHash = clientIp ? crypto.createHash('sha256').update(clientIp + 'url-salt').digest('hex').substring(0, 16) : null;
    const userAgent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;

    // Asynchronously record click count and analytics
    urlModel.recordClick(short_code, {
      ipHash,
      userAgent: typeof userAgent === 'string' ? userAgent.substring(0, 255) : null,
      referrer: typeof referrer === 'string' ? referrer.substring(0, 255) : null,
    });

    // 302 Found Redirect to original target
    res.redirect(302, record.long_url);
  } catch (error) {
    console.error('Error during redirection:', error);
    next(error);
  }
});
