import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, BarChart2, Info, Clock, Trash2, Sparkles, Globe, Link2 } from 'lucide-react';
import { ShortenResponse } from '../types';
import { getNativeShortUrl, formatCleanShortUrl } from '../utils/urlFormatter';

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

  // Check if original link has a native short URL (e.g., YouTube -> youtu.be, Reddit -> redd.it, etc.)
  const nativeInfo = getNativeShortUrl(result.long_url);

  // Domain preference state
  const [selectedFormat, setSelectedFormat] = useState<'native' | 'min' | 'app'>(
    nativeInfo.nativeShortUrl ? 'native' : 'min'
  );

  // Calculate active short URL to display & copy
  const activeShortUrl =
    selectedFormat === 'native' && nativeInfo.nativeShortUrl
      ? nativeInfo.nativeShortUrl
      : selectedFormat === 'min'
      ? `https://min.url/${result.short_code}`
      : result.short_url;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeShortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = activeShortUrl;
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

      {/* Main Info Section */}
      <div className="space-y-4">
        {/* Top Header with Badges & Format Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Short Link Ready</span>
            </span>

            {nativeInfo.serviceName && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>{nativeInfo.serviceName} Short Link</span>
              </span>
            )}

            {result.expires_at && (
              <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expires: {new Date(result.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Link Format Toggle Chips */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-medium text-slate-600 dark:text-slate-400">
            {nativeInfo.nativeShortUrl && (
              <button
                type="button"
                onClick={() => setSelectedFormat('native')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedFormat === 'native'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {nativeInfo.serviceName} Link
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedFormat('min')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedFormat === 'min'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              min.url
            </button>
          </div>
        </div>

        {/* Short URL Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {selectedFormat === 'native' && nativeInfo.serviceName ? `${nativeInfo.serviceName} Short Link` : 'Clean Short Link'}
            </p>
            <a
              href={activeShortUrl}
              target="_blank"
              rel="noreferrer"
              className="text-lg sm:text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 hover:underline transition-colors truncate block"
              title="Click to open link"
            >
              {activeShortUrl}
            </a>
          </div>

          {/* Quick Copy & Webpage Actions */}
          <div className="flex items-center gap-2 shrink-0">
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

            <a
              id="btn-visit-short-url"
              href={result.long_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors"
              title="Open destination webpage"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Open Webpage</span>
            </a>
          </div>
        </div>

        {/* Original Long Destination URL */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap px-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Destination: </span>
          <a
            href={result.long_url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline truncate max-w-lg inline-flex items-center gap-1"
            title="Open original destination"
          >
            <span className="truncate">{result.long_url}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
          </a>
        </div>

        {/* Secondary Tool Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {/* QR Code Button */}
            <button
              id="btn-open-qr"
              type="button"
              onClick={() => onOpenQr(activeShortUrl, result.title || result.short_code)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Generate QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>

            {/* Stats Button */}
            <button
              id="btn-open-stats"
              type="button"
              onClick={() => onOpenStats(result.short_code)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="View Click Analytics"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Stats ({result.click_count || 0})</span>
            </button>
          </div>

          {/* Delete Button */}
          {onDelete && (
            <button
              id="btn-delete-result-link"
              type="button"
              onClick={() => onDelete(result.short_code)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Delete Link"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
