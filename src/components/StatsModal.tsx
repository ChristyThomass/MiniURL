import React, { useEffect, useState } from 'react';
import { X, BarChart3, Clock, Globe, ArrowUpRight, Activity, Calendar, ShieldAlert, Trash2 } from 'lucide-react';
import { UrlStatsResponse } from '../types';

interface StatsModalProps {
  shortCode: string | null;
  onClose: () => void;
  onDelete?: (shortCode: string) => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ shortCode, onClose, onDelete }) => {
  const [stats, setStats] = useState<UrlStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shortCode) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stats/${shortCode}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load link statistics.');
        }
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Error fetching statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [shortCode]);

  if (!shortCode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Link Analytics</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">/{shortCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Loading analytics data...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : stats ? (
            <>
              {/* Destination URL Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Destination</span>
                  <a
                    href={stats.short_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
                  >
                    <span>Test Redirection</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">{stats.long_url}</div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl">
                  <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Total Clicks</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.click_count}</div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Created Date
                  </div>
                  <div className="text-xs font-medium text-slate-900 dark:text-white mt-2">
                    {new Date(stats.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Expiration
                  </div>
                  <div className="text-xs font-medium text-slate-900 dark:text-white mt-2">
                    {stats.expires_at ? (
                      stats.is_expired ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">Expired</span>
                      ) : (
                        new Date(stats.expires_at).toLocaleString()
                      )
                    ) : (
                      'Never Expires'
                    )}
                  </div>
                </div>
              </div>

              {/* Click History Log */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Recent Click Stream (Last {stats.recent_clicks.length})
                </h4>

                {stats.recent_clicks.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    No clicks recorded yet. Share your short URL to start gathering insights!
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-2.5">Timestamp</th>
                          <th className="px-4 py-2.5">Referrer</th>
                          <th className="px-4 py-2.5">User Agent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {stats.recent_clicks.map((click) => (
                          <tr key={click.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 font-mono text-[11px]">
                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {new Date(click.clicked_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 truncate max-w-[140px] text-slate-600 dark:text-slate-300">
                              {click.referrer ? (
                                <span className="text-indigo-600 dark:text-indigo-400">{click.referrer}</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">Direct</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 truncate max-w-[200px] text-slate-500 dark:text-slate-400" title={click.user_agent || 'Unknown'}>
                              {click.user_agent || 'Unknown'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(shortCode);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Link</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
