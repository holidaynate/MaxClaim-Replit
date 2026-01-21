/**
 * PaddleOCR Integration Service
 * GPU-accelerated OCR for high-volume document processing
 * 
 * This service provides a primary OCR option when a PaddleOCR
 * server is available, falling back to OCR.space or Tesseract.js
 * when unavailable.
 */

interface PaddleOCRConfig {
  enabled: boolean;
  endpoint: string;
  timeout: number;
  maxRetries: number;
}

interface OCRResult {
  success: boolean;
  text: string;
  textBlocks?: Array<{
    text: string;
    confidence: number;
    bbox: number[];
  }>;
  confidence: number;
  processingTime: number;
  source: string;
}

const DEFAULT_CONFIG: PaddleOCRConfig = {
  enabled: !!process.env.PADDLEOCR_API_URL,
  endpoint: process.env.PADDLEOCR_API_URL || "http://localhost:8000",
  timeout: 30000,
  maxRetries: 2,
};

let lastHealthCheck: { status: boolean; timestamp: number } | null = null;
const HEALTH_CHECK_TTL = 60000; // 1 minute

/**
 * Check if PaddleOCR service is available
 */
export async function checkHealth(): Promise<boolean> {
  // Return cached result if recent
  if (lastHealthCheck && Date.now() - lastHealthCheck.timestamp < HEALTH_CHECK_TTL) {
    return lastHealthCheck.status;
  }

  if (!DEFAULT_CONFIG.enabled) {
    lastHealthCheck = { status: false, timestamp: Date.now() };
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${DEFAULT_CONFIG.endpoint}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const status = response.ok;
    lastHealthCheck = { status, timestamp: Date.now() };
    return status;
  } catch (error) {
    lastHealthCheck = { status: false, timestamp: Date.now() };
    return false;
  }
}

/**
 * Extract text from an image using PaddleOCR
 */
export async function extractFromImage(
  imageBuffer: Buffer,
  mimeType: string = "image/png"
): Promise<OCRResult> {
  const startTime = Date.now();

  // Check if PaddleOCR is available
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    return {
      success: false,
      text: "",
      confidence: 0,
      processingTime: Date.now() - startTime,
      source: "paddleocr",
    };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append("file", blob, "document.png");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeout);

    const response = await fetch(`${DEFAULT_CONFIG.endpoint}/api/v1/ocr/extract`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`PaddleOCR API returned ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      text: data.full_text || "",
      textBlocks: data.text_blocks || [],
      confidence: data.confidence || 0.8,
      processingTime: Date.now() - startTime,
      source: "paddleocr",
    };
  } catch (error: any) {
    console.error("[PaddleOCR] Extraction failed:", error.message);
    return {
      success: false,
      text: "",
      confidence: 0,
      processingTime: Date.now() - startTime,
      source: "paddleocr",
    };
  }
}

/**
 * Extract text from a PDF using PaddleOCR
 */
export async function extractFromPDF(
  pdfBuffer: Buffer
): Promise<OCRResult & { pageCount?: number }> {
  const startTime = Date.now();

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    return {
      success: false,
      text: "",
      confidence: 0,
      processingTime: Date.now() - startTime,
      source: "paddleocr",
    };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });
    formData.append("file", blob, "document.pdf");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeout * 2); // PDFs take longer

    const response = await fetch(`${DEFAULT_CONFIG.endpoint}/api/v1/ocr/extract-pdf`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`PaddleOCR API returned ${response.status}`);
    }

    const data = await response.json();

    // Combine text from all pages
    const fullText = data.pages?.map((p: any) => p.text).join("\n\n") || "";

    return {
      success: true,
      text: fullText,
      textBlocks: data.pages?.flatMap((p: any) => p.text_blocks) || [],
      confidence: data.overall_confidence || 0.8,
      processingTime: Date.now() - startTime,
      source: "paddleocr",
      pageCount: data.pages?.length || 0,
    };
  } catch (error: any) {
    console.error("[PaddleOCR] PDF extraction failed:", error.message);
    return {
      success: false,
      text: "",
      confidence: 0,
      processingTime: Date.now() - startTime,
      source: "paddleocr",
    };
  }
}

/**
 * Parse insurance document items from OCR text
 */
export function parseInsuranceItems(text: string): Array<{
  csiCode: string;
  description: string;
  quantity: number;
  flagged: boolean;
}> {
  const damageLookup: Record<string, string> = {
    roof: "07-3",
    shingle: "07-3",
    gutter: "07-4",
    downspout: "07-4",
    fascia: "07-4",
    siding: "08-1",
    vinyl: "08-1",
    stucco: "08-1",
    window: "08-5",
    glass: "08-5",
    frame: "08-5",
    door: "08-1",
    water: "07-2",
    flood: "07-2",
    leak: "07-2",
    hail: "07-3",
    dent: "07-3",
    impact: "07-3",
    wind: "07-3",
    hvac: "15-0",
    electrical: "16-0",
    plumbing: "15-1",
    drywall: "09-2",
    paint: "09-9",
    flooring: "09-6",
    carpet: "09-6",
    tile: "09-3",
  };

  const textLower = text.toLowerCase();
  const items: Array<{
    csiCode: string;
    description: string;
    quantity: number;
    flagged: boolean;
  }> = [];

  for (const [keyword, csiCode] of Object.entries(damageLookup)) {
    if (textLower.includes(keyword)) {
      // Avoid duplicates for same CSI code
      if (!items.some(i => i.csiCode === csiCode)) {
        items.push({
          csiCode,
          description: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} damage identified`,
          quantity: 1,
          flagged: true,
        });
      }
    }
  }

  return items.length > 0 ? items : [{
    csiCode: "00-0",
    description: "Unclassified damage",
    quantity: 1,
    flagged: true,
  }];
}

/**
 * Get PaddleOCR service status
 */
export async function getStatus(): Promise<{
  enabled: boolean;
  healthy: boolean;
  endpoint: string;
  lastCheck: number | null;
}> {
  const isHealthy = await checkHealth();
  return {
    enabled: DEFAULT_CONFIG.enabled,
    healthy: isHealthy,
    endpoint: DEFAULT_CONFIG.endpoint,
    lastCheck: lastHealthCheck?.timestamp || null,
  };
}
