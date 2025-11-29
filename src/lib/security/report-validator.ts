/**
 * Community Report Validator
 * 
 * Prevents manipulation of community reports through:
 * - Rate limiting per reporter
 * - Duplicate detection
 * - Reputation scoring
 * - Bot detection
 */

interface ReportSubmission {
  assetCode: string;
  issuerAddress: string;
  reporterAddress: string;
  reportType: string;
  description: string;
  evidenceUrl?: string;
}

interface ReporterStats {
  totalReports: number;
  verifiedReports: number;
  rejectedReports: number;
  spamReports: number;
  reputation: number; // 0-100
  lastReportAt?: Date;
}

/**
 * Report Validator Service
 */
export class ReportValidator {
  private readonly RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_REPORTS_PER_DAY = 5;
  private readonly MIN_REPUTATION_FOR_AUTO_APPROVE = 70;
  private readonly DUPLICATE_THRESHOLD_HOURS = 1; // Same report within 1 hour = duplicate

  /**
   * Validate a report submission
   */
  async validateReport(
    report: ReportSubmission,
    reporterStats: ReporterStats
  ): Promise<{
    valid: boolean;
    reason?: string;
    requiresReview: boolean;
  }> {
    // 1. Rate limiting check
    if (this.isRateLimited(reporterStats)) {
      return {
        valid: false,
        reason: 'Rate limit exceeded. Maximum 5 reports per 24 hours.',
        requiresReview: true,
      };
    }

    // 2. Reputation check - low reputation reports require review
    const requiresReview = reporterStats.reputation < this.MIN_REPUTATION_FOR_AUTO_APPROVE;

    // 3. Spam detection - users with high spam ratio are blocked
    if (reporterStats.spamReports > 0 && reporterStats.reputation < 30) {
      return {
        valid: false,
        reason: 'Account flagged for spam. Please contact support.',
        requiresReview: true,
      };
    }

    // 4. Duplicate detection (would need database check)
    // This should be checked against recent reports in the database

    return {
      valid: true,
      requiresReview,
    };
  }

  /**
   * Check if reporter is rate limited
   */
  private isRateLimited(stats: ReporterStats): boolean {
    if (!stats.lastReportAt) {
      return false; // First report
    }

    const timeSinceLastReport = Date.now() - new Date(stats.lastReportAt).getTime();
    
    // If last report was within rate limit window and they've hit the limit
    if (timeSinceLastReport < this.RATE_LIMIT_WINDOW) {
      return stats.totalReports >= this.MAX_REPORTS_PER_DAY;
    }

    return false;
  }

  /**
   * Calculate reporter reputation
   */
  calculateReputation(stats: ReporterStats): number {
    if (stats.totalReports === 0) {
      return 50; // Neutral reputation for new reporters
    }

    const verifiedRatio = stats.verifiedReports / stats.totalReports;
    const spamRatio = stats.spamReports / stats.totalReports;

    // Base reputation from verified reports
    let reputation = verifiedRatio * 100;

    // Penalty for spam reports
    reputation -= spamRatio * 50;

    // Bonus for high verification rate
    if (verifiedRatio > 0.8) {
      reputation += 10;
    }

    // Ensure reputation stays within bounds
    return Math.max(0, Math.min(100, Math.round(reputation)));
  }

  /**
   * Check for duplicate reports
   */
  async checkDuplicate(
    report: ReportSubmission,
    recentReports: Array<{
      assetCode: string;
      issuerAddress: string;
      reporterAddress: string;
      createdAt: Date;
    }>
  ): Promise<boolean> {
    const now = Date.now();
    const threshold = this.DUPLICATE_THRESHOLD_HOURS * 60 * 60 * 1000;

    return recentReports.some((r) => {
      const timeDiff = now - new Date(r.createdAt).getTime();
      return (
        r.assetCode === report.assetCode &&
        r.issuerAddress === report.issuerAddress &&
        r.reporterAddress === report.reporterAddress &&
        timeDiff < threshold
      );
    });
  }

  /**
   * Detect potential bot behavior
   */
  detectBotBehavior(reports: Array<{ createdAt: Date; reporterAddress: string }>): boolean {
    if (reports.length < 3) {
      return false;
    }

    // Check for suspicious patterns:
    // 1. Multiple reports in very short time
    // 2. Reports from same address with identical timing patterns

    const sortedReports = reports.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Check for reports within 1 minute of each other (suspicious)
    for (let i = 1; i < sortedReports.length; i++) {
      const timeDiff =
        new Date(sortedReports[i].createdAt).getTime() -
        new Date(sortedReports[i - 1].createdAt).getTime();

      if (timeDiff < 60 * 1000) {
        // Less than 1 minute between reports
        return true;
      }
    }

    return false;
  }
}

export const reportValidator = new ReportValidator();

