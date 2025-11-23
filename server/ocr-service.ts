// OCR Service for processing insurance claim documents
// Uses OCR.space API (primary) and Tesseract.js (fallback)

import { createWorker } from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import fs from 'fs/promises';

interface OCRResult {
  text: string;
  confidence?: number;
  source: 'ocr.space' | 'tesseract' | 'pdf-text';
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
    const data = await (pdfParse as any)(dataBuffer);
    
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

// Main OCR function with smart routing
export async function performOCR(filePath: string, mimeType: string): Promise<OCRResult> {
  console.log(`Processing OCR for file: ${filePath}, type: ${mimeType}`);
  
  // Strategy 1: If PDF, try text extraction first (fastest)
  if (mimeType === 'application/pdf') {
    const pdfText = await extractPDFText(filePath);
    if (pdfText) {
      console.log('PDF text extraction successful');
      return pdfText;
    }
    console.log('PDF is scanned, falling back to OCR');
  }

  // Strategy 2: Try OCR.space API (fast, accurate, but rate limited)
  const ocrSpaceResult = await ocrSpaceAPI(filePath);
  if (ocrSpaceResult) {
    console.log('OCR.space successful');
    return ocrSpaceResult;
  }

  // Strategy 3: Fallback to Tesseract.js (local, no limits, slower)
  console.log('Falling back to Tesseract.js');
  const tesseractResult = await tesseractOCR(filePath);
  if (tesseractResult) {
    console.log('Tesseract OCR successful');
    return tesseractResult;
  }

  // If all fail, throw error
  throw new Error('OCR processing failed with all available engines');
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
