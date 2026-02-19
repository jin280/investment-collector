import { describe, it, expect } from "vitest";
import { validatePersonnummer } from "./personnummer";

describe("validatePersonnummer", () => {
  describe("valid personnummer", () => {
    it("should accept when given 12-digit format (YYYYMMDDXXXX)", () => {
      expect(validatePersonnummer("199001011239")).toEqual({ valid: true });
    });

    it("should accept when given 10-digit format (YYMMDDXXXX)", () => {
      expect(validatePersonnummer("9001011239")).toEqual({ valid: true });
    });

    it("should accept when given format with dash (YYMMDD-XXXX)", () => {
      expect(validatePersonnummer("900101-1239")).toEqual({ valid: true });
    });

    it("should trim whitespace when input has leading/trailing spaces", () => {
      expect(validatePersonnummer("  199001011239  ")).toEqual({ valid: true });
    });

    it("should strip all separators when given + separator", () => {
      // "900101+1239" with + separator → valid (strips the +)
      expect(validatePersonnummer("900101+1239")).toEqual({ valid: true });
    });
  });

  describe("invalid personnummer", () => {
    it("should reject when given empty string", () => {
      const result = validatePersonnummer("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject when given non-string input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validatePersonnummer(null as any);
      expect(result.valid).toBe(false);
    });

    it("should reject when given too few digits", () => {
      const result = validatePersonnummer("12345");
      expect(result.valid).toBe(false);
    });

    it("should reject when given too many digits", () => {
      const result = validatePersonnummer("1234567890123");
      expect(result.valid).toBe(false);
    });

    it("should reject when given letters", () => {
      const result = validatePersonnummer("19900101ABCD");
      expect(result.valid).toBe(false);
    });

    it("should reject when given month 00", () => {
      // 9000011230 — month=00
      const result = validatePersonnummer("9000011230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/month/i);
    });

    it("should reject when given month 13", () => {
      const result = validatePersonnummer("9013011230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/month/i);
    });

    it("should reject when given day 00", () => {
      const result = validatePersonnummer("9001001230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/day/i);
    });

    it("should reject when given day 32", () => {
      const result = validatePersonnummer("9001321230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/day/i);
    });

    it("should reject when given invalid Luhn checksum", () => {
      const result = validatePersonnummer("199001011230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/personal number/i);
    });
  });
});
