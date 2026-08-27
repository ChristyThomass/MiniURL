import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { urlModel } from '../db/index';
import { generateRandomCode, isValidCustomCode } from '../utils/base62';
import { validateUrl, validateExpiresAt } from '../utils/validator';

export const shortenRouter = Router();

// Rate limiter for /api/shorten
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 mins
const maxRequests = Number(process.env.RATE_LIMIT_MAX) || 100; // 100 requests per 15 min

export const shortenLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many URL shortening requests from this IP. Please try again later.',
    retryAfterMinutes: Math.ceil(windowMs / (60 * 1000)),
  },
});

/**
 * POST /api/shorten
 * Body: {
 *   url: string,
 *   customCode?: string,
 *   expiresAt?: string,
 *   title?: string
 * }
 */
shortenRouter.post('/api/shorten', shortenLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, customCode, expiresAt, title } = req.body || {};

    // 1. Validate Long URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid || !urlValidation.normalized) {
      res.status(400).json({
        error: urlValidation.error || 'Invalid long URL provided.',
      });
      return;
    }
    const normalizedLongUrl = urlValidation.normalized;

    // 2. Validate Expiry Date
    const expiryValidation = validateExpiresAt(expiresAt);
    if (!expiryValidation.valid) {
      res.status(400).json({
        error: expiryValidation.error || 'Invalid expiration date.',
      });
      return;
    }

    // 3. Graceful Duplicate Handling:
    // If no custom code is specified and no custom expiry is set, check if longUrl already exists
    if (!customCode && !expiryValidation.date) {
      const existing = urlModel.findByLongUrl(normalizedLongUrl);
      if (existing) {
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const shortUrl = `${protocol}://${host}/${existing.short_code}`;

        res.status(200).json({
          short_code: existing.short_code,
          short_url: shortUrl,
          long_url: existing.long_url,
          title: existing.title,
          created_at: existing.created_at,
          expires_at: existing.expires_at,
          click_count: existing.click_count,
          is_duplicate: true,
          message: 'Existing short URL retrieved.',
        });
        return;
      }
    }

    // 4. Handle Short Code assignment
    let finalCode = '';
    if (customCode) {
      const trimmedCustom = String(customCode).trim();
      if (!isValidCustomCode(trimmedCustom)) {
        res.status(400).json({
          error: 'Custom short code must be 3-30 alphanumeric characters (letters, numbers, hyphens, underscores).',
        });
        return;
      }

      // Check if custom code already taken
      const existingCode = urlModel.findByShortCode(trimmedCustom);
      if (existingCode) {
        res.status(409).json({
          error: `The custom code '${trimmedCustom}' is already in use. Please choose another.`,
        });
        return;
      }

      finalCode = trimmedCustom;
    } else {
      // Generate unique Base62 code (6-7 chars)
      let attempts = 0;
      let generated = '';
      while (attempts < 10) {
        generated = generateRandomCode(6);
        const existing = urlModel.findByShortCode(generated);
        if (!existing) {
          finalCode = generated;
          break;
        }
        attempts++;
      }

      if (!finalCode) {
        // Fallback to 7 chars
        finalCode = generateRandomCode(7);
      }
    }

    // 5. Store in database
    const newRecord = urlModel.create({
      shortCode: finalCode,
      longUrl: normalizedLongUrl,
      title: title ? String(title).trim() : null,
      expiresAt: expiryValidation.date || null,
    });

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const shortUrl = `${protocol}://${host}/${newRecord.short_code}`;

    res.status(201).json({
      short_code: newRecord.short_code,
      short_url: shortUrl,
      long_url: newRecord.long_url,
      title: newRecord.title,
      created_at: newRecord.created_at,
      expires_at: newRecord.expires_at,
      click_count: newRecord.click_count,
      is_duplicate: false,
      message: 'Short URL created successfully.',
    });
  } catch (error: any) {
    console.error('Error in /api/shorten:', error);
    res.status(500).json({
      error: 'An internal server error occurred while creating the short URL.',
    });
  }
});
