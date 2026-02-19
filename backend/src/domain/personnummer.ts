interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validates a Swedish personnummer using the Luhn algorithm.
 * Accepts formats: YYYYMMDD-XXXX, YYMMDD-XXXX, YYYYMMDDXXXX, YYMMDDXXXX
 *
 * Century inference for 10-digit input:
 * - A `+` separator means the person is 100+ years old (previous century)
 * - Otherwise, the 2-digit year is compared to the current year to determine century
 */
export function validatePersonnummer(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Personal number is required" };
  }

  const trimmed = input.trim();

  // Detect the `+` separator (indicates 100+ years old)
  const hasPlusSeparator = trimmed.includes("+");

  // Strip whitespace and optional separator(s)
  const cleaned = trimmed.replace(/[-+]/g, "");

  // Extract digits only
  if (!/^\d{10,12}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Must be 10 or 12 digits (YYYYMMDD-XXXX or YYMMDD-XXXX)",
    };
  }

  // Normalize to 10 digits (YYMMDDXXXX) for Luhn
  const digits10 = cleaned.length === 12 ? cleaned.slice(2) : cleaned;

  // Validate date components
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

  // Determine century for the full 12-digit normalized form
  let normalized: string;
  if (cleaned.length === 12) {
    normalized = cleaned;
  } else {
    const shortYear = parseInt(digits10.slice(0, 2), 10);
    const currentYear = new Date().getFullYear();
    const currentShortYear = currentYear % 100;

    if (hasPlusSeparator) {
      // `+` means 100+ years old — always previous century relative to the inferred one
      const century = shortYear > currentShortYear ? (Math.floor(currentYear / 100) - 1) : Math.floor(currentYear / 100);
      normalized = `${century - 1}${digits10}`;
    } else {
      // Default: if the 2-digit year is greater than the current 2-digit year,
      // it must be from the previous century (e.g., 90 in 2025 → 1990)
      const century = shortYear > currentShortYear
        ? Math.floor(currentYear / 100) - 1
        : Math.floor(currentYear / 100);
      normalized = `${century}${digits10}`;
    }
  }

  return { valid: true, normalized };
}
