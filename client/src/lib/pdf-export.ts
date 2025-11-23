import { jsPDF } from 'jspdf';

interface ItemResult {
  category: string;
  description: string;
  quantity: number;
  insuranceOffer: number;
  fmvPrice: number;
  additionalAmount: number;
  percentageIncrease: number;
  status: 'underpaid' | 'fair';
}

interface RegionalContext {
  femaClaimCount: number;
  avgFEMAPayment: number;
  inflationAdjustment: number;
  topComplaints: Array<{ company: string; count: number }>;
}

interface AnalysisResponse {
  zipCode: string;
  items: ItemResult[];
  summary: {
    totalInsuranceOffer: number;
    totalFMV: number;
    totalAdditional: number;
    overallIncrease: number;
  };
  regionalContext?: RegionalContext;
}

export function exportResultsToPDF(results: AnalysisResponse): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper function to add text with automatic page breaks
  const addText = (text: string, x: number, fontSize: number = 10, style: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(fontSize);
    if (style === 'bold') {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(text, x, yPos);
    yPos += fontSize / 2 + 2;
  };

  const addLine = () => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
  };

  // Header
  addText('MAX-CLAIM', margin, 20, 'bold');
  addText('Fair Market Value Insurance Claim Analysis', margin, 12);
  yPos += 5;
  addLine();

  // Date and ZIP code
  addText(`Report Generated: ${new Date().toLocaleDateString()}`, margin, 10);
  addText(`Analysis Location: ZIP Code ${results.zipCode}`, margin, 10);
  yPos += 5;
  addLine();

  // Summary Section
  addText('CLAIM SUMMARY', margin, 14, 'bold');
  yPos += 2;
  addText(`Insurance Company Offer: $${results.summary.totalInsuranceOffer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin, 11);
  addText(`Fair Market Value (FMV): $${results.summary.totalFMV.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin, 11, 'bold');
  addText(`Additional Amount You Deserve: $${results.summary.totalAdditional.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin, 11, 'bold');
  addText(`Percentage Increase: ${results.summary.overallIncrease.toFixed(1)}%`, margin, 11);
  yPos += 5;
  addLine();

  // Itemized Breakdown
  addText('ITEMIZED BREAKDOWN', margin, 14, 'bold');
  yPos += 2;

  results.items.forEach((item, index) => {
    // Check if we need a new page for this item
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    addText(`Item ${index + 1}: ${item.category} - ${item.description}`, margin, 10, 'bold');
    addText(`  Quantity: ${item.quantity}`, margin + 5, 9);
    addText(`  Insurance Offer: $${item.insuranceOffer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, 9);
    addText(`  Fair Market Value: $${item.fmvPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, 9);
    addText(`  Additional Amount: $${item.additionalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (+${item.percentageIncrease.toFixed(1)}%)`, margin + 5, 9);
    addText(`  Status: ${item.status === 'underpaid' ? 'UNDERPAID' : 'Fair Offer'}`, margin + 5, 9, item.status === 'underpaid' ? 'bold' : 'normal');
    yPos += 2;
  });

  yPos += 3;
  addLine();

  // Regional Context (if available)
  if (results.regionalContext) {
    addText('REGIONAL INSURANCE DATA', margin, 14, 'bold');
    yPos += 2;

    if (results.regionalContext.femaClaimCount > 0) {
      addText(`Historical FEMA Claims in Your Area: ${results.regionalContext.femaClaimCount}`, margin, 10);
      if (results.regionalContext.avgFEMAPayment > 0) {
        addText(`  Average FEMA Payment: $${results.regionalContext.avgFEMAPayment.toLocaleString()}`, margin + 5, 9);
      }
    }

    if (results.regionalContext.inflationAdjustment !== 0) {
      addText(`Construction Cost Inflation (YoY): ${results.regionalContext.inflationAdjustment > 0 ? '+' : ''}${results.regionalContext.inflationAdjustment}%`, margin, 10);
      addText(`  Source: Bureau of Labor Statistics (BLS)`, margin + 5, 9);
    } else {
      addText(`Construction Cost Inflation: BLS data unavailable - using static pricing`, margin, 10);
    }

    if (results.regionalContext.topComplaints && results.regionalContext.topComplaints.length > 0) {
      yPos += 2;
      addText(`Most Complained About Insurers (Texas DOI):`, margin, 10, 'bold');
      results.regionalContext.topComplaints.forEach((complaint) => {
        addText(`  ${complaint.company}: ${complaint.count} complaints`, margin + 5, 9);
      });
    }

    yPos += 3;
    addLine();
  }

  // Resource Links
  addText('ASSISTANCE & DISASTER RELIEF RESOURCES', margin, 14, 'bold');
  yPos += 2;
  addText('The following resources are available for homeowners in your area:', margin, 9);
  yPos += 2;

  const resources = [
    { name: 'FEMA Disaster Assistance Programs', url: 'www.fema.gov/assistance/individual/program' },
    { name: 'Local 211 Services', url: 'www.211.org' },
    { name: 'Texas Homeowner Assistance', url: 'www.texashomeownerassistance.com' },
    { name: 'HUD Repair Programs', url: 'www.hud.gov/info/disasterresources' },
    { name: 'BLS Replacement Cost Index', url: 'www.bls.gov/ppi' },
    { name: 'TDI Insurance Complaints', url: 'data.texas.gov/dataset/Insurance-Complaints-All-Data' }
  ];

  resources.forEach((resource) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    addText(`${resource.name}`, margin, 9, 'bold');
    addText(`  ${resource.url}`, margin + 5, 8);
    yPos += 1;
  });

  yPos += 5;
  addLine();

  // Legal Disclaimers
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }

  addText('LEGAL DISCLAIMERS', margin, 12, 'bold');
  yPos += 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const disclaimers = [
    'Educational Tool Only: Max-Claim is a free consumer advocacy and educational resource. This report provides estimated fair market values for informational purposes only and does not constitute professional appraisal, legal advice, or insurance claim representation.',
    '',
    'Not a Licensed Service: Max-Claim is not a licensed public adjuster, appraiser, attorney, or insurance professional. For professional claim assistance, consult qualified experts in your area.',
    '',
    'No Guarantees: Fair Market Value estimates are based on regional data, external API sources, and industry averages. Actual replacement costs may vary. We make no guarantees regarding claim outcomes or settlement amounts.',
    '',
    'Privacy Notice: Max-Claim does not collect personally identifiable information. Only ZIP codes and item categories are stored for regional pricing analysis. No names, addresses, policy numbers, or contact information are collected.',
    '',
    'External Data Sources: Regional context information is sourced from FEMA NFIP Claims API, Bureau of Labor Statistics (BLS) Construction PPI, and Texas Department of Insurance public complaint records. Max-Claim is not responsible for accuracy of third-party data.',
  ];

  disclaimers.forEach((line) => {
    if (line === '') {
      yPos += 2;
    } else {
      const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
      lines.forEach((textLine: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(textLine, margin, yPos);
        yPos += 4;
      });
    }
  });

  // Footer on last page
  yPos += 5;
  doc.setFontSize(8);
  doc.text('Generated by Max-Claim - Free Consumer Advocacy Tool', margin, yPos);
  doc.text(`Report Date: ${new Date().toLocaleString()}`, margin, yPos + 4);

  // Save the PDF
  const fileName = `MaxClaim_FMV_Report_${results.zipCode}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
