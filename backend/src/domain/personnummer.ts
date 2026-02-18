interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validates a Swedish personnummer using the Luhn algorithm.
 * Accepts formats: YYYYMMDD-XXXX, YYMMDD-XXXX, YYYYMMDDXXXX, YYMMDDXXXX
 */
export function validatePersonnummer(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Personal number is required" };
  }

  // Strip whitespace and optional separator
  const cleaned = input.trim().replace(/[-+]/, "");

  // Extract digits only
  if (!/^\d{10,12}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Must be 10 or 12 digits (YYYYMMDD-XXXX or YYMMDD-XXXX)",
    };
  }

  // Normalize to 10 digits (YYMMDDXXXX)
  const digits10 = cleaned.length === 12 ? cleaned.slice(2) : cleaned;

  // Validate date components
  const year = parseInt(digits10.slice(0, 2), 10);
  const month = parseInt(digits10.slice(2, 4), 10);
  const day = parseInt(digits10.slice(4, 6), 10);

  if (month < 1 || month > 12) {
    return { valid: false, error: "Invalid month" };
  }
  if (day < 1 || day > 31) {
    return { valid: false, error: "Invalid day" };
  }

  // Luhn checksum on the 10-digit number
  const luhnDigits = digits10.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = luhnDigits[i];
    if (i % 2 === 0) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    sum += val;
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  if (checkDigit !== luhnDigits[9]) {
    return { valid: false, error: "Invalid checksum" };
  }

  // Return the full 12-digit form for storage
  const normalized =
    cleaned.length === 12 ? cleaned : `19${digits10}`;

  return { valid: true, normalized };
}
