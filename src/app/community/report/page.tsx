'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type ThreatType = 'PHISHING' | 'FAKE_TOKEN' | 'RUG_PULL' | 'HONEYPOT' | 'FROZEN_FUNDS' | 'OTHER';

interface ReportFormData {
  threatType: ThreatType | null;
  targetAddress: string;
  targetAssetCode: string;
  targetAssetIssuer: string;
  targetWebsite: string;
  transactionHash: string;
  title: string;
  description: string;
  estimatedLoss: string;
  lossCurrency: string;
  evidenceUrls: string[];
  evidenceFiles: File[];
  confirmAccuracy: boolean;
  confirmConsequences: boolean;
}

const threatTypes: { type: ThreatType; title: string; description: string }[] = [
  { type: 'PHISHING', title: 'PHISHING', description: 'Fake websites, impersonation' },
  { type: 'FAKE_TOKEN', title: 'FAKE TOKEN', description: 'Scam tokens, fake stables' },
  { type: 'RUG_PULL', title: 'RUG PULL', description: 'Project exit scams' },
  { type: 'HONEYPOT', title: 'HONEYPOT', description: "Can't sell, liquidity trap" },
  { type: 'FROZEN_FUNDS', title: 'FROZEN FUNDS', description: 'Assets frozen by issuer' },
  { type: 'OTHER', title: 'OTHER', description: 'Other security concerns' },
];

