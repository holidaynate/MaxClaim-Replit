/**
 * Agent Reference Code Utility
 * Format: MarRod8125 = first3(firstName) + first3(lastName) + last2(birthYear) + last2(joinYear)
 * Used for tracking which agent signed up which partner for commission attribution
 */

/**
 * Generate unique agent reference code
 * @param firstName Agent's first name
 * @param lastName Agent's last name
 * @param birthYear Agent's birth year (4 digits, e.g. 1981)
 * @param joinedYear Year agent joined (defaults to current year)
 * @returns 10-character reference code like "marrod8125"
 */
export function generateAgentRefCode(
  firstName: string,
  lastName: string,
  birthYear: number,
  joinedYear: number = new Date().getFullYear()
): string {
  const first3 = firstName.substring(0, 3).toLowerCase().padEnd(3, 'x');
  const last3 = lastName.substring(0, 3).toLowerCase().padEnd(3, 'x');
  const birthYY = String(birthYear).slice(-2);
  const joinYY = String(joinedYear).slice(-2);
  
  return `${first3}${last3}${birthYY}${joinYY}`;
}

/**
 * Parse agent reference code back to components for validation
 * @param code 10-character reference code
 * @returns Parsed components
 */
export function parseAgentRefCode(code: string): {
  first3: string;
  last3: string;
  birthYY: string;
  joinYY: string;
} {
  if (!code || code.length !== 10) {
    throw new Error("Invalid agent code format (must be 10 characters)");
  }
  
  const lowerCode = code.toLowerCase();
  
  return {
    first3: lowerCode.slice(0, 3),
    last3: lowerCode.slice(3, 6),
    birthYY: lowerCode.slice(6, 8),
    joinYY: lowerCode.slice(8, 10),
  };
}

/**
 * Validate agent reference code format
 * @param code The code to validate
 * @returns true if format is valid
 */
export function isValidAgentRefCodeFormat(code: string): boolean {
  if (!code || code.length !== 10) {
    return false;
  }
  
  const alphaPattern = /^[a-zA-Z]{6}$/;
  const numPattern = /^[0-9]{4}$/;
  
  const alphaPart = code.slice(0, 6);
  const numPart = code.slice(6, 10);
  
  return alphaPattern.test(alphaPart) && numPattern.test(numPart);
}

/**
 * Generate a unique agent ref code, adding suffix if needed
 * Use this when creating agents to ensure uniqueness
 */
export async function generateUniqueAgentRefCode(
  firstName: string,
  lastName: string,
  birthYear: number,
  joinedYear: number,
  existingCodes: string[]
): Promise<string> {
  const baseCode = generateAgentRefCode(firstName, lastName, birthYear, joinedYear);
  
  if (!existingCodes.includes(baseCode)) {
    return baseCode;
  }
  
  for (let i = 1; i <= 99; i++) {
    const suffix = String(i).padStart(2, '0');
    const modifiedCode = baseCode.slice(0, 8) + suffix;
    if (!existingCodes.includes(modifiedCode)) {
      return modifiedCode;
    }
  }
  
  throw new Error("Unable to generate unique agent reference code - too many duplicates");
}
