import { describe, it, expect, beforeEach } from "vitest";
import { createBankIdService } from "./bankidService.js";
import { sessionStore } from "../store/sessionStore.js";
import { SessionStatus } from "../domain/types.js";

const bankId = createBankIdService(sessionStore);

describe("bankidService", () => {
  beforeEach(() => {
    // Clear all sessions between tests
    sessionStore.clear();
  });

  describe("createSession", () => {
    it("should create session with pending status when called", () => {
      const session = bankId.createSession("199001011239");
      expect(session.status).toBe(SessionStatus.PENDING);
      expect(session.personalNumber).toBe("199001011239");
      expect(session.orderRef).toBeDefined();
      expect(session.qrStartToken).toBeDefined();
      expect(session.qrStartSecret).toBeDefined();
    });

    it("should set hintCode to outstandingTransaction when created", () => {
      const session = bankId.createSession("199001011239");
      expect(session.hintCode).toBe("outstandingTransaction");
    });

    it("should set expiry 5 minutes in the future when created", () => {
      const before = Date.now();
      const session = bankId.createSession("199001011239");
      expect(session.expiresAt).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
    });

    it("should store session so it can be retrieved when created", () => {
      const session = bankId.createSession("199001011239");
      const stored = sessionStore.get(session.orderRef);
      expect(stored).toBeDefined();
      expect(stored!.orderRef).toBe(session.orderRef);
    });
  });

  describe("generateQrData", () => {
    it("should return bankid-formatted QR data string when generated", () => {
      const session = bankId.createSession("199001011239");
      const qrData = bankId.generateQrData(session);
      const parts = qrData.split(".");
      expect(parts[0]).toBe("bankid");
      expect(parts[1]).toBe(session.qrStartToken);
      expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
      expect(parts[3]).toHaveLength(64); // SHA256 hex
    });

    it("should generate different HMAC when time progresses", () => {
      const session = bankId.createSession("199001011239");
      const qr1 = bankId.generateQrData(session);

      // Simulate time passing by modifying createdAt
      session.createdAt -= 2000;
      const qr2 = bankId.generateQrData(session);

      expect(qr1).not.toBe(qr2);
    });
  });

  describe("collectSession", () => {
    it("should return pending status with QR data when session is new", () => {
      const session = bankId.createSession("199001011239");
      const result = bankId.collectSession(session.orderRef);
      expect(result.status).toBe("pending");
      if (result.status !== SessionStatus.PENDING) throw new Error("Expected pending");
      expect(result.qrData).toBeDefined();
      expect(result.hintCode).toBe("outstandingTransaction");
    });

    it("should throw NotFoundError when orderRef is unknown", () => {
      expect(() => bankId.collectSession("nonexistent")).toThrow("Order not found");
    });

    it("should return complete status with completionData when authenticated", () => {
      const session = bankId.createSession("199001011239");
      bankId.completeSession(session.orderRef);

      const result = bankId.collectSession(session.orderRef);
      expect(result.status).toBe("complete");
      if (result.status !== SessionStatus.COMPLETE) throw new Error("Expected complete");
      expect(result.completionData).toBeDefined();
      expect(result.completionData.user.personalNumber).toBe("199001011239");
    });

    it("should mark session as failed when expired", () => {
      const session = bankId.createSession("199001011239");
      // Expire the session
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });

      const result = bankId.collectSession(session.orderRef);
      expect(result.status).toBe("failed");
      if (result.status !== SessionStatus.FAILED) throw new Error("Expected failed");
      expect(result.hintCode).toBe("expiredTransaction");
    });
  });

  describe("completeSession", () => {
    it("should transition session to complete when pending", () => {
      const session = bankId.createSession("199001011239");
      const result = bankId.completeSession(session.orderRef);
      expect(result.status).toBe(SessionStatus.COMPLETE);
      expect(result.completionData).toBeDefined();
    });

    it("should throw NotFoundError when orderRef is unknown", () => {
      expect(() => bankId.completeSession("nonexistent")).toThrow("Order not found");
    });

    it("should throw ConflictError when session is already completed", () => {
      const session = bankId.createSession("199001011239");
      bankId.completeSession(session.orderRef);
      expect(() => bankId.completeSession(session.orderRef)).toThrow(
        "Session not in pending state"
      );
    });

    it("should throw ConflictError when session is expired", () => {
      const session = bankId.createSession("199001011239");
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });
      expect(() => bankId.completeSession(session.orderRef)).toThrow("expired");
    });

    it("should populate user data in completionData when completed", () => {
      const session = bankId.createSession("199001011239");
      const result = bankId.completeSession(session.orderRef);
      expect(result.completionData!.user.name).toBeDefined();
      expect(result.completionData!.user.givenName).toBeDefined();
      expect(result.completionData!.user.surname).toBeDefined();
    });
  });

  describe("cancelSession", () => {
    it("should transition session to failed with userCancel hint when cancelled", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);

      const stored = sessionStore.get(session.orderRef);
      expect(stored!.status).toBe(SessionStatus.FAILED);
      expect(stored!.hintCode).toBe("userCancel");
    });

    it("should throw NotFoundError when orderRef is unknown", () => {
      expect(() => bankId.cancelSession("nonexistent")).toThrow("Order not found");
    });

    it("should throw ConflictError when cancelling an already-completed session", () => {
      const session = bankId.createSession("199001011239");
      bankId.completeSession(session.orderRef);
      expect(() => bankId.cancelSession(session.orderRef)).toThrow(/cannot cancel/i);
    });

    it("should throw ConflictError when cancelling an already-failed session", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);
      expect(() => bankId.cancelSession(session.orderRef)).toThrow(/cannot cancel/i);
    });
  });

  describe("state machine: full flow", () => {
    it("should follow PENDING → COMPLETE flow when completed", () => {
      const session = bankId.createSession("199001011239");
      expect(session.status).toBe(SessionStatus.PENDING);

      const poll1 = bankId.collectSession(session.orderRef);
      expect(poll1.status).toBe("pending");

      bankId.completeSession(session.orderRef);

      const poll2 = bankId.collectSession(session.orderRef);
      expect(poll2.status).toBe("complete");
    });

    it("should follow PENDING → FAILED flow when cancelled", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);

      const poll = bankId.collectSession(session.orderRef);
      expect(poll.status).toBe("failed");
      if (poll.status !== SessionStatus.FAILED) throw new Error("Expected failed");
      expect(poll.hintCode).toBe("userCancel");
    });

    it("should follow PENDING → FAILED flow when expired", () => {
      const session = bankId.createSession("199001011239");
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });

      const poll = bankId.collectSession(session.orderRef);
      expect(poll.status).toBe("failed");
      if (poll.status !== SessionStatus.FAILED) throw new Error("Expected failed");
      expect(poll.hintCode).toBe("expiredTransaction");
    });
  });

  describe("completeSession invalid states", () => {
    it("should throw ConflictError when completing a cancelled session", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);
      expect(() => bankId.completeSession(session.orderRef)).toThrow(
        "Session not in pending state"
      );
    });

    it("should throw ConflictError when completing an expired session", () => {
      const session = bankId.createSession("199001011239");
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });
      // Trigger the expiry path via collect first
      bankId.collectSession(session.orderRef);
      expect(() => bankId.completeSession(session.orderRef)).toThrow(
        "Session not in pending state"
      );
    });
  });

  describe("collectSession expired state", () => {
    it("should return failed without re-expiring when collecting an already-expired session", () => {
      const session = bankId.createSession("199001011239");
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });
      // First collect triggers the expiry
      bankId.collectSession(session.orderRef);
      // Second collect should return failed directly (status is already FAILED, not PENDING)
      const result = bankId.collectSession(session.orderRef);
      expect(result.status).toBe("failed");
      if (result.status !== SessionStatus.FAILED) throw new Error("Expected failed");
      expect(result.hintCode).toBe("expiredTransaction");
    });
  });
});
