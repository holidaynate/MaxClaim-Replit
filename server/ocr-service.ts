// OCR Service for processing insurance claim documents
// Cascading fallback: PaddleOCR → OCR.space → Tesseract.js → Manual Entry

import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import fs from 'fs/promises';

export type OCRSource = 'paddle-ocr' | 'ocr.space' | 'tesseract' | 'pdf-text' | 'manual-entry';

interface OCRResult {
  text: string;
  confidence?: number;
  source: OCRSource;
  processingTimeMs?: number;
  requiresManualEntry?: boolean;
  metadata?: {
    engineVersion?: string;
    fallbackReason?: string;
  };
}

// PaddleOCR via HTTP API (GPU-accelerated, highest accuracy)
// Requires: PADDLEOCR_API_URL environment variable
async function paddleOCR(filePath: string): Promise<OCRResult | null> {
  const apiUrl = process.env.PADDLEOCR_API_URL;
  if (!apiUrl) {
    return null;
  }

  const startTime = Date.now();
  try {
    const fileBuffer = await fs.readFile(filePath);
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]));
    formData.append('ocr_type', 'ocr'); // ocr, structure, or table

    const response = await fetch(`${apiUrl}/ocr/predict`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      console.warn(`PaddleOCR API returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.result || !Array.isArray(data.result)) {
      console.warn('PaddleOCR returned unexpected format');
      return null;
    }

    // PaddleOCR returns array of [bbox, [text, confidence]]
    const textParts = data.result.map((item: any) => {
      if (Array.isArray(item) && item[1] && Array.isArray(item[1])) {
        return item[1][0]; // Extract text
      }
      return '';
    }).filter(Boolean);

    const avgConfidence = data.result.reduce((acc: number, item: any) => {
      if (Array.isArray(item) && item[1] && Array.isArray(item[1])) {
        return acc + (item[1][1] || 0);
      }
      return acc;
    }, 0) / Math.max(data.result.length, 1);

    return {
      text: textParts.join('\n'),
      confidence: avgConfidence * 100,
      source: 'paddle-ocr',
      processingTimeMs: Date.now() - startTime,
      metadata: {
        engineVersion: 'PaddleOCR v2.7',
      },
    };
  } catch (error) {
    console.error('PaddleOCR API error:', error);
    return null;
  }
}

// OCR.space API (Free tier: 500 requests/day)
async function ocrSpaceAPI(filePath: string): Promise<OCRResult | null> {
  try {
    const formData = new FormData();
    const fileBuffer = await fs.readFile(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob);
    formData.append('apikey', process.env.OCR_SPACE_API_KEY || 'helloworld'); // Free tier key
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 for better accuracy

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      console.warn(`OCR.space API returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.OCRExitCode !== 1 || !data.ParsedResults?.[0]?.ParsedText) {
      console.warn('OCR.space parsing failed:', data.ErrorMessage);
      return null;
    }

    return {
      text: data.ParsedResults[0].ParsedText,
      confidence: parseFloat(data.ParsedResults[0].FileParseExitCode),
      source: 'ocr.space'
    };
  } catch (error) {
    console.error('OCR.space API error:', error);
    return null;
  }
}

