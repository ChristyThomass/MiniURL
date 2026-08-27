import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, BarChart2, Info, Clock, Trash2 } from 'lucide-react';
import { ShortenResponse } from '../types';

interface ResultCardProps {
  result: ShortenResponse;
  onOpenQr: (shortUrl: string, title?: string | null) => void;
  onOpenStats: (shortCode: string) => void;
  onDelete?: (shortCode: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onOpenQr,
  onOpenStats,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);

  // Ensure short_url uses the current browser origin if available
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const displayShortUrl =
    origin && !result.short_url.startsWith(origin)
      ? `${origin}/${result.short_code}`
      : result.short_url;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayShortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = displayShortUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 overflow-hidden transition-colors">
      {/* Duplicate notice if existing URL returned */}
      {result.is_duplicate && (
        <div className="mb-4 flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>This URL was already shortened previously. Returning existing short link.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: URLs & Meta */}
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
              Short Link Ready
            </span>
            {result.expires_at && (
              <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expires: {new Date(result.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Short URL Banner */}
          <div className="flex items-center gap-2">
            <a
              href={displayShortUrl}
              target="_blank"
              rel="noreferrer"
              className="text-lg sm:text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 hover:underline transition-colors truncate inline-flex items-center gap-1.5"
              title="Click to test redirect"
            >
              <span>{displayShortUrl}</span>
              <ExternalLink className="w-4 h-4 opacity-75" />
            </a>
          </div>

          {/* Original Long URL */}
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Destination: </span>
            <a
              href={result.long_url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline truncate max-w-lg inline-flex items-center gap-1"
              title="Open destination directly"
            >
              <span className="truncate">{result.long_url}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
            </a>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Button */}
          <button
            id="btn-copy-short-url"
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100 dark:shadow-none'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>

          {/* Visit Target Button */}
          <a
            id="btn-visit-short-url"
            href={result.long_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            title="Open destination webpage"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
            <span>Open Webpage</span>
          </a>

          {/* QR Code Button */}
          <button
            id="btn-open-qr"
            type="button"
            onClick={() => onOpenQr(displayShortUrl, result.title || result.short_code)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title="Generate QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          {/* Stats Button */}
          <button
            id="btn-open-stats"
            type="button"
            onClick={() => onOpenStats(result.short_code)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title="View Real-time Click Analytics"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Stats ({result.click_count || 0})</span>
          </button>

          {/* Delete Button */}
          {onDelete && (
            <button
              id="btn-delete-result-link"
              type="button"
              onClick={() => onDelete(result.short_code)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Delete Short Link"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
