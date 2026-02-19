import { describe, it, expect, beforeEach } from "vitest";
import { createCollectionService } from "./collectionService.js";
import { createBankIdService } from "./bankidService.js";
import { sessionStore } from "../store/sessionStore.js";
import { avanzaProvider } from "../providers/avanza/mockProvider.js";
import { SessionStatus } from "../domain/types.js";

const bankId = createBankIdService(sessionStore);
const service = createCollectionService(sessionStore, bankId, avanzaProvider);

describe("collectionService", () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe("startCollection", () => {
    it("returns orderRef and tokens for valid personnummer", () => {
      const result = service.startCollection("199001011239");
      expect(result.orderRef).toBeDefined();
      expect(result.qrStartToken).toBeDefined();
      expect(result.autoStartToken).toBeDefined();
    });

    it("throws ValidationError for invalid personnummer", () => {
      expect(() => service.startCollection("invalid")).toThrow();
    });

    it("throws ValidationError for bad Luhn checksum", () => {
      expect(() => service.startCollection("199001011230")).toThrow(/checksum/i);
    });
  });

  describe("pollCollection", () => {
    it("returns pending status for new session", () => {
      const { orderRef } = service.startCollection("199001011239");
      const result = service.pollCollection(orderRef);
      expect(result.status).toBe("pending");
      if (result.status !== SessionStatus.PENDING) throw new Error("Expected pending");
      expect(result.qrData).toBeDefined();
    });
  });

  describe("mockComplete", () => {
    it("returns complete status", () => {
      const { orderRef } = service.startCollection("199001011239");
      const result = service.mockComplete(orderRef);
      expect(result.status).toBe("complete");
    });
  });

  describe("cancelCollection", () => {
    it("returns empty object", () => {
      const { orderRef } = service.startCollection("199001011239");
      const result = service.cancelCollection(orderRef);
      expect(result).toEqual({});
    });
  });

  describe("getCollectionResult", () => {
    it("returns investment data after completion", async () => {
      const { orderRef } = service.startCollection("199001011239");
      service.mockComplete(orderRef);

      const result = await service.getCollectionResult(orderRef);
      expect(result.accounts).toBeDefined();
      expect(result.accounts.length).toBeGreaterThan(0);
      expect(result.accounts[0].holdings.length).toBeGreaterThan(0);
    });

    it("throws ForbiddenError if session not complete", async () => {
      const { orderRef } = service.startCollection("199001011239");
      await expect(service.getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });

    it("throws ForbiddenError for unknown orderRef", async () => {
      await expect(service.getCollectionResult("nonexistent")).rejects.toThrow();
    });

    it("throws ForbiddenError after cancel (session status is FAILED)", async () => {
      const { orderRef } = service.startCollection("199001011239");
      service.cancelCollection(orderRef);
      await expect(service.getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });

    it("throws ForbiddenError after session expiry", async () => {
      const { orderRef } = service.startCollection("199001011239");
      // Expire the session and trigger expiry via pollCollection
      sessionStore.update(orderRef, { expiresAt: Date.now() - 1000 });
      service.pollCollection(orderRef); // triggers FAILED status
      await expect(service.getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });
  });

  describe("startCollection edge cases", () => {
    it("throws ValidationError for whitespace-only input", () => {
      expect(() => service.startCollection("   ")).toThrow();
    });
  });
});
