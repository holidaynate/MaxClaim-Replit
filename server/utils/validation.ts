import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * ZIP Code validation - must be 5 digits
 */
export function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Validate claim item input
 * Ensures:
 * - Item name is not empty and under 200 characters
 * - Quantity is positive and under 10,000
 * - Unit price or quoted price is provided and positive
 * - ZIP code is valid if provided
 */
export function validateClaimInput(req: Request, res: Response, next: NextFunction) {
  const { zipCode, items } = req.body;

  // Validate ZIP code if provided
  if (zipCode && !isValidZipCode(zipCode)) {
    return res.status(400).json({ 
      error: 'Invalid ZIP code',
      details: 'ZIP code must be exactly 5 digits'
    });
  }

  // Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      error: 'Invalid items',
      details: 'At least one claim item is required'
    });
  }

  // Validate individual items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Validate description
    if (!item.description || typeof item.description !== 'string') {
      return res.status(400).json({ 
        error: `Invalid item ${i + 1}`,
        details: 'Item description is required'
      });
    }

    if (item.description.length > 200) {
      return res.status(400).json({ 
        error: `Invalid item ${i + 1}`,
        details: 'Item description must be under 200 characters'
      });
    }

    // Validate quantity
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 10000) {
      return res.status(400).json({ 
        error: `Invalid item ${i + 1}`,
        details: 'Quantity must be greater than 0 and less than 10,000'
      });
    }

    // Validate pricing (either unitPrice or quotedPrice must be provided and must be positive)
    const hasUnitPrice = item.unitPrice !== undefined && typeof item.unitPrice === 'number' && item.unitPrice > 0;
    const hasQuotedPrice = item.quotedPrice !== undefined && typeof item.quotedPrice === 'number' && item.quotedPrice > 0;

    if (!hasUnitPrice && !hasQuotedPrice) {
      return res.status(400).json({ 
        error: `Invalid item ${i + 1}`,
        details: 'Either unit price or quoted price is required and must be greater than zero'
      });
    }
  }

  next();
}

/**
 * Validate document upload
 * Ensures files are within size limits and allowed types
 */
export function validateFileUpload(maxSizeMB: number = 10, allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        details: 'Please upload a file'
      });
    }

    const file = req.file;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Check file size
    if (file.size > maxSizeBytes) {
      return res.status(400).json({ 
        error: 'File too large',
        details: `Maximum file size is ${maxSizeMB}MB`
      });
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        details: `Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove control characters and trim
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 1000); // Max length 1000 chars
}

/**
 * Validate admin password input
 */
export function validateAdminLogin(req: Request, res: Response, next: NextFunction) {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid request',
      details: 'Password is required'
    });
  }

  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ 
      error: 'Invalid password',
      details: 'Password must be between 6 and 128 characters'
    });
  }

  next();
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate partner data
 */
export const partnerSchema = z.object({
  businessName: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  website: z.string().url().optional(),
  phone: z.string().regex(/^[\d\s\(\)\-\+\.]+$/).optional(),
  email: z.string().email().optional(),
  tier: z.enum(['free', 'standard', 'premium']),
  serviceAreas: z.object({
    primary: z.object({
      areaCodes: z.array(z.string().regex(/^\d{3}$/)),
      zips: z.array(z.string().regex(/^\d{5}$/)),
    }),
    secondary: z.object({
      areaCodes: z.array(z.string().regex(/^\d{3}$/)).optional(),
      zips: z.array(z.string().regex(/^\d{5}$/)).optional(),
    }).optional(),
  }).optional(),
});

export type PartnerInput = z.infer<typeof partnerSchema>;
