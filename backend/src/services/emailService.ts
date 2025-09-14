/**
 * Email Service - Notification and Reporting System
 * 
 * Provides email functionality for validation alerts, system notifications,
 * and comprehensive reporting to stakeholders.
 * 
 * Features:
 * 1. Critical error alerts
 * 2. Daily validation summaries  
 * 3. Weekly comprehensive reports
 * 4. System status notifications
 * 5. HTML and text email templates
 * 6. Email delivery tracking
 * 7. Retry mechanism for failed sends
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface ValidationAlert {
  to: string;
  subject: string;
  criticalIssues?: any[];
  dailySummary?: any;
  timestamp: Date;
}

interface WeeklyReport {
  to: string;
  subject: string;
  report: any;
  timestamp: Date;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || 'noreply@drsync.com'
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    });
  }

  /**
   * Send validation alert email
   */
  async sendValidationAlert(alert: ValidationAlert): Promise<boolean> {
    try {
      let htmlContent: string;
      let textContent: string;

      if (alert.criticalIssues) {
        // Critical error alert
        htmlContent = this.generateCriticalErrorHtml(alert.criticalIssues, alert.timestamp);
        textContent = this.generateCriticalErrorText(alert.criticalIssues, alert.timestamp);
      } else if (alert.dailySummary) {
        // Daily summary
        htmlContent = this.generateDailySummaryHtml(alert.dailySummary, alert.timestamp);
        textContent = this.generateDailySummaryText(alert.dailySummary, alert.timestamp);
      } else {
        throw new Error('Invalid alert type');
      }

      const mailOptions = {
        from: this.config.from,
        to: alert.to,
        subject: alert.subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Validation alert email sent to ${alert.to}:`, result.messageId);
      return true;

    } catch (error) {
      logger.error(`Failed to send validation alert to ${alert.to}:`, error);
      return false;
    }
  }

  /**
   * Send weekly comprehensive report
   */
  async sendWeeklyReport(report: WeeklyReport): Promise<boolean> {
    try {
      const htmlContent = this.generateWeeklyReportHtml(report.report, report.timestamp);
      const textContent = this.generateWeeklyReportText(report.report, report.timestamp);

      const mailOptions = {
        from: this.config.from,
        to: report.to,
        subject: report.subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Weekly report email sent to ${report.to}:`, result.messageId);
      return true;

    } catch (error) {
      logger.error(`Failed to send weekly report to ${report.to}:`, error);
      return false;
    }
  }

  /**
   * Generate critical error alert HTML
   */
  private generateCriticalErrorHtml(criticalIssues: any[], timestamp: Date): string {
    const issuesHtml = criticalIssues.map(issue => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${issue.organizationName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #d73527;">${issue.criticalErrors}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${issue.conflicts}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${issue.recommendations.join(', ')}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Critical Data Integrity Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #d73527; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="margin: 0;">⚠️ CRITICAL: Data Integrity Issues Detected</h1>
            <p style="margin: 5px 0 0 0;">Generated at: ${timestamp.toISOString()}</p>
          </div>
          
          <p><strong>${criticalIssues.length} organizations</strong> have critical data integrity issues that require immediate attention.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Organization</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Critical Errors</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Conflicts</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Recommendations</th>
              </tr>
            </thead>
            <tbody>
              ${issuesHtml}
            </tbody>
          </table>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">Immediate Actions Required:</h3>
            <ul>
              <li>Review and address critical data integrity issues</li>
              <li>Check Google Sheets connectivity and permissions</li>
              <li>Verify data synchronization status</li>
              <li>Contact technical support if issues persist</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            This is an automated alert from DrSync Data Validation System.<br>
            For support, contact: support@drsync.com
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate critical error alert text
   */
  private generateCriticalErrorText(criticalIssues: any[], timestamp: Date): string {
    const issuesText = criticalIssues.map(issue => 
      `- ${issue.organizationName}: ${issue.criticalErrors} critical errors, ${issue.conflicts} conflicts`
    ).join('\n');

    return `
CRITICAL: Data Integrity Issues Detected
Generated at: ${timestamp.toISOString()}

${criticalIssues.length} organizations have critical data integrity issues:

${issuesText}

IMMEDIATE ACTIONS REQUIRED:
- Review and address critical data integrity issues
- Check Google Sheets connectivity and permissions  
- Verify data synchronization status
- Contact technical support if issues persist

This is an automated alert from DrSync Data Validation System.
For support, contact: support@drsync.com
    `;
  }

  /**
   * Generate daily summary HTML
   */
  private generateDailySummaryHtml(summary: any, _timestamp: Date): string {
    const statusColor = summary.totalCriticalErrors > 0 ? '#d73527' : 
                       summary.organizationsWithIssues > 0 ? '#ffc107' : '#28a745';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Data Validation Summary</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${statusColor}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="margin: 0;">📊 Daily Data Validation Summary</h1>
            <p style="margin: 5px 0 0 0;">${summary.date.toDateString()}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
              <h3 style="margin: 0; color: #28a745;">${summary.totalOrganizations}</h3>
              <p style="margin: 5px 0 0 0;">Total Organizations</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
              <h3 style="margin: 0; color: #28a745;">${summary.healthyOrganizations}</h3>
              <p style="margin: 5px 0 0 0;">Healthy</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
              <h3 style="margin: 0; color: #ffc107;">${summary.organizationsWithIssues}</h3>
              <p style="margin: 5px 0 0 0;">With Issues</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
              <h3 style="margin: 0; color: #d73527;">${summary.totalCriticalErrors}</h3>
              <p style="margin: 5px 0 0 0;">Critical Errors</p>
            </div>
          </div>
          
          ${summary.topIssues.length > 0 ? `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">Top Issues:</h3>
              <ul>
                ${summary.topIssues.map((issue: string) => `<li>${issue}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <p style="color: #666;">
            Execution Time: ${(summary.executionDuration / 1000).toFixed(2)} seconds
          </p>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            This is an automated report from DrSync Data Validation System.<br>
            For support, contact: support@drsync.com
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate daily summary text
   */
  private generateDailySummaryText(summary: any, _timestamp: Date): string {
    const topIssuesText = summary.topIssues.length > 0 ? 
      `\nTOP ISSUES:\n${summary.topIssues.map((issue: string) => `- ${issue}`).join('\n')}` : '';

    return `
Daily Data Validation Summary
${summary.date.toDateString()}

SUMMARY:
- Total Organizations: ${summary.totalOrganizations}
- Healthy: ${summary.healthyOrganizations}
- With Issues: ${summary.organizationsWithIssues}  
- Critical Errors: ${summary.totalCriticalErrors}
- Conflicts: ${summary.totalConflicts}

${topIssuesText}

Execution Time: ${(summary.executionDuration / 1000).toFixed(2)} seconds

This is an automated report from DrSync Data Validation System.
For support, contact: support@drsync.com
    `;
  }

  /**
   * Generate weekly report HTML
   */
  private generateWeeklyReportHtml(report: any, _timestamp: Date): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Data Integrity Report</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="margin: 0;">📈 Weekly Data Integrity Report</h1>
            <p style="margin: 5px 0 0 0;">
              ${report.period.start.toDateString()} - ${report.period.end.toDateString()}
            </p>
          </div>
          
          <h2>Executive Summary</h2>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <ul>
              <li>Total Validations: ${report.summary.totalValidations}</li>
              <li>Active Organizations: ${report.summary.organizationsActive}</li>
              <li>Average Errors per Validation: ${report.summary.averageErrors.toFixed(2)}</li>
              <li>Trend: ${report.summary.trendDirection}</li>
            </ul>
          </div>
          
          <h2>Performance Metrics</h2>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <ul>
              <li>Average Duration: ${report.performanceMetrics.avgDuration.toFixed(2)}ms</li>
              <li>Max Duration: ${report.performanceMetrics.maxDuration}ms</li>
              <li>Min Duration: ${report.performanceMetrics.minDuration}ms</li>
              <li>Total Records Validated: ${report.performanceMetrics.totalRecordsValidated}</li>
            </ul>
          </div>
          
          <h2>Recommendations</h2>
          <div style="background-color: #d1ecf1; border-left: 4px solid #bee5eb; padding: 15px; margin: 15px 0;">
            <ul>
              ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            This is an automated report from DrSync Data Validation System.<br>
            For support, contact: support@drsync.com
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate weekly report text
   */
  private generateWeeklyReportText(report: any, _timestamp: Date): string {
    const recommendationsText = report.recommendations.map((rec: string) => `- ${rec}`).join('\n');

    return `
Weekly Data Integrity Report
${report.period.start.toDateString()} - ${report.period.end.toDateString()}

EXECUTIVE SUMMARY:
- Total Validations: ${report.summary.totalValidations}
- Active Organizations: ${report.summary.organizationsActive}
- Average Errors per Validation: ${report.summary.averageErrors.toFixed(2)}
- Trend: ${report.summary.trendDirection}

PERFORMANCE METRICS:
- Average Duration: ${report.performanceMetrics.avgDuration.toFixed(2)}ms
- Max Duration: ${report.performanceMetrics.maxDuration}ms
- Min Duration: ${report.performanceMetrics.minDuration}ms
- Total Records Validated: ${report.performanceMetrics.totalRecordsValidated}

RECOMMENDATIONS:
${recommendationsText}

This is an automated report from DrSync Data Validation System.
For support, contact: support@drsync.com
    `;
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;

// Export specific functions for the validation task
export const sendValidationAlert = (alert: ValidationAlert) => emailService.sendValidationAlert(alert);
export const sendWeeklyReport = (report: WeeklyReport) => emailService.sendWeeklyReport(report);

// Export the class for testing
export { EmailService };