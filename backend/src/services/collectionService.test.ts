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
    it("should return orderRef and tokens when given valid personnummer", () => {
      const result = service.startCollection("199001011239");
      expect(result.orderRef).toBeDefined();
      expect(result.qrStartToken).toBeDefined();
      expect(result.autoStartToken).toBeDefined();
    });

    it("should throw ValidationError when given invalid personnummer", () => {
      expect(() => service.startCollection("invalid")).toThrow();
    });

    it("should throw ValidationError when given bad Luhn checksum", () => {
      expect(() => service.startCollection("199001011230")).toThrow(/personal number/i);
    });
  });

  describe("pollCollection", () => {
    it("should return pending status when session is new", () => {
      const { orderRef } = service.startCollection("199001011239");
      const result = service.pollCollection(orderRef);
      expect(result.status).toBe("pending");
      if (result.status !== SessionStatus.PENDING) throw new Error("Expected pending");
      expect(result.qrData).toBeDefined();
    });
  });

  describe("mockComplete", () => {
    it("should return complete status when completed", () => {
      const { orderRef } = service.startCollection("199001011239");
      const result = service.mockComplete(orderRef);
      expect(result.status).toBe("complete");
    });
  });

  describe("cancelCollection", () => {
    it("should return empty object when cancelled", () => {
      const { orderRef } = service.startCollection("199001011239");
      const result = service.cancelCollection(orderRef);
      expect(result).toEqual({});
    });
  });

  describe("getCollectionResult", () => {
    it("should return investment data when session is completed", async () => {
      const { orderRef } = service.startCollection("199001011239");
      service.mockComplete(orderRef);

      const result = await service.getCollectionResult(orderRef);
      expect(result.accounts).toBeDefined();
      expect(result.accounts.length).toBeGreaterThan(0);
      expect(result.accounts[0].holdings.length).toBeGreaterThan(0);
    });

    it("should throw ForbiddenError when session is not completed", async () => {
      const { orderRef } = service.startCollection("199001011239");
      await expect(service.getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });

    it("should throw ForbiddenError when orderRef is unknown", async () => {
      await expect(service.getCollectionResult("nonexistent")).rejects.toThrow();
    });

    it("should throw ForbiddenError when session is cancelled", async () => {
      const { orderRef } = service.startCollection("199001011239");
      service.cancelCollection(orderRef);
      await expect(service.getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });

    it("should throw ForbiddenError when session is expired", async () => {
      const { orderRef } = service.startCollection("199001011239");
      // Expire the session and trigger expiry via pollCollection
      sessionStore.update(orderRef, { expiresAt: Date.now() - 1000 });
      service.pollCollection(orderRef); // triggers FAILED status
      await expect(service.getCollectionResult(orderRef)).rejects.toThrow(
        "Session not complete"
      );
    });
  });

  describe("startCollection validation", () => {
    it("should throw ValidationError when given whitespace-only input", () => {
      expect(() => service.startCollection("   ")).toThrow();
    });
  });
});
