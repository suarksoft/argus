'use client';

interface Threat {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

interface RiskAnalysisCardProps {
  riskScore: number;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  aiExplanation: string;
  threats: Threat[];
  isAnalyzing?: boolean;
  address?: string;
  communityInfo?: {
    reportCount?: number;
    verifiedReportCount?: number;
    latestReports?: Array<{
      title: string;
      scamType: string;
      status: string;
      upvotes: number;
    }>;
  };
}

const riskColors = {
  SAFE: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-900 dark:text-emerald-100',
    bar: 'bg-emerald-500',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  LOW: {
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-200 dark:border-sky-500/30',
    text: 'text-sky-900 dark:text-sky-100',
    bar: 'bg-sky-500',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  MEDIUM: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-900 dark:text-amber-100',
    bar: 'bg-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  HIGH: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-500/30',
    text: 'text-orange-900 dark:text-orange-100',
    bar: 'bg-orange-500',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  CRITICAL: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-500/30',
    text: 'text-rose-900 dark:text-rose-100',
    bar: 'bg-rose-500',
    icon: 'text-rose-600 dark:text-rose-400',
  },
};

const riskIcons = {
  SAFE: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  LOW: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  MEDIUM: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  HIGH: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  CRITICAL: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function RiskAnalysisCard({
  riskScore,
  riskLevel,
  aiExplanation,
  threats,
  isAnalyzing = false,
  address,
  communityInfo,
}: RiskAnalysisCardProps) {
  const colors = riskColors[riskLevel];

  if (isAnalyzing) {
    return (
      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Analyzing address security...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl ${colors.bg} border-2 ${colors.border} p-6 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={colors.icon}>
            {riskIcons[riskLevel]}
          </div>
          <div>
            <h4 className={`font-bold ${colors.text}`}>Security Analysis</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Powered by Argus AI
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${colors.text}`}>{riskScore}</span>
            <span className="text-sm text-zinc-500">/100</span>
          </div>
          <div className={`text-xs font-semibold ${colors.text} uppercase tracking-wide`}>
            {riskLevel}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-white dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors.bar} transition-all duration-500 rounded-full`}
          style={{ width: `${riskScore}%` }}
        />
      </div>

      {/* AI Explanation */}
      <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {aiExplanation}
          </p>
        </div>
      </div>

      {/* Threats */}
      {threats.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Detected Threats
          </h5>
          {threats.map((threat, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <div className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                threat.severity === 'CRITICAL' ? 'text-rose-500' :
                threat.severity === 'HIGH' ? 'text-orange-500' :
                threat.severity === 'MEDIUM' ? 'text-amber-500' :
                'text-sky-500'
              }`}>
                {threat.severity === 'CRITICAL' || threat.severity === 'HIGH' ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {threat.type ? threat.type.replace(/_/g, ' ') : 'Security Issue'}
                </span>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {threat.description || 'No description available'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Community Reports Section (GERÇEK VERİ) */}
      {communityInfo && communityInfo.reportCount > 0 && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h5 className="font-semibold text-rose-900 dark:text-rose-100 mb-1">
                Community Reports Found
              </h5>
              <p className="text-sm text-rose-800 dark:text-rose-200 mb-2">
                {communityInfo.verifiedReportCount > 0 
                  ? `${communityInfo.verifiedReportCount} verified report(s) from the Argus community`
                  : `${communityInfo.reportCount} report(s) under review`
                }
              </p>
              {communityInfo.latestReports && communityInfo.latestReports.length > 0 && (
                <div className="space-y-1 mt-2">
                  {communityInfo.latestReports.slice(0, 2).map((report, idx) => (
                    <div key={idx} className="text-xs text-rose-700 dark:text-rose-300 bg-white dark:bg-rose-900/30 rounded px-2 py-1">
                      <span className="font-medium">"{report.title}"</span>
                      {report.status === 'verified' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs font-semibold">
                          ✓ Verified
                        </span>
                      )}
                      {report.upvotes > 0 && (
                        <span className="ml-2 text-rose-600 dark:text-rose-400">
                          ↑ {report.upvotes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {address && (
                <a 
                  href={`/community/threats?address=${encodeURIComponent(address)}`}
                  className="text-xs text-rose-700 dark:text-rose-300 hover:underline mt-2 inline-block"
                >
                  View all reports →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Badge for High Risk */}
      {(riskLevel === 'HIGH' || riskLevel === 'CRITICAL') && (
        <div className={`rounded-lg ${colors.bg} border ${colors.border} p-4`}>
          <p className={`text-sm font-semibold ${colors.text} flex items-center gap-2`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {riskLevel === 'CRITICAL' 
              ? 'BLOCKED: Do not proceed with this transaction' 
              : 'WARNING: Proceed with extreme caution'
            }
          </p>
        </div>
      )}
    </div>
  );
}

