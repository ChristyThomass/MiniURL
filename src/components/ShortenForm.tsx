import React, { useState } from 'react';
import { Link2, Sparkles, ChevronDown, ChevronUp, Clock, Tag, Wand2, AlertCircle, ArrowRight } from 'lucide-react';
import { ShortenResponse } from '../types';
import { createLocalShortLink } from '../utils/clientLinkService';

interface ShortenFormProps {
  onShortened: (data: ShortenResponse) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export const ShortenForm: React.FC<ShortenFormProps> = ({
  onShortened,
  isSubmitting,
  setIsSubmitting,
}) => {
  const [longUrl, setLongUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiryPreset, setExpiryPreset] = useState<'never' | '1h' | '24h' | '7d' | '30d' | 'custom'>('never');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const calculateExpiresAt = (): string | undefined => {
    const now = new Date();
    switch (expiryPreset) {
      case '1h':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'custom':
        return customExpiryDate ? new Date(customExpiryDate).toISOString() : undefined;
      case 'never':
      default:
        return undefined;
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLongUrl(text.trim());
        setErrorMessage(null);
      }
    } catch {
      // Ignore clipboard read error if permission denied
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUrl = longUrl.trim();
    if (!trimmedUrl) {
      setErrorMessage('Please enter or paste a valid URL.');
      return;
    }

    let calculatedExpiresAt: string | undefined;
    try {
      calculatedExpiresAt = calculateExpiresAt();
    } catch {
      setErrorMessage('Invalid expiration date format.');
      return;
    }

    if (expiryPreset === 'custom' && !customExpiryDate) {
      setErrorMessage('Please pick an expiration date/time or select "Never".');
      return;
    }

    setIsSubmitting(true);
    try {
      let data: any = null;
      try {
        const response = await fetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: trimmedUrl,
            customCode: customCode.trim() || undefined,
            title: title.trim() || undefined,
            expiresAt: calculatedExpiresAt,
          }),
        });

        if (response.ok) {
          data = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          // If server returned a business validation error like duplicate custom code, throw it
          if (response.status === 400 || response.status === 409) {
            throw new Error(errData.error || `Failed to shorten URL (HTTP ${response.status})`);
          }
          // For 404 or 500, fallback to local storage
          console.warn('Server API failed with status', response.status, '- Falling back to client-side link generator');
        }
      } catch (fetchErr: any) {
        if (fetchErr.message && (fetchErr.message.includes('already in use') || fetchErr.message.includes('Invalid'))) {
          throw fetchErr;
        }
        console.warn('API fetch error, using local fallback:', fetchErr);
      }

      // If server didn't succeed, generate locally
      if (!data) {
        data = createLocalShortLink({
          url: trimmedUrl,
          customCode: customCode.trim() || undefined,
          title: title.trim() || undefined,
          expiresAt: calculatedExpiresAt,
        });
      }

      onShortened(data);
      setLongUrl('');
      setCustomCode('');
      setTitle('');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 transition-colors">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Shorten a Long Link
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Generate a fast, compact Base62 link with real-time click tracking, expiry dates, and QR codes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main URL Input */}
        <div>
          <label htmlFor="input-long-url" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Target Destination URL
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
              <Link2 className="w-5 h-5" />
            </div>
            <input
              id="input-long-url"
              type="text"
              required
              placeholder="https://example.com/very-long-article-or-campaign-url?ref=newsletter"
              value={longUrl}
              onChange={(e) => {
                setLongUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="w-full pl-11 pr-24 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-mono"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              {longUrl ? (
                <button
                  type="button"
                  onClick={() => setLongUrl('')}
                  className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium rounded transition-colors cursor-pointer"
                >
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2.5 py-1 text-xs bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Paste
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div>
          <button
            type="button"
            id="toggle-advanced-options"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <span>{showAdvanced ? 'Hide advanced settings' : 'Customize alias & expiration date'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Advanced Options Panel */}
        {showAdvanced && (
          <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 space-y-4 text-sm animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Custom Alias */}
              <div>
                <label htmlFor="input-custom-alias" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  Custom Short Alias (Optional)
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 px-2.5 py-2 rounded-l-lg text-xs text-slate-500 dark:text-slate-400 font-mono">
                    /
                  </span>
                  <input
                    id="input-custom-alias"
                    type="text"
                    placeholder="my-cool-link"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    maxLength={30}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 rounded-r-lg text-xs text-slate-800 dark:text-slate-200 font-mono transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">3-30 letters, numbers, or dashes.</p>
              </div>

              {/* Title / Description */}
              <div>
                <label htmlFor="input-link-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  Link Title or Label (Optional)
                </label>
                <input
                  id="input-link-title"
                  type="text"
                  placeholder="e.g. Q3 Marketing Campaign"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 transition-all"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">For organizing your links in analytics.</p>
              </div>
            </div>

            {/* Expiration Settings */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Link Expiry Lifetime
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'never', label: 'Never Expire' },
                  { key: '1h', label: '1 Hour' },
                  { key: '24h', label: '24 Hours' },
                  { key: '7d', label: '7 Days' },
                  { key: '30d', label: '30 Days' },
                  { key: 'custom', label: 'Custom Date' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setExpiryPreset(preset.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      expiryPreset === preset.key
                        ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {expiryPreset === 'custom' && (
                <div className="mt-3 max-w-xs">
                  <input
                    type="datetime-local"
                    value={customExpiryDate}
                    onChange={(e) => setCustomExpiryDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            id="btn-submit-shorten"
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200 dark:shadow-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Shortening URL...</span>
              </>
            ) : (
              <>
                <span>Shorten Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
