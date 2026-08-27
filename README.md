# 🔗 MiniURL — Fast Base62 URL Shortener & Analytics

A lightweight, high-performance URL shortener built with **Node.js + Express**, **SQLite**, and **React**. It features cryptographic Base62 compact encoding, robust input sanitization, graceful duplicate URL reuse, expiration date enforcement, rate limiting, and real-time click analytics with QR code generation.

---

## 📸 Preview

```
+-----------------------------------------------------------------------------------+
|  MiniURL                     [Links: 12 • Clicks: 142]   [Shortener] [Analytics]  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   ✨ Shorten a Long Link                                                          |
|   [ https://github.com/my-org/my-super-long-repository-link-2026                 ] |
|   [ Customize alias & expiration date v ]                                         |
|   [ Shorten Link -> ]                                                             |
|                                                                                   |
|   -----------------------------------------------------------------------------   |
|   Short Link Ready: https://miniurl.dev/7k8X2q          [Copy Link] [QR] [Stats]  |
|   Target: https://github.com/my-org/my-super-long-repository-link-2026           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|   🏆 Top 5 Most Clicked Links                                                     |
|   1. /blog-launch  ████████████████████ 84 clicks                                 |
|   2. /docs         ██████████           42 clicks                                 |
+-----------------------------------------------------------------------------------+
```
*(Screenshot / GIF demo placeholder)*

---

## 🚀 Key Features

- **Base62 Compact Encoding**: Generates 6-7 character alphanumeric unique codes with collision resolution.
- **Graceful Duplicate Handling**: Automatically returns existing short codes for duplicate long URLs unless custom settings are specified.
- **Click Tracking & Telemetry**: Captures timestamps, referrer strings, and user agents with anonymized IP hashing.
- **Link Lifetime & Expiration**: Set link expiry to 1 hour, 24 hours, 7 days, 30 days, custom dates, or never. Expired links return `410 Gone`.
- **Custom Short Aliases**: Supports branded custom vanity codes (e.g. `/my-campaign`).
- **Real-Time Analytics Dashboard**: Displays top 5 most-clicked links, total global metrics, and detailed click logs.
- **Integrated QR Code Generator**: One-click QR code display and PNG download.
- **Rate Limiting**: Built-in IP rate limiting on `/api/shorten` to prevent abuse.
- **SQLite Persistence**: Embedded database with clean data layer designed for easy PostgreSQL migration.

---

## 📁 Project Architecture

```text
├── db/
│   ├── index.ts        # SQLite connection, data access model, migrations
│   └── schema.sql      # Database schema (urls, clicks, indexes)
├── routes/
│   ├── shorten.ts      # POST /api/shorten (rate limited, duplicate check)
│   ├── redirect.ts     # GET /:short_code (302 redirect, telemetry logging)
│   └── stats.ts        # GET /api/stats/:short_code & GET /api/analytics/top
├── utils/
│   ├── base62.ts       # Base62 encoder, decoder, random generator
│   └── validator.ts    # URL & ISO date validation and sanitization
├── src/
│   ├── components/     # React UI components (Form, Analytics, Modals)
│   ├── App.tsx         # Main frontend application
│   └── types.ts        # Shared TypeScript interfaces
├── server.ts           # Express server entry point
├── Dockerfile          # Production multi-stage container file
├── .env.example        # Environment variable template
└── LICENSE             # MIT License
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or bun

### Local Development

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build & Run**:
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

```bash
# Build the Docker image
docker build -t miniurl .

# Run container on port 3000
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name miniurl-app miniurl
```

---

## 📡 API Reference & curl Examples

### 1. Shorten a URL
Creates a new short URL or returns the existing duplicate code.

- **Endpoint**: `POST /api/shorten`
- **Headers**: `Content-Type: application/json`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP",
    "customCode": "mdn-http",
    "expiresAt": "2026-12-31T23:59:59Z",
    "title": "MDN HTTP Reference"
  }'
```

**Example Response (`201 Created` / `200 OK`):**
```json
{
  "short_code": "mdn-http",
  "short_url": "http://localhost:3000/mdn-http",
  "long_url": "https://developer.mozilla.org/en-US/docs/Web/HTTP",
  "title": "MDN HTTP Reference",
  "created_at": "2026-08-27 09:25:00",
  "expires_at": "2026-12-31T23:59:59.000Z",
  "click_count": 0,
  "is_duplicate": false,
  "message": "Short URL created successfully."
}
```

---

### 2. Follow / Redirect Short URL
Resolves the short code, increments the click counter, logs analytics, and issues a 302 redirect.

- **Endpoint**: `GET /:short_code`

**Example Request:**
```bash
curl -i http://localhost:3000/mdn-http
```

**Example Response (`302 Found`):**
```http
HTTP/1.1 302 Found
Location: https://developer.mozilla.org/en-US/docs/Web/HTTP
```

---

### 3. Get Short URL Stats
Fetches total clicks, creation date, expiry timestamp, and recent click logs.

- **Endpoint**: `GET /api/stats/:short_code`

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/stats/mdn-http
```

**Example Response (`200 OK`):**
```json
{
  "short_code": "mdn-http",
  "short_url": "http://localhost:3000/mdn-http",
  "long_url": "https://developer.mozilla.org/en-US/docs/Web/HTTP",
  "title": "MDN HTTP Reference",
  "click_count": 14,
  "created_at": "2026-08-27 09:25:00",
  "expires_at": "2026-12-31T23:59:59.000Z",
  "is_expired": false,
  "recent_clicks": [
    {
      "id": 1,
      "clicked_at": "2026-08-27 09:26:12",
      "user_agent": "Mozilla/5.0 ...",
      "referrer": "https://t.co"
    }
  ]
}
```

---

### 4. Get Top Analytics & Global Metrics
Returns system-wide metrics and the top 5 most clicked links.

- **Endpoint**: `GET /api/analytics/top?limit=5`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/analytics/top?limit=5"
```

**Example Response (`200 OK`):**
```json
{
  "metrics": {
    "totalUrls": 12,
    "totalClicks": 142,
    "activeUrls": 11
  },
  "top_links": [
    {
      "short_code": "mdn-http",
      "short_url": "http://localhost:3000/mdn-http",
      "long_url": "https://developer.mozilla.org/en-US/docs/Web/HTTP",
      "click_count": 84
    }
  ]
}
```

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).
