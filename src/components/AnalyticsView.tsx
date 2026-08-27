import React, { useState } from 'react';
import {
  BarChart3,
  Globe2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Search,
  Trash2,
  AlertTriangle,
  History,
  Calendar,
} from 'lucide-react';
import { UrlItem, GlobalMetrics } from '../types';
import { getNativeShortUrl, formatCleanShortUrl } from '../utils/urlFormatter';

interface AnalyticsViewProps {
  topLinks: UrlItem[];
  allLinks: UrlItem[];
  metrics: GlobalMetrics | null;
  onOpenQr: (shortUrl: string, title?: string | null) => void;
  onOpenStats: (shortCode: string) => void;
  onDeleteLink: (shortCode: string) => void;
  onRefresh: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  allLinks,
  metrics,
  onOpenQr,
  onOpenStats,
  onDeleteLink,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (shortUrl: string, code: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shortUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filteredLinks = allLinks.filter((link) => {
    const q = searchTerm.toLowerCase();
    return (
      link.short_code.toLowerCase().includes(q) ||
      link.long_url.toLowerCase().includes(q) ||
      (link.title && link.title.toLowerCase().includes(q))
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getDomain = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return 'external link';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Global Metrics KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Short Links</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics?.totalUrls ?? 0}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Globe2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Non-Expired Links</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{metrics?.activeUrls ?? 0}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. History of Main Links */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">History of Main Links</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chronological history of shortened main destination URLs and their activity</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Showing latest {Math.min(allLinks.length, 5)} of {allLinks.length} entries
          </div>
        </div>

        {allLinks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            No shortened links in history yet. Shorten your first main link above!
          </div>
        ) : (
          <div className="space-y-3.5">
            {allLinks.slice(0, 5).map((link, index) => {
              const domain = getDomain(link.long_url);
              return (
                <div
                  key={link.short_code}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Main Destination Link Focus */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <Globe2 className="w-3 h-3 text-slate-400" />
                          <span>{domain}</span>
                        </span>

                        {link.title && (
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-200/70 dark:bg-slate-700/80 px-2 py-0.5 rounded-md truncate max-w-xs">
                            {link.title}
                          </span>
                        )}

                        {link.is_expired && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                        )}
                      </div>

                      {/* Prominent Main Destination Link */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <a
                          href={link.long_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline break-all inline-flex items-center gap-1.5 group"
                          title="Open Main Destination URL"
                        >
                          <span className="line-clamp-1">{link.long_url}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0 text-slate-400 group-hover:text-indigo-500" />
                        </a>
                      </div>
                    </div>

                    {/* Actions & Metrics */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{link.click_count}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">clicks</span>
                      </div>

                      <button
                        onClick={() => onOpenStats(link.short_code)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="View Detailed Analytics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onOpenQr(link.short_url, link.title)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="View QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteLink(link.short_code)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata and Short Link reference */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Short Link:</span>
                      {(() => {
                        const native = getNativeShortUrl(link.long_url);
                        const displayUrl = native.nativeShortUrl || link.native_short_url || `https://min.url/${link.short_code}`;
                        return (
                          <>
                            <a
                              href={displayUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{displayUrl}</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                            <button
                              onClick={() => handleCopy(displayUrl, link.short_code)}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 ml-1 cursor-pointer"
                              title="Copy clean short link"
                            >
                              {copiedCode === link.short_code ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedCode === link.short_code ? 'Copied' : 'Copy'}</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(link.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. All Links Explorer Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">All Short Links</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage, inspect, and copy all generated short links</p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by code or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {filteredLinks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
            {searchTerm ? 'No links match your search query.' : 'No links created yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Short Link</th>
                  <th className="px-4 py-3">Original Destination</th>
                  <th className="px-4 py-3">Clicks</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {filteredLinks.map((link) => {
                  const isExpired = link.is_expired;
                  const native = getNativeShortUrl(link.long_url);
                  const cleanUrl = native.nativeShortUrl || link.native_short_url || `https://min.url/${link.short_code}`;

                  return (
                    <tr key={link.short_code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Short URL & Alias */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={cleanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1"
                            title={cleanUrl}
                          >
                            <span>{native.nativeShortUrl ? native.nativeShortUrl.replace('https://', '') : `/${link.short_code}`}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        </div>
                        {link.title && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[160px]">
                            {link.title}
                          </div>
                        )}
                      </td>

                      {/* Long URL */}
                      <td className="px-4 py-3.5">
                        <div className="truncate max-w-xs font-mono text-[11px] text-slate-700 dark:text-slate-300" title={link.long_url}>
                          {link.long_url}
                        </div>
                      </td>

                      {/* Click Count */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {link.click_count}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {new Date(link.created_at).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/60 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(cleanUrl, link.short_code)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Copy Short URL"
                          >
                            {copiedCode === link.short_code ? (
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Visit */}
                          <a
                            href={cleanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Visit Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* QR Code */}
                          <button
                            onClick={() => onOpenQr(cleanUrl, link.title || link.short_code)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Generate QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Stats */}
                          <button
                            onClick={() => onOpenStats(link.short_code)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Detailed Stats"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteLink(link.short_code)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Short Link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
