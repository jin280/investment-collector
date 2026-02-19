import { describe, it, expect } from "vitest";
import { validatePersonnummer } from "./personnummer.js";

describe("validatePersonnummer", () => {
  describe("valid personnummer", () => {
    it("accepts 12-digit format (YYYYMMDDXXXX)", () => {
      const result = validatePersonnummer("199001011239");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("199001011239");
    });

    it("accepts 10-digit format (YYMMDDXXXX)", () => {
      const result = validatePersonnummer("9001011239");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("199001011239");
    });

    it("accepts format with dash (YYYYMMDD-XXXX)", () => {
      const result = validatePersonnummer("19900101-1239");
      expect(result.valid).toBe(true);
    });

    it("accepts format with dash (YYMMDD-XXXX)", () => {
      const result = validatePersonnummer("900101-1239");
      expect(result.valid).toBe(true);
    });

    it("trims whitespace", () => {
      const result = validatePersonnummer("  199001011239  ");
      expect(result.valid).toBe(true);
    });
  });

  describe("century inference", () => {
    it("infers 20xx century for 10-digit input with year <= current short year", () => {
      // 0501010003: year 05 <= current short year 26 → inferred as 2005
      const result = validatePersonnummer("0501010003");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("200501010003");
    });

    it("infers 19xx century for 10-digit input with year > current short year", () => {
      // Year 90 > current short year → 1990
      const result = validatePersonnummer("9001011239");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("199001011239");
    });

    it("handles + separator to indicate 100+ years old", () => {
      // 0001010008 with + separator: year 00, but + means previous century → 1900
      const result = validatePersonnummer("000101+0008");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("190001010008");
    });

    it("strips all separators with global replace", () => {
      // "900101-1239" with dash → valid
      const result = validatePersonnummer("900101-1239");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("199001011239");
    });
  });

  describe("invalid personnummer", () => {
    it("rejects empty string", () => {
      const result = validatePersonnummer("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects non-string input", () => {
      const result = validatePersonnummer(null as unknown as string);
      expect(result.valid).toBe(false);
    });

    it("rejects too few digits", () => {
      const result = validatePersonnummer("123456789");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/10 or 12 digits/);
    });

    it("rejects too many digits", () => {
      const result = validatePersonnummer("1234567890123");
      expect(result.valid).toBe(false);
    });

    it("rejects letters", () => {
      const result = validatePersonnummer("19900101ABCD");
      expect(result.valid).toBe(false);
    });

    it("rejects invalid month", () => {
      const result = validatePersonnummer("199013011239");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/month/i);
    });

    it("rejects month 00", () => {
      const result = validatePersonnummer("199000011239");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/month/i);
    });

    it("rejects invalid day", () => {
      const result = validatePersonnummer("199001321239");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/day/i);
    });

    it("rejects day 00", () => {
      const result = validatePersonnummer("199001001239");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/day/i);
    });

    it("rejects invalid Luhn checksum", () => {
      // Change last digit from 9 to 0
      const result = validatePersonnummer("199001011230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/checksum/i);
    });
  });
});
