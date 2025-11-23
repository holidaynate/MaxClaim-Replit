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
}

export function parseInsuranceDocument(text: string): ParsedClaimItem[] {
  const items: ParsedClaimItem[] = [];
  const processedRanges: Array<{start: number, end: number}> = [];
  
  function isOverlapping(start: number, end: number): boolean {
    return processedRanges.some(range => 
      // Check all overlap cases: partial overlap, full containment, or full enclosure
      (start >= range.start && start <= range.end) ||
      (end >= range.start && end <= range.end) ||
      (start <= range.start && end >= range.end) ||
      (start >= range.start && end <= range.end)
    );
  }
  
  function isSummaryLine(text: string): boolean {
    const summaryKeywords = /\b(subtotal|tax|balance|grand total|sum|amount due|payment)\b/i;
    return summaryKeywords.test(text);
  }
  
  function hasTotalKeyword(text: string): boolean {
    // Check if line explicitly says this IS a total (not per-unit)
    return /\btotal\s*price\b|\btotal\s*cost\b|\btotal\s*\$|\btotal\s*amount\b/i.test(text);
  }
  
  function markProcessed(start: number, end: number) {
    processedRanges.push({ start, end });
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

  // PRIORITY 1: Quantity with EXPLICIT unit-price pattern
  // Only multiply when there's a clear per-unit indicator: @, "each", "per"
  // BUT NOT when "total" keyword is present (e.g., "@ total $450" means $450 is the total)
  const qtyUnitPricePattern = /(\d+(?:\.\d+)?)\s+(?:sq(?:uare)?s?|gallons?|units?|feet|ft|yards?|yd)?\s*([A-Za-z\s]+?)[\s@]+[@]?\s*\$?([\d,]+\.?\d*)\s*(?:each|per|@)?/gi;
  let match;
  while ((match = qtyUnitPricePattern.exec(text)) !== null) {
    // Check if this line has a clear unit-price marker (@, each, per)
    const hasUnitPriceMarker = /@|each|per/i.test(match[0]);
    // Check if line says this is a "total" (not per-unit)
    const explicitTotal = hasTotalKeyword(match[0]);
    
    if (!isOverlapping(match.index, match.index + match[0].length) && !isSummaryLine(match[0]) && hasUnitPriceMarker && !explicitTotal) {
      const quantity = parseFloat(match[1]);
      const description = match[2].trim();
      const pricePerUnit = parsePrice(match[3]);
      
      if (quantity > 0 && pricePerUnit > 0 && description.length > 2 && !isSummaryLine(description)) {
        // ONLY multiply when we have a unit-price marker AND no "total" keyword
        const totalPrice = quantity * pricePerUnit;
        
        items.push({
          category: detectCategory(description),
          description: description,
          quantity: quantity,
          quotedPrice: totalPrice,
          confidence: 'high'
        });
        markProcessed(match.index, match.index + match[0].length);
      }
    }
  }
  
  // PRIORITY 1B: Quantity and total price (NO unit-price marker)
  // Matches: "25 sq ft drywall 450.00" where 450 is already the total
  const qtyTotalPattern = /(\d+(?:\.\d+)?)\s+(?:sq(?:uare)?s?|gallons?|units?|feet|ft|yards?|yd)?\s*([A-Za-z\s]+?)\s+\$?([\d,]+\.?\d*)/gi;
  while ((match = qtyTotalPattern.exec(text)) !== null) {
    // Skip if this has a unit-price marker (already processed above)
    const hasUnitPriceMarker = /@|each|per/i.test(match[0]);
    
    if (!hasUnitPriceMarker && !isOverlapping(match.index, match.index + match[0].length) && !isSummaryLine(match[0])) {
      const quantity = parseFloat(match[1]);
      const description = match[2].trim();
      const totalPrice = parsePrice(match[3]);
      
      if (quantity > 0 && totalPrice > 0 && description.length > 2 && !isSummaryLine(description)) {
        // Price is already the total (no multiplication)
        items.push({
          category: detectCategory(description),
          description: description,
          quantity: quantity,
          quotedPrice: totalPrice,
          confidence: 'high'
        });
        markProcessed(match.index, match.index + match[0].length);
      }
    }
  }

  // PRIORITY 2: Table format "Description | Qty | Price"
  // Assumes price column is TOTAL (not per-unit), which is standard for insurance documents
  const tablePattern = /([A-Za-z\s]{3,})\s*[\|]\s*(\d+(?:\.\d+)?)\s*[\|]\s*\$?([\d,]+\.?\d*)/gi;
  tablePattern.lastIndex = 0;
  while ((match = tablePattern.exec(text)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length) && !isSummaryLine(match[0])) {
      const description = match[1].trim();
      const quantity = parseFloat(match[2]);
      const totalPrice = parsePrice(match[3]);
      
      if (quantity > 0 && totalPrice > 0 && description.length > 2 && !isSummaryLine(description)) {
        items.push({
          category: detectCategory(description),
          description: description,
          quantity: quantity,
          quotedPrice: totalPrice,
          confidence: 'high'
        });
        markProcessed(match.index, match.index + match[0].length);
      }
    }
  }

  // PRIORITY 3: Simple line items with prices (least specific, only if no quantity found)
  // Matches: "Roofing repair - $1,250.00" or "Paint: $500"
  const lineItemPattern = /([A-Za-z\s]{5,})[\s\-:]+\$?([\d,]+\.?\d*)/gi;
  lineItemPattern.lastIndex = 0;
  while ((match = lineItemPattern.exec(text)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length) && !isSummaryLine(match[0])) {
      const description = match[1].trim();
      const totalPrice = parsePrice(match[2]);
      
      // Only add if this looks like a reasonable price (>= $50 to avoid false positives)
      // and exclude summary lines
      if (totalPrice >= 50 && description.length > 3 && description.length < 100 && !isSummaryLine(description)) {
        items.push({
          category: detectCategory(description),
          description: description,
          quantity: 1,
          quotedPrice: totalPrice,
          confidence: 'medium'
        });
        markProcessed(match.index, match.index + match[0].length);
      }
    }
  }

  // Return all parsed items without deduplication
  // Users can manually remove duplicates if needed
  // Preserves legitimate duplicate line items from different sections
  return items;
}
