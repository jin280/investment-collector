interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePersonnummer(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Personal number is required" };
  }

  const cleaned = input.trim().replace(/[-+]/g, "");

  if (!/^\d{10,12}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Must be 10 or 12 digits (YYYYMMDD-XXXX)",
    };
  }

  const digits10 = cleaned.length === 12 ? cleaned.slice(2) : cleaned;

  const month = parseInt(digits10.slice(2, 4), 10);
  const day = parseInt(digits10.slice(4, 6), 10);

  if (month < 1 || month > 12) return { valid: false, error: "Invalid month" };
  if (day < 1 || day > 31) return { valid: false, error: "Invalid day" };

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
    return { valid: false, error: "Invalid personal number" };
  }

  return { valid: true };
}
