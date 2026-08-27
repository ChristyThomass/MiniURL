import React, { useEffect, useState } from 'react';
import { ExternalLink, AlertTriangle, ArrowRight, CheckCircle2, Link2, Home } from 'lucide-react';
import { getLocalStoredLinks, recordLocalClick } from '../utils/clientLinkService';

interface RedirectViewProps {
  shortCode: string;
  onGoHome: () => void;
}

export const RedirectView: React.FC<RedirectViewProps> = ({ shortCode, onGoHome }) => {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'expired' | 'not_found'>('loading');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [title, setTitle] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;

    const performRedirect = async () => {
      // 1. Check local storage first for instantaneous resolution
      const localLinks = getLocalStoredLinks();
      const matched = localLinks.find((l) => l.short_code.toLowerCase() === shortCode.toLowerCase());

      if (matched) {
        if (matched.expires_at && new Date(matched.expires_at).getTime() <= Date.now()) {
          if (!isCancelled) {
            setStatus('expired');
            setErrorMsg(`This link expired on ${new Date(matched.expires_at).toLocaleDateString()}`);
          }
          return;
        }

        if (!isCancelled) {
          setTargetUrl(matched.long_url);
          setTitle(matched.title || null);
          setStatus('redirecting');
          recordLocalClick(matched.short_code);
        }

        // Trigger immediate browser redirection
        setTimeout(() => {
          if (!isCancelled && matched.long_url) {
            window.location.replace(matched.long_url);
          }
        }, 600);
        return;
      }

      // 2. Fetch from backend API
      try {
        const response = await fetch(`/api/resolve/${encodeURIComponent(shortCode)}`);
        if (response.ok) {
          const data = await response.json();
          if (!isCancelled && data.long_url) {
            setTargetUrl(data.long_url);
            setTitle(data.title || null);
            setStatus('redirecting');

            setTimeout(() => {
              if (!isCancelled) {
                window.location.replace(data.long_url);
              }
            }, 600);
          }
        } else if (response.status === 410) {
          const errData = await response.json().catch(() => ({}));
          if (!isCancelled) {
            setStatus('expired');
            setErrorMsg(errData.error || 'This short link has expired.');
          }
        } else {
          if (!isCancelled) {
            setStatus('not_found');
          }
        }
      } catch {
        if (!isCancelled) {
          setStatus('not_found');
        }
      }
    };

    performRedirect();

    return () => {
      isCancelled = true;
    };
  }, [shortCode]);

  const handleManualOpen = () => {
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm text-center">
        {status === 'redirecting' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30">
              <CheckCircle2 className="w-8 h-8 animate-pulse text-indigo-400" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Redirecting you now...</h2>
              <p className="text-sm text-slate-400 mt-1">Taking you to your destination</p>
            </div>

            {/* Target URL Preview Box */}
            <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-left space-y-1">
              {title && <p className="text-xs font-semibold text-indigo-300 truncate">{title}</p>}
              <p className="text-xs font-mono text-slate-300 break-all line-clamp-3">{targetUrl}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleManualOpen}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <span>Open URL Immediately</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onGoHome}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to URL Shortener Home</span>
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="space-y-4 py-6">
            <div className="w-12 h-12 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-300 font-medium">Resolving short link /{shortCode}...</p>
          </div>
        )}

        {status === 'expired' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl mx-auto flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Link Has Expired</h2>
              <p className="text-sm text-slate-400 mt-1">{errorMsg || 'This link is no longer accessible.'}</p>
            </div>

            <button
              type="button"
              onClick={onGoHome}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Back to Shortener</span>
            </button>
          </div>
        )}

        {status === 'not_found' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl mx-auto flex items-center justify-center border border-rose-500/30">
              <Link2 className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Short Link Not Found</h2>
              <p className="text-sm text-slate-400 mt-1">
                The link <code className="bg-slate-900 px-1.5 py-0.5 rounded text-rose-400 font-mono">/{shortCode}</code> does not exist or may have been deleted.
              </p>
            </div>

            <button
              type="button"
              onClick={onGoHome}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Create a New Short Link</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
