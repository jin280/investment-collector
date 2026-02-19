import { describe, it, expect } from "vitest";
import { validatePersonnummer } from "./personnummer";

describe("validatePersonnummer", () => {
  describe("happy paths", () => {
    it("accepts valid 12-digit personnummer", () => {
      expect(validatePersonnummer("199001011239")).toEqual({ valid: true });
    });

    it("accepts valid 10-digit personnummer", () => {
      expect(validatePersonnummer("9001011239")).toEqual({ valid: true });
    });

    it("accepts personnummer with dash", () => {
      expect(validatePersonnummer("900101-1239")).toEqual({ valid: true });
    });

    it("trims whitespace", () => {
      expect(validatePersonnummer("  199001011239  ")).toEqual({ valid: true });
    });

    it("strips all separators globally (handles + separator)", () => {
      // "900101+1239" with + separator → valid (strips the +)
      expect(validatePersonnummer("900101+1239")).toEqual({ valid: true });
    });
  });

  describe("unhappy paths", () => {
    it("rejects empty string", () => {
      const result = validatePersonnummer("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects null input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validatePersonnummer(null as any);
      expect(result.valid).toBe(false);
    });

    it("rejects too few digits", () => {
      const result = validatePersonnummer("12345");
      expect(result.valid).toBe(false);
    });

    it("rejects too many digits", () => {
      const result = validatePersonnummer("1234567890123");
      expect(result.valid).toBe(false);
    });

    it("rejects letters in input", () => {
      const result = validatePersonnummer("19900101ABCD");
      expect(result.valid).toBe(false);
    });

    it("rejects invalid month 00", () => {
      // 9000011230 — month=00
      const result = validatePersonnummer("9000011230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/month/i);
    });

    it("rejects invalid month 13", () => {
      const result = validatePersonnummer("9013011230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/month/i);
    });

    it("rejects invalid day 00", () => {
      const result = validatePersonnummer("9001001230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/day/i);
    });

    it("rejects invalid day 32", () => {
      const result = validatePersonnummer("9001321230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/day/i);
    });

    it("rejects invalid Luhn checksum", () => {
      const result = validatePersonnummer("199001011230");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/checksum/i);
    });
  });
});