// Validation functions
const isValidStellarAddress = (address: string): boolean => {
  return /^G[A-Z2-7]{55}$/.test(address);
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function ReportThreatPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReportFormData>({
    threatType: null,
    targetAddress: '',
    targetAssetCode: '',
    targetAssetIssuer: '',
    targetWebsite: '',
    transactionHash: '',
    title: '',
    description: '',
    estimatedLoss: '',
    lossCurrency: 'USD',
    evidenceUrls: [''],
    evidenceFiles: [],
    confirmAccuracy: false,
    confirmConsequences: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ReportFormData, string>>>({});

  const totalSteps = 4;

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof ReportFormData, string>> = {};

    switch (step) {
      case 1:
        if (!formData.threatType) {
          newErrors.threatType = 'Please select a threat type';
        }
        break;
      case 2:
        if (!formData.targetAddress && !formData.targetWebsite) {
          newErrors.targetAddress = 'Please enter an address or website';
        }
        if (formData.targetAddress && !isValidStellarAddress(formData.targetAddress)) {
          newErrors.targetAddress = 'Invalid Stellar address format';
        }
        if (formData.targetWebsite && !isValidUrl(`https://${formData.targetWebsite}`)) {
          newErrors.targetWebsite = 'Invalid website URL';
        }
        break;
      case 3:
        if (!formData.title || formData.title.length < 10) {
          newErrors.title = 'Title must be at least 10 characters';
        }
        if (!formData.description || formData.description.length < 50) {
          newErrors.description = 'Description must be at least 50 characters';
        }
        break;
      case 4:
        if (!formData.confirmAccuracy) {
          newErrors.confirmAccuracy = 'You must confirm the accuracy of your report';
        }
        if (!formData.confirmConsequences) {
          newErrors.confirmConsequences = 'You must acknowledge the consequences';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success - redirect to community page
      router.push('/community?success=report_submitted');
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEvidenceUrl = () => {
    setFormData(prev => ({
      ...prev,
      evidenceUrls: [...prev.evidenceUrls, ''],
    }));
  };

  const updateEvidenceUrl = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      evidenceUrls: prev.evidenceUrls.map((url, i) => (i === index ? value : url)),
    }));
  };

  const removeEvidenceUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      evidenceUrls: prev.evidenceUrls.filter((_, i) => i !== index),
    }));
  };

  // Step components
  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">What type of threat are you reporting?</h2>
      <p className="text-zinc-400 mb-6">Select the category that best describes the threat</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {threatTypes.map(({ type, title, description }) => (
          <button
            key={type}
            onClick={() => setFormData(prev => ({ ...prev, threatType: type }))}
            className={`p-4 rounded-2xl border-2 transition-all text-left ${
              formData.threatType === type
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
            }`}
          >
            <h3 className="font-semibold text-white text-sm">{title}</h3>
            <p className="text-xs text-zinc-400 mt-1">{description}</p>
          </button>
        ))}
      </div>
      {errors.threatType && (
        <p className="text-red-400 text-sm mt-4">{errors.threatType}</p>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Enter the suspicious address or asset</h2>
      <p className="text-zinc-400 mb-6">Provide the Stellar address, asset, or website URL</p>

      <div className="space-y-4">
        {/* Address Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Address / Asset Issuer
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.targetAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAddress: e.target.value.toUpperCase() }))}
              placeholder="GDKX7F2A9K3ML..."
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono text-sm"
            />
            {formData.targetAddress && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidStellarAddress(formData.targetAddress) ? (
                  <span className="text-emerald-400">✓</span>
                ) : (
                  <span className="text-red-400">✕</span>
                )}
              </div>
            )}
          </div>
          {formData.targetAddress && isValidStellarAddress(formData.targetAddress) && (
            <p className="text-sm text-emerald-400 mt-1"> Valid Stellar address detected</p>
          )}
          {errors.targetAddress && (
            <p className="text-red-400 text-sm mt-1">{errors.targetAddress}</p>
          )}
        </div>

        {/* Asset Code (if FAKE_TOKEN) */}
        {formData.threatType === 'FAKE_TOKEN' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Asset Code
            </label>
            <input
              type="text"
              value={formData.targetAssetCode}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAssetCode: e.target.value.toUpperCase() }))}
              placeholder="USDC, BTC, etc."
              maxLength={12}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono"
            />
          </div>
        )}

        {/* Transaction Hash */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Transaction Hash <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.transactionHash}
            onChange={(e) => setFormData(prev => ({ ...prev, transactionHash: e.target.value }))}
            placeholder="Transaction hash..."
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono text-sm"
          />
        </div>

        {/* Website (if PHISHING) */}
        {(formData.threatType === 'PHISHING' || formData.threatType === 'OTHER') && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Related Website <span className="text-zinc-500">(if phishing)</span>
            </label>
            <div className="flex">
              <span className="px-4 py-3 bg-zinc-800 border border-r-0 border-zinc-700 rounded-l-xl text-zinc-400 text-sm">
                https://
              </span>
              <input
                type="text"
                value={formData.targetWebsite}
                onChange={(e) => setFormData(prev => ({ ...prev, targetWebsite: e.target.value }))}
                placeholder="suspicious-site.com"
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-r-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
            {errors.targetWebsite && (
              <p className="text-red-400 text-sm mt-1">{errors.targetWebsite}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Describe what happened</h2>
      <p className="text-zinc-400 mb-6">Provide detailed information about this threat</p>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Report Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief title describing the threat..."
            maxLength={100}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
          <div className="flex justify-between mt-1">
            {errors.title && <p className="text-red-400 text-sm">{errors.title}</p>}
            <p className="text-xs text-zinc-500 ml-auto">{formData.title.length}/100</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Detailed Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Please provide details about this threat. What happened? How did you discover it? Any losses?

Example: 'This token claims to be USDC but has a different issuer. The issuer enabled AUTH_REVOCABLE which means they can freeze your funds at any time...'"
            rows={6}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
          />
          <div className="flex justify-between mt-1">
            {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
            <p className={`text-xs ml-auto ${formData.description.length < 50 ? 'text-yellow-400' : 'text-zinc-500'}`}>
              {formData.description.length}/50 min
            </p>
          </div>
        </div>

        {/* Estimated Loss */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Estimated Loss <span className="text-zinc-500">(optional)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
              <input
                type="number"
                value={formData.estimatedLoss}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedLoss: e.target.value }))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 pl-8 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
            <select
              value={formData.lossCurrency}
              onChange={(e) => setFormData(prev => ({ ...prev, lossCurrency: e.target.value }))}
              className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            >
              <option value="USD">USD</option>
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Add evidence</h2>
      <p className="text-zinc-400 mb-6">Optional but helps verification</p>

      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Upload Screenshots or Files
          </label>
          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer">
            <span className="text-4xl mb-2 block"></span>
            <p className="text-zinc-300 mb-1">Drop files here or click to upload</p>
            <p className="text-xs text-zinc-500">Screenshots, transaction records, chat logs</p>
            <p className="text-xs text-zinc-600 mt-2">Max 5 files, 10MB each</p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setFormData(prev => ({
                  ...prev,
                  evidenceFiles: [...prev.evidenceFiles, ...files].slice(0, 5),
                }));
              }}
            />
          </div>
          {formData.evidenceFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.evidenceFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg text-sm">
                  <span className="text-zinc-300 truncate">{file.name}</span>
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      evidenceFiles: prev.evidenceFiles.filter((_, idx) => idx !== i),
                    }))}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* External Links */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            External Links <span className="text-zinc-500">(Twitter, Reddit, etc.)</span>
          </label>
          <div className="space-y-2">
            {formData.evidenceUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => updateEvidenceUrl(index, e.target.value)}
                  placeholder="https://twitter.com/..."
                  className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                />
                {formData.evidenceUrls.length > 1 && (
                  <button
                    onClick={() => removeEvidenceUrl(index)}
                    className="px-3 text-zinc-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addEvidenceUrl}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              + Add another link
            </button>
          </div>
        </div>

        {/* Confirmations */}
        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.confirmAccuracy}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmAccuracy: e.target.checked }))}
              className="mt-1 w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50"
            />
            <span className="text-sm text-zinc-300">
              I confirm this report is accurate to the best of my knowledge
            </span>
          </label>
          {errors.confirmAccuracy && (
            <p className="text-red-400 text-sm ml-8">{errors.confirmAccuracy}</p>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.confirmConsequences}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmConsequences: e.target.checked }))}
              className="mt-1 w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50"
            />
            <span className="text-sm text-zinc-300">
              I understand false reports may affect my reputation
            </span>
          </label>
          {errors.confirmConsequences && (
            <p className="text-red-400 text-sm ml-8">{errors.confirmConsequences}</p>
          )}
        </div>

        {/* User Stats */}
        <div className="bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Your reputation:</span>
            <span className="text-emerald-400 font-medium"> 450 points (Contributor)</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-zinc-400">Reports submitted:</span>
            <span className="text-zinc-300">12 | Verified: 8</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/community" className="text-zinc-400 hover:text-white transition-colors">
                ←
              </Link>
              <span className="text-2xl"></span>
              <h1 className="text-xl font-bold text-white">Report a Threat</h1>
            </div>
            <div className="text-sm text-zinc-400">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < currentStep ? 'bg-emerald-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/community"
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin"></span> Submitting...
                  </>
                ) : (
                  <> Submit Report</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
