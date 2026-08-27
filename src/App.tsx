import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ShortenForm } from './components/ShortenForm';
import { ResultCard } from './components/ResultCard';
import { AnalyticsView } from './components/AnalyticsView';
import { StatsModal } from './components/StatsModal';
import { QrModal } from './components/QrModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ShortenResponse, UrlItem, GlobalMetrics } from './types';
import {
  getLocalStoredLinks,
  saveLocalStoredLinks,
  deleteLocalLink,
  computeLocalMetrics,
  recordLocalClick,
} from './utils/clientLinkService';
import { ShieldCheck, Zap, Database, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'shortener' | 'history'>('shortener');
  const [latestResult, setLatestResult] = useState<ShortenResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme Management (Light / Dark mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('miniurl_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('miniurl_theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Analytics & Links State
  const [topLinks, setTopLinks] = useState<UrlItem[]>([]);
  const [allLinks, setAllLinks] = useState<UrlItem[]>([]);
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);

  // Modal States
  const [selectedStatsCode, setSelectedStatsCode] = useState<string | null>(null);
  const [selectedQrUrl, setSelectedQrUrl] = useState<{ url: string; title?: string | null } | null>(null);
  const [deleteTargetCode, setDeleteTargetCode] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Client-side fallback check on mount for short code URL navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname.replace(/^\/+/, '');
    if (pathname && !pathname.includes('.') && pathname !== 'api' && pathname !== 'history' && pathname !== 'shortener') {
      // Check local storage or API
      const localLinks = getLocalStoredLinks();
      const matched = localLinks.find((l) => l.short_code === pathname);
      if (matched) {
        if (!matched.expires_at || new Date(matched.expires_at).getTime() > Date.now()) {
          recordLocalClick(pathname);
          window.location.href = matched.long_url;
        }
      }
    }
  }, []);

  // Fetch metrics and links from backend with seamless fallback
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let fetchedTop: UrlItem[] = [];
      let fetchedAll: UrlItem[] = [];
      let fetchedMetrics: GlobalMetrics | null = null;

      // 1. Try API endpoints
      try {
        const [topRes, linksRes] = await Promise.all([
          fetch('/api/analytics/top?limit=5'),
          fetch('/api/links?limit=50'),
        ]);

        if (topRes.ok) {
          const topData = await topRes.json();
          fetchedTop = topData.top_links || [];
          fetchedMetrics = topData.metrics || null;
        }

        if (linksRes.ok) {
          const linksData = await linksRes.json();
          fetchedAll = linksData.links || [];
        }
      } catch (err) {
        console.warn('API data fetch failed, using local storage cache:', err);
      }

      // 2. Merge with locally stored links for seamless persistence
      const localLinks = getLocalStoredLinks();
      const combinedMap = new Map<string, UrlItem>();

      // Put server links
      fetchedAll.forEach((l) => combinedMap.set(l.short_code, l));
      // Put local links if not already present
      localLinks.forEach((l) => {
        if (!combinedMap.has(l.short_code)) {
          combinedMap.set(l.short_code, l);
        }
      });

      const mergedList = Array.from(combinedMap.values());
      // Sort by created_at or id
      mergedList.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

      // Save combined back to local storage
      saveLocalStoredLinks(mergedList);

      setAllLinks(mergedList);

      // Compute top links
      const sortedByClicks = [...mergedList].sort((a, b) => (b.click_count || 0) - (a.click_count || 0)).slice(0, 5);
      setTopLinks(fetchedTop.length > 0 ? fetchedTop : sortedByClicks);

      // Compute metrics
      setMetrics(fetchedMetrics || computeLocalMetrics(mergedList));
    } catch (err) {
      console.error('Error in link synchronization:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle successful URL shortening
  const handleShortened = (result: ShortenResponse) => {
    setLatestResult(result);
    fetchData();
  };

  // Trigger delete modal
  const handleDeleteLink = (shortCode: string) => {
    setDeleteTargetCode(shortCode);
  };

  // Execute confirmed deletion
  const handleConfirmDelete = async (shortCode: string) => {
    try {
      await fetch(`/api/links/${shortCode}`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // Ignore network errors for local deletion
    }

    // Always delete from local storage
    deleteLocalLink(shortCode);

    if (latestResult?.short_code === shortCode) {
      setLatestResult(null);
    }

    // Optimistic UI updates
    setAllLinks((prev) => prev.filter((item) => item.short_code !== shortCode));
    setTopLinks((prev) => prev.filter((item) => item.short_code !== shortCode));

    showToast(`Short link /${shortCode} was permanently deleted.`);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-200 transition-colors duration-200">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        metrics={metrics}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {currentTab === 'shortener' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Shortener Form */}
            <ShortenForm
              onShortened={handleShortened}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />

            {/* Generated Short URL Result Banner */}
            {latestResult && (
              <ResultCard
                result={latestResult}
                onOpenQr={(url, title) => setSelectedQrUrl({ url, title })}
                onOpenStats={(code) => setSelectedStatsCode(code)}
                onDelete={handleDeleteLink}
              />
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Base62 Compact Encoding</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Cryptographically generated 6-7 character unique identifiers with duplicate detection and collision avoidance.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">SQLite Persistence</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Fast embedded relational database with indexed lookup tables and an abstracted data layer ready for PostgreSQL.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Security & Rate Limiting</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Strict URL format validation, protocol checking, IP rate-limiting, and automatic link expiration management.
                </p>
              </div>
            </div>

            {/* Quick Preview of Recent Links in Shortener Tab */}
            {allLinks.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Recently Shortened Links</h3>
                  <button
                    onClick={() => setCurrentTab('history')}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    View All History &rarr;
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allLinks.slice(0, 4).map((link) => (
                    <div key={link.short_code} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={link.short_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            /{link.short_code}
                          </a>
                          {link.title && <span className="text-slate-500 dark:text-slate-400 font-medium truncate">({link.title})</span>}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 truncate text-[11px] mt-0.5 font-mono">{link.long_url}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {link.click_count} {link.click_count === 1 ? 'click' : 'clicks'}
                        </span>
                        <button
                          onClick={() => setSelectedStatsCode(link.short_code)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold text-[11px] cursor-pointer"
                        >
                          Stats
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <AnalyticsView
            topLinks={topLinks}
            allLinks={allLinks}
            metrics={metrics}
            onOpenQr={(url, title) => setSelectedQrUrl({ url, title })}
            onOpenStats={(code) => setSelectedStatsCode(code)}
            onDeleteLink={handleDeleteLink}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 mt-12 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">MiniURL Shortener</span>
            <span>•</span>
            <span>Node.js + Express + SQLite</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <span>Fast, Secure & Self-Contained</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <StatsModal
        shortCode={selectedStatsCode}
        onClose={() => setSelectedStatsCode(null)}
        onDelete={handleDeleteLink}
      />

      <QrModal
        url={selectedQrUrl?.url || null}
        title={selectedQrUrl?.title}
        onClose={() => setSelectedQrUrl(null)}
      />

      <DeleteConfirmModal
        shortCode={deleteTargetCode}
        onClose={() => setDeleteTargetCode(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

