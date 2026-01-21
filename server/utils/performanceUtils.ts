/**
 * MaxClaim Performance Utilities
 * Timing wrappers and monitoring helpers for critical functions
 */

/**
 * Performance thresholds for different operation types (in milliseconds)
 */
export const PERFORMANCE_THRESHOLDS = {
  FAST: 50,        // Rotation, weight calculations
  NORMAL: 200,     // Database lookups, carrier intel
  SLOW: 500,       // OCR processing, external API calls
  VERY_SLOW: 2000, // Batch operations, full audits
} as const;

export type PerformanceCategory = keyof typeof PERFORMANCE_THRESHOLDS;

export interface TimingResult<T> {
  result: T;
  durationMs: number;
  category: PerformanceCategory;
  exceededThreshold: boolean;
}

/**
 * Wrap a synchronous function with timing measurement
 * Logs warning if execution exceeds the specified threshold
 * 
 * @param fn - Function to time
 * @param operationName - Name for logging
 * @param category - Performance category for threshold
 * @returns Result with timing info
 * 
 * @example
 * const { result, durationMs } = withTiming(
 *   () => calculateRotationWeights(partners, region, state, trade),
 *   "calculateRotationWeights",
 *   "FAST"
 * );
 */
export function withTiming<T>(
  fn: () => T,
  operationName: string,
  category: PerformanceCategory = "NORMAL"
): TimingResult<T> {
  const start = performance.now();
  const result = fn();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  
  const threshold = PERFORMANCE_THRESHOLDS[category];
  const exceededThreshold = durationMs > threshold;
  
  if (exceededThreshold) {
    console.warn(
      `[performance] ${operationName} took ${durationMs}ms (threshold: ${threshold}ms, category: ${category})`
    );
  }
  
  return { result, durationMs, category, exceededThreshold };
}

/**
 * Wrap an async function with timing measurement
 * Logs warning if execution exceeds the specified threshold
 * 
 * @param fn - Async function to time
 * @param operationName - Name for logging
 * @param category - Performance category for threshold
 * @returns Result with timing info
 */
export async function withTimingAsync<T>(
  fn: () => Promise<T>,
  operationName: string,
  category: PerformanceCategory = "NORMAL"
): Promise<TimingResult<T>> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  
  const threshold = PERFORMANCE_THRESHOLDS[category];
  const exceededThreshold = durationMs > threshold;
  
  if (exceededThreshold) {
    console.warn(
      `[performance] ${operationName} took ${durationMs}ms (threshold: ${threshold}ms, category: ${category})`
    );
  }
  
  return { result, durationMs, category, exceededThreshold };
}

/**
 * Create a timed version of any function
 * Useful for wrapping existing functions without modifying their signature
 */
export function createTimedFunction<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string,
  category: PerformanceCategory = "NORMAL"
): (...args: Parameters<T>) => TimingResult<ReturnType<T>> {
  return (...args: Parameters<T>) => {
    return withTiming(() => fn(...args), operationName, category);
  };
}

/**
 * Lead lifecycle status constants
 * Explicit status flow: PENDING → IN_PROGRESS → CLOSED → PAID
 */
export const LEAD_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  CLOSED: "closed",
  PAID: "paid",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type LeadStatus = typeof LEAD_STATUS[keyof typeof LEAD_STATUS];

/**
 * Valid status transitions for lead lifecycle
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LEAD_STATUS.PENDING]: [LEAD_STATUS.IN_PROGRESS, LEAD_STATUS.CANCELLED, LEAD_STATUS.EXPIRED],
  [LEAD_STATUS.IN_PROGRESS]: [LEAD_STATUS.CLOSED, LEAD_STATUS.CANCELLED],
  [LEAD_STATUS.CLOSED]: [LEAD_STATUS.PAID],
  [LEAD_STATUS.PAID]: [],
  [LEAD_STATUS.CANCELLED]: [],
  [LEAD_STATUS.EXPIRED]: [],
};

/**
 * Check if a lead status transition is valid
 */
export function isValidStatusTransition(currentStatus: LeadStatus, newStatus: LeadStatus): boolean {
  const validTransitions = LEAD_STATUS_TRANSITIONS[currentStatus];
  return validTransitions.includes(newStatus);
}

/**
 * Get display label for lead status
 */
export function getLeadStatusLabel(status: LeadStatus): string {
  switch (status) {
    case LEAD_STATUS.PENDING: return "Pending Review";
    case LEAD_STATUS.IN_PROGRESS: return "In Progress";
    case LEAD_STATUS.CLOSED: return "Closed - Awaiting Payment";
    case LEAD_STATUS.PAID: return "Paid";
    case LEAD_STATUS.CANCELLED: return "Cancelled";
    case LEAD_STATUS.EXPIRED: return "Expired";
    default: return "Unknown";
  }
}

/**
 * Get status color for UI display
 */
export function getLeadStatusColor(status: LeadStatus): {
  bg: string;
  text: string;
  tailwind: string;
} {
  switch (status) {
    case LEAD_STATUS.PENDING:
      return { bg: "#fbbf24", text: "#000000", tailwind: "yellow-400" };
    case LEAD_STATUS.IN_PROGRESS:
      return { bg: "#3b82f6", text: "#ffffff", tailwind: "blue-500" };
    case LEAD_STATUS.CLOSED:
      return { bg: "#8b5cf6", text: "#ffffff", tailwind: "violet-500" };
    case LEAD_STATUS.PAID:
      return { bg: "#22c55e", text: "#ffffff", tailwind: "green-500" };
    case LEAD_STATUS.CANCELLED:
      return { bg: "#ef4444", text: "#ffffff", tailwind: "red-500" };
    case LEAD_STATUS.EXPIRED:
      return { bg: "#6b7280", text: "#ffffff", tailwind: "gray-500" };
    default:
      return { bg: "#9ca3af", text: "#000000", tailwind: "gray-400" };
  }
}
