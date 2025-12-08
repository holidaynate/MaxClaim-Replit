// Reference: PDF generation utility from user prompts
// Note: Using jsPDF for server-side PDF generation instead of Puppeteer
// to avoid heavy browser dependencies on Replit
//
// Enhanced with multi-source citation support

import { generateDisclaimer } from '../pricing-data';
import { type PricingSource } from './pricingCitation';

/**
 * Generate a basic PDF report from claim audit data.
 * This creates a simple text-based PDF without requiring a headless browser.
 * 
 * For HTML-to-PDF conversion, consider using a cloud service or
 * install puppeteer with: npm install puppeteer
 */
export interface ClaimReportData {
  claimId: string;
  zipCode: string;
  items: Array<{
    category: string;
    description: string;
    quantity: number;
    unit: string;
    insuranceOffer: number;
    fmvPrice: number;
    variance: number;
    citation?: {
      sources: PricingSource[];
      confidenceLevel: string;
      shortCitation: string;
    };
  }>;
  summary: {
    totalInsuranceOffer: number;
    totalFMV: number;
    totalAdditional: number;
    overallIncrease: number;
  };
  dataSources?: PricingSource[];
  generatedAt: Date;
}

/**
 * Generate HTML report content for a claim audit.
 * This can be stored in App Storage or converted to PDF.
 */
export function generateReportHtml(data: ClaimReportData): string {
  const formatCurrency = (amount: number) => 
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatPercent = (pct: number) =>
    `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

  const itemRows = data.items.map((item, i) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.category}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.quantity} ${item.unit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.insuranceOffer)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.fmvPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${item.variance >= 0 ? "#059669" : "#dc2626"};">${formatPercent(item.variance)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MaxClaim Fair Market Value Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #1e293b;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0ea5e9;
      margin: 0;
    }
    .summary-box {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .summary-item .value {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
    }
    .additional {
      color: #059669;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #0ea5e9;
      color: white;
      padding: 12px 8px;
      text-align: left;
    }
    th:nth-child(5), th:nth-child(6), th:nth-child(7) {
      text-align: right;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MaxClaim Fair Market Value Report</h1>
    <p>Claim ID: ${data.claimId} | ZIP Code: ${data.zipCode}</p>
    <p>Generated: ${data.generatedAt.toLocaleString()}</p>
  </div>

  <div class="summary-box">
    <h2 style="margin-top: 0;">Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Insurance Offer</div>
        <div class="value">${formatCurrency(data.summary.totalInsuranceOffer)}</div>
      </div>
      <div class="summary-item">
        <div class="label">Fair Market Value</div>
        <div class="value">${formatCurrency(data.summary.totalFMV)}</div>
      </div>
      <div class="summary-item">
        <div class="label">Additional Amount</div>
        <div class="value additional">${formatCurrency(data.summary.totalAdditional)}</div>
      </div>
      <div class="summary-item">
        <div class="label">Variance</div>
        <div class="value">${formatPercent(data.summary.overallIncrease)}</div>
      </div>
    </div>
  </div>

  <h2>Line Item Details</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Category</th>
        <th>Description</th>
        <th>Quantity</th>
        <th>Insurance Offer</th>
        <th>FMV</th>
        <th>Variance</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  ${data.dataSources && data.dataSources.length > 0 ? `
  <div class="sources-box" style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-top: 30px; border-left: 4px solid #0ea5e9;">
    <h2 style="margin-top: 0; color: #0369a1;">Data Sources & Citations</h2>
    <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">
      Fair Market Values are calculated using a multi-source methodology for accuracy and transparency.
    </p>
    <ul style="list-style: none; padding: 0; margin: 0;">
      ${data.dataSources.map(source => `
        <li style="padding: 8px 0; border-bottom: 1px solid #e0f2fe;">
          <strong style="color: #0284c7;">${source.type === 'primary' ? 'Primary' : source.type === 'secondary' ? 'Secondary' : 'Additional'} Source:</strong>
          ${source.name} - ${source.citation}
          ${source.url ? `<br><a href="${source.url}" style="color: #0ea5e9; font-size: 12px;">${source.url}</a>` : ''}
          <span style="font-size: 11px; color: #94a3b8; display: block;">Last updated: ${source.lastUpdated}</span>
        </li>
      `).join('')}
    </ul>
    <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
      <strong>Methodology:</strong> Base pricing from industry-standard databases, adjusted for regional cost variations 
      using HUD CBSA cost indices and BLS Consumer Price Index data. Waste factors applied per trade standards.
    </p>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Disclaimer:</strong> ${generateDisclaimer()}</p>
    <p>MaxClaim - Consumer Advocacy Tool | Generated by MaxClaim Analysis Engine</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate a summary text for email notifications.
 */
export function generateReportSummary(data: ClaimReportData): string {
  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `Insurance Offer: ${formatCurrency(data.summary.totalInsuranceOffer)} | ` +
    `Fair Market Value: ${formatCurrency(data.summary.totalFMV)} | ` +
    `Potential Additional: ${formatCurrency(data.summary.totalAdditional)} (+${data.summary.overallIncrease.toFixed(1)}%)`;
}
