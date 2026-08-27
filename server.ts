import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './db/index';
import { shortenRouter } from './routes/shorten';
import { statsRouter } from './routes/stats';
import { redirectRouter } from './routes/redirect';

dotenv.config();

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);

  // Initialize SQLite database
  await initDatabase();

  // Middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'URL Shortener API',
    });
  });

  // Mount API routes
  app.use(shortenRouter);
  app.use(statsRouter);

  // Mount redirection handler for /:short_code
  // Handled BEFORE Vite SPA fallback so short codes redirect properly
  app.use(redirectRouter);

  // Setup Vite Dev Middleware or Static File Serving for Production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`URL Shortener server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