// Tesseract.js fallback (runs locally, no API needed)
async function tesseractOCR(filePath: string): Promise<OCRResult | null> {
  let worker = null;
  try {
    worker = await createWorker('eng');
    
    const { data } = await worker.recognize(filePath);
    
    return {
      text: data.text,
      confidence: data.confidence,
      source: 'tesseract'
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return null;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

// Extract text from PDF (if it's searchable/not scanned)
async function extractPDFText(filePath: string): Promise<OCRResult | null> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    // If PDF has extractable text (not scanned), use it
    if (data.text && data.text.trim().length > 50) {
      return {
        text: data.text,
        source: 'pdf-text'
      };
    }
    
    return null;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return null;
  }
}

// Main OCR function with cascading fallback:
// PaddleOCR → OCR.space → Tesseract.js → Manual Entry
export async function performOCR(filePath: string, mimeType: string): Promise<OCRResult> {
  console.log(`[OCR] Processing file: ${filePath}, type: ${mimeType}`);
  const startTime = Date.now();
  let fallbackReason = '';
  
  // Strategy 1: If PDF, try text extraction first (fastest)
  if (mimeType === 'application/pdf') {
    const pdfText = await extractPDFText(filePath);
    if (pdfText) {
      console.log('[OCR] PDF text extraction successful');
      return {
        ...pdfText,
        processingTimeMs: Date.now() - startTime,
      };
    }
    console.log('[OCR] PDF is scanned, falling back to OCR');
    fallbackReason = 'PDF is scanned/image-based';
  }

  // Strategy 2: Try PaddleOCR (GPU-accelerated, highest accuracy)
  if (process.env.PADDLEOCR_API_URL) {
    const paddleResult = await paddleOCR(filePath);
    if (paddleResult) {
      console.log('[OCR] PaddleOCR successful');
      return paddleResult;
    }
    fallbackReason = 'PaddleOCR unavailable';
    console.log('[OCR] PaddleOCR failed, trying OCR.space');
  }

  // Strategy 3: Try OCR.space API (fast, accurate, but rate limited)
  const ocrSpaceResult = await ocrSpaceAPI(filePath);
  if (ocrSpaceResult) {
    console.log('[OCR] OCR.space successful');
    return {
      ...ocrSpaceResult,
      processingTimeMs: Date.now() - startTime,
      metadata: {
        fallbackReason,
      },
    };
  }
  fallbackReason = fallbackReason || 'OCR.space unavailable or rate limited';

  // Strategy 4: Fallback to Tesseract.js (local, no limits, slower)
  console.log('[OCR] Falling back to Tesseract.js');
  const tesseractResult = await tesseractOCR(filePath);
  if (tesseractResult) {
    console.log('[OCR] Tesseract.js successful');
    return {
      ...tesseractResult,
      processingTimeMs: Date.now() - startTime,
      metadata: {
        fallbackReason,
      },
    };
  }

  // Strategy 5: Return manual entry flag (UI will show form)
  console.log('[OCR] All OCR engines failed, requesting manual entry');
  return {
    text: '',
    source: 'manual-entry',
    requiresManualEntry: true,
    processingTimeMs: Date.now() - startTime,
    metadata: {
      fallbackReason: 'All OCR engines failed',
    },
  };
}

// Get OCR service status for health checks
export function getOCRServiceStatus(): {
  primary: string;
  fallbacks: string[];
  configured: boolean;
} {
  const hasPaddleOCR = !!process.env.PADDLEOCR_API_URL;
  const hasOCRSpace = !!process.env.OCR_SPACE_API_KEY;

  return {
    primary: hasPaddleOCR ? 'PaddleOCR' : hasOCRSpace ? 'OCR.space' : 'Tesseract.js',
    fallbacks: [
      ...(hasPaddleOCR ? ['OCR.space', 'Tesseract.js', 'Manual Entry'] : []),
      ...(!hasPaddleOCR && hasOCRSpace ? ['Tesseract.js', 'Manual Entry'] : []),
      ...(!hasPaddleOCR && !hasOCRSpace ? ['Manual Entry'] : []),
    ],
    configured: hasPaddleOCR || hasOCRSpace,
  };
}

// Parse extracted text to identify claim items and costs
interface ParsedClaimItem {
  category: string;
  description: string;
  quantity: number;
  quotedPrice: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceReason?: string;
}

export function parseInsuranceDocument(text: string): ParsedClaimItem[] {
  const items: ParsedClaimItem[] = [];
  
  // Normalize text: clean up whitespace and line breaks
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  function isSummaryLine(line: string): boolean {
    // Only match summary keywords at the START of the line (not embedded in descriptions)
    // Matches: "Total", "TOTAL", "Subtotal", "Tax", "Total Due", etc.
    return /^(total|subtotal|tax|balance|grand\s*total|sum|amount\s*due|payment)/i.test(line.trim());
  }

  // Category keywords mapping
  const categoryKeywords: Record<string, string[]> = {
    'Roofing': ['roof', 'shingle', 'gutter', 'flashing'],
    'Flooring': ['floor', 'carpet', 'tile', 'hardwood', 'laminate'],
    'Drywall': ['drywall', 'sheetrock', 'wall', 'ceiling'],
    'Painting': ['paint', 'primer', 'coating'],
    'Plumbing': ['plumb', 'pipe', 'faucet', 'toilet', 'sink', 'water'],
    'Electrical': ['electric', 'wiring', 'outlet', 'circuit', 'panel'],
    'HVAC': ['hvac', 'ac', 'air condition', 'heat', 'furnace'],
    'Windows & Doors': ['window', 'door', 'glass'],
    'Appliances': ['appliance', 'refrigerator', 'stove', 'dishwasher'],
    'Cabinets': ['cabinet', 'counter']
  };

  function detectCategory(text: string): string {
    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    return 'Other';
  }

  function parsePrice(priceStr: string): number {
    return parseFloat(priceStr.replace(/[,$]/g, ''));
  }

  // Conservative parsing: Process each line, assuming prices are TOTALS by default
  for (const line of normalizedText) {
    if (isSummaryLine(line)) {
      continue; // Skip summary rows entirely
    }

    // Pattern 1: Table format "Description | Qty | Price" (most structured)
    const tableMatch = line.match(/^([A-Za-z\s]{3,})\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*\$?([\d,]+\.?\d*)$/);
    if (tableMatch) {
      const description = tableMatch[1].trim();
      const quantity = parseFloat(tableMatch[2]);
      const price = parsePrice(tableMatch[3]);
      
      if (quantity > 0 && price >= 50) {
        items.push({
          category: detectCategory(description),
          description,
          quantity,
          quotedPrice: price,
          confidence: 'high',
          confidenceReason: 'Structured table format'
        });
        continue;
      }
    }

    // Pattern 2: Quantity + description + price (assume price is TOTAL)
    const qtyMatch = line.match(/(\d+(?:\.\d+)?)\s+(?:sq(?:uare)?s?|ft|feet|gallons?|units?)?\s*([A-Za-z\s]{3,}?)\s+[\-:$]?\s*\$?([\d,]+\.?\d*)/);
    if (qtyMatch) {
      const quantity = parseFloat(qtyMatch[1]);
      const description = qtyMatch[2].trim();
      const price = parsePrice(qtyMatch[3]);
      
      if (quantity > 0 && price >= 50 && description.length > 2) {
        items.push({
          category: detectCategory(description),
          description,
          quantity,
          quotedPrice: price,
          confidence: 'high',
          confidenceReason: 'Assumed price is total'
        });
        continue;
      }
    }

    // Pattern 3: Description + price (no quantity, assume qty=1)
    const descMatch = line.match(/([A-Za-z\s]{5,})[\s\-:]+\$?([\d,]+\.?\d*)/);
    if (descMatch) {
      const description = descMatch[1].trim();
      const price = parsePrice(descMatch[2]);
      
      if (price >= 50 && description.length > 3 && description.length < 100) {
        items.push({
          category: detectCategory(description),
          description,
          quantity: 1,
          quotedPrice: price,
          confidence: 'medium',
          confidenceReason: 'No quantity found, assumed 1'
        });
        continue;
      }
    }
  }

  return items;
}
