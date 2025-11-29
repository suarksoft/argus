'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';

const SCAM_TYPES = [
  { value: 'PHISHING', label: 'Phishing / Fake Website' },
  { value: 'FAKE_TOKEN', label: 'Fake Token / Airdrop' },
  { value: 'RUG_PULL', label: 'Rug Pull / Exit Scam' },
  { value: 'HONEYPOT', label: 'Honeypot / Token Trap' },
  { value: 'PONZI', label: 'Ponzi / Pyramid Scheme' },
  { value: 'FAKE_EXCHANGE', label: 'Fake Exchange' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
];

export default function ReportScamPage() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // Report form
  const [address, setAddress] = useState('');
  const [scamType, setScamType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState(['']);
  const [contactEmail, setContactEmail] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username: authMode === 'register' ? username : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLoggedIn(true);
        setShowAuth(false);
        localStorage.setItem('argus_auth_token', data.token);
        localStorage.setItem('argus_user_email', email);
        
        // Show success toast
        setToast({
          type: 'success',
          message: authMode === 'register' ? 'Account created successfully!' : 'Signed in successfully!'
        });
        setTimeout(() => setToast(null), 3000);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user IP (from request)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      const token = localStorage.getItem('argus_auth_token');
      
      const response = await fetch('/api/community/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: address.trim(),
          scamType,
          title: title.trim(),
          description: description.trim(),
          evidenceUrls: evidenceUrls.filter(url => url.trim()),
          contactEmail: contactEmail.trim(),
          reporterIp: ip,
          reporterEmail: localStorage.getItem('argus_user_email'),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        // Show success toast
        setToast({
          type: 'success',
          message: 'Report submitted successfully! Moderators will review it shortly.'
        });
        
        // Reset form
        setAddress('');
        setScamType('');
        setTitle('');
        setDescription('');
        setEvidenceUrls(['']);
        setContactEmail('');
        
        setTimeout(() => {
          setSuccess(false);
          setToast(null);
        }, 5000);
      } else {
        setError(data.error || 'Failed to submit report');
        
        // Show error toast
        setToast({
          type: 'error',
          message: data.error || 'Failed to submit report'
        });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addEvidenceUrl = () => {
    setEvidenceUrls([...evidenceUrls, '']);
  };

  const updateEvidenceUrl = (index: number, value: string) => {
    const newUrls = [...evidenceUrls];
    newUrls[index] = value;
    setEvidenceUrls(newUrls);
  };

  const removeEvidenceUrl = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  // Auth Modal JSX
  const renderAuthModal = () => {
    if (!showAuth || isLoggedIn) return null;
    
    return (
      <div className="mx-auto max-w-md py-16">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 p-8 ring-1 ring-zinc-900/10 dark:ring-white/10">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              {authMode === 'register' ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {authMode === 'register' 
                ? 'Join Argus community to report scams' 
                : 'Sign in to submit scam reports'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-3">
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="johndoe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {authMode === 'register' && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Minimum 8 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Please wait...</span>
                </>
              ) : (
                authMode === 'register' ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {authMode === 'register' 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Register'}
            </button>
          </div>

          <button
            onClick={() => setShowAuth(false)}
            className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back to report form
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Auth Modal Overlay */}
      {showAuth && !isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          {renderAuthModal()}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div className={`rounded-xl px-6 py-4 shadow-lg ${
            toast.type === 'success' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-rose-600 text-white'
          }`}>
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl py-16">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/50">
          <svg className="h-8 w-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Report Scam
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Help protect the Stellar community by reporting suspicious addresses
        </p>
      </div>

      {!isLoggedIn && (
        <div className="mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Authentication Required
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                You need to sign in or create an account to submit reports
              </p>
              <button
                onClick={() => setShowAuth(true)}
                className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:underline"
              >
                Sign In / Register →
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Report Submitted Successfully
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
                Your report is under review. Thank you for protecting the community!
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitReport} className="space-y-6">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 p-8 ring-1 ring-zinc-900/10 dark:ring-white/10 space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4">
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
              Suspicious Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="GSCAM..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Stellar address you want to report (starts with G, 56 characters)
            </p>
          </div>

          {/* Scam Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
              Scam Type *
            </label>
            <select
              value={scamType}
              onChange={(e) => setScamType(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select scam type...</option>
              {SCAM_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
              Report Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Fake USDC Airdrop Scam"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
              Detailed Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              placeholder="Describe what happened, how the scam works, and any other relevant details..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Be specific and include as much detail as possible
            </p>
          </div>

          {/* Evidence URLs */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
              Evidence (Screenshots, Links, etc.)
            </label>
            <div className="space-y-2">
              {evidenceUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateEvidenceUrl(index, e.target.value)}
                    placeholder="https://imgur.com/screenshot.png"
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  {evidenceUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEvidenceUrl(index)}
                      className="px-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addEvidenceUrl}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                + Add another link
              </button>
            </div>
          </div>

          {/* Contact Email (optional) */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
              Contact Email (Optional)
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              We may contact you for additional information
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-500/30 p-4">
            <p className="text-xs text-sky-900 dark:text-sky-100">
              <strong>Privacy:</strong> Your IP address will be logged for spam prevention. 
              Reports are reviewed by moderators before being published. False reports may result in account suspension.
            </p>
          </div>

          {/* Submit Button */}
          {isLoggedIn ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-semibold"
            >
              Sign In to Submit
            </button>
          )}

          {!isLoggedIn && (
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              You must sign in to submit scam reports
            </p>
          )}
        </div>
      </form>

      {/* Info Card */}
      <div className="mt-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Reporting Guidelines
        </h3>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span>
            <span>Provide clear evidence (screenshots, transaction hashes)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span>
            <span>Be specific about the scam method</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span>
            <span>Include timeline of events</span>
          </li>
          <li className="flex gap-2">
            <span className="text-rose-500">✗</span>
            <span>Do not submit false or malicious reports</span>
          </li>
          <li className="flex gap-2">
            <span className="text-rose-500">✗</span>
            <span>Do not spam or abuse the system</span>
          </li>
        </ul>
      </div>
      </div>
    </>
  );
}
