import { describe, it, expect, beforeEach } from "vitest";
import {
  startCollection,
  pollCollection,
  mockComplete,
  cancelCollection,
  getCollectionResult,
} from "./collectionService.js";
import { sessionStore } from "../store/sessionStore.js";
import { SessionStatus } from "../domain/types.js";

describe("collectionService", () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe("startCollection", () => {
    it("returns orderRef and tokens for valid personnummer", () => {
      const result = startCollection("199001011239");
      expect(result.orderRef).toBeDefined();
      expect(result.qrStartToken).toBeDefined();
      expect(result.autoStartToken).toBeDefined();
    });

    it("throws ValidationError for invalid personnummer", () => {
      expect(() => startCollection("invalid")).toThrow();
    });

    it("throws ValidationError for bad Luhn checksum", () => {
      expect(() => startCollection("199001011230")).toThrow(/checksum/i);
    });
  });

  describe("pollCollection", () => {
    it("returns pending status for new session", () => {
      const { orderRef } = startCollection("199001011239");
      const result = pollCollection(orderRef);
      expect(result.status).toBe("pending");
      if (result.status !== SessionStatus.PENDING) throw new Error("Expected pending");
      expect(result.qrData).toBeDefined();
    });
  });

  describe("mockComplete", () => {
    it("returns complete status", () => {
      const { orderRef } = startCollection("199001011239");
      const result = mockComplete(orderRef);
      expect(result.status).toBe("complete");
    });
  });

  describe("cancelCollection", () => {
    it("returns empty object", () => {
      const { orderRef } = startCollection("199001011239");
      const result = cancelCollection(orderRef);
      expect(result).toEqual({});
    });
  });

  describe("getCollectionResult", () => {
    it("returns investment data after completion", async () => {
      const { orderRef } = startCollection("199001011239");
      mockComplete(orderRef);

      const result = await getCollectionResult(orderRef);
      expect(result.accounts).toBeDefined();
      expect(result.accounts.length).toBeGreaterThan(0);
      expect(result.accounts[0].holdings.length).toBeGreaterThan(0);
    });

    it("throws ForbiddenError if session not complete", async () => {
      const { orderRef } = startCollection("199001011239");
      await expect(getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });

    it("throws ForbiddenError for unknown orderRef", async () => {
      await expect(getCollectionResult("nonexistent")).rejects.toThrow();
    });

    it("throws ForbiddenError after cancel (session status is FAILED)", async () => {
      const { orderRef } = startCollection("199001011239");
      cancelCollection(orderRef);
      await expect(getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });

    it("throws ForbiddenError after session expiry", async () => {
      const { orderRef } = startCollection("199001011239");
      // Expire the session and trigger expiry via pollCollection
      sessionStore.update(orderRef, { expiresAt: Date.now() - 1000 });
      pollCollection(orderRef); // triggers FAILED status
      await expect(getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });
  });

  describe("startCollection edge cases", () => {
    it("throws ValidationError for whitespace-only input", () => {
      expect(() => startCollection("   ")).toThrow();
    });
  });
});
