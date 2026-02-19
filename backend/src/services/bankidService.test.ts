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
    it("creates a session with pending status", () => {
      const session = bankId.createSession("199001011239");
      expect(session.status).toBe(SessionStatus.PENDING);
      expect(session.personalNumber).toBe("199001011239");
      expect(session.orderRef).toBeDefined();
      expect(session.qrStartToken).toBeDefined();
      expect(session.qrStartSecret).toBeDefined();
    });

    it("sets hintCode to outstandingTransaction", () => {
      const session = bankId.createSession("199001011239");
      expect(session.hintCode).toBe("outstandingTransaction");
    });

    it("sets expiry 5 minutes in the future", () => {
      const before = Date.now();
      const session = bankId.createSession("199001011239");
      expect(session.expiresAt).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
    });

    it("stores the session so it can be retrieved", () => {
      const session = bankId.createSession("199001011239");
      const stored = sessionStore.get(session.orderRef);
      expect(stored).toBeDefined();
      expect(stored!.orderRef).toBe(session.orderRef);
    });
  });

  describe("generateQrData", () => {
    it("returns bankid-formatted QR data string", () => {
      const session = bankId.createSession("199001011239");
      const qrData = bankId.generateQrData(session);
      const parts = qrData.split(".");
      expect(parts[0]).toBe("bankid");
      expect(parts[1]).toBe(session.qrStartToken);
      expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
      expect(parts[3]).toHaveLength(64); // SHA256 hex
    });

    it("generates different HMAC as time progresses", () => {
      const session = bankId.createSession("199001011239");
      const qr1 = bankId.generateQrData(session);

      // Simulate time passing by modifying createdAt
      session.createdAt -= 2000;
      const qr2 = bankId.generateQrData(session);

      expect(qr1).not.toBe(qr2);
    });
  });

  describe("collectSession", () => {
    it("returns pending status with QR data for new session", () => {
      const session = bankId.createSession("199001011239");
      const result = bankId.collectSession(session.orderRef);
      expect(result.status).toBe("pending");
      if (result.status !== SessionStatus.PENDING) throw new Error("Expected pending");
      expect(result.qrData).toBeDefined();
      expect(result.hintCode).toBe("outstandingTransaction");
    });

    it("throws NotFoundError for unknown orderRef", () => {
      expect(() => bankId.collectSession("nonexistent")).toThrow("Order not found");
    });

    it("returns complete status with completionData after authentication", () => {
      const session = bankId.createSession("199001011239");
      bankId.completeSession(session.orderRef);

      const result = bankId.collectSession(session.orderRef);
      expect(result.status).toBe("complete");
      if (result.status !== SessionStatus.COMPLETE) throw new Error("Expected complete");
      expect(result.completionData).toBeDefined();
      expect(result.completionData.user.personalNumber).toBe("199001011239");
    });

    it("marks session as failed when expired", () => {
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
    it("transitions pending session to complete", () => {
      const session = bankId.createSession("199001011239");
      const result = bankId.completeSession(session.orderRef);
      expect(result.status).toBe(SessionStatus.COMPLETE);
      expect(result.completionData).toBeDefined();
    });

    it("throws NotFoundError for unknown orderRef", () => {
      expect(() => bankId.completeSession("nonexistent")).toThrow("Order not found");
    });

    it("throws ConflictError if session already complete", () => {
      const session = bankId.createSession("199001011239");
      bankId.completeSession(session.orderRef);
      expect(() => bankId.completeSession(session.orderRef)).toThrow(
        "Session not in pending state"
      );
    });

    it("throws ConflictError if session is expired", () => {
      const session = bankId.createSession("199001011239");
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });
      expect(() => bankId.completeSession(session.orderRef)).toThrow("expired");
    });

    it("populates user data in completionData", () => {
      const session = bankId.createSession("199001011239");
      const result = bankId.completeSession(session.orderRef);
      expect(result.completionData!.user.name).toBeDefined();
      expect(result.completionData!.user.givenName).toBeDefined();
      expect(result.completionData!.user.surname).toBeDefined();
    });
  });

  describe("cancelSession", () => {
    it("transitions pending session to failed with userCancel hint", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);

      const stored = sessionStore.get(session.orderRef);
      expect(stored!.status).toBe(SessionStatus.FAILED);
      expect(stored!.hintCode).toBe("userCancel");
    });

    it("throws NotFoundError for unknown orderRef", () => {
      expect(() => bankId.cancelSession("nonexistent")).toThrow("Order not found");
    });

    it("throws ConflictError when cancelling an already-complete session", () => {
      const session = bankId.createSession("199001011239");
      bankId.completeSession(session.orderRef);
      expect(() => bankId.cancelSession(session.orderRef)).toThrow(/cannot cancel/i);
    });

    it("throws ConflictError when cancelling an already-failed session", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);
      expect(() => bankId.cancelSession(session.orderRef)).toThrow(/cannot cancel/i);
    });
  });

  describe("state machine: full flow", () => {
    it("follows PENDING → COMPLETE flow", () => {
      const session = bankId.createSession("199001011239");
      expect(session.status).toBe(SessionStatus.PENDING);

      const poll1 = bankId.collectSession(session.orderRef);
      expect(poll1.status).toBe("pending");

      bankId.completeSession(session.orderRef);

      const poll2 = bankId.collectSession(session.orderRef);
      expect(poll2.status).toBe("complete");
    });

    it("follows PENDING → FAILED (cancel) flow", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);

      const poll = bankId.collectSession(session.orderRef);
      expect(poll.status).toBe("failed");
      if (poll.status !== SessionStatus.FAILED) throw new Error("Expected failed");
      expect(poll.hintCode).toBe("userCancel");
    });

    it("follows PENDING → FAILED (expired) flow", () => {
      const session = bankId.createSession("199001011239");
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });

      const poll = bankId.collectSession(session.orderRef);
      expect(poll.status).toBe("failed");
      if (poll.status !== SessionStatus.FAILED) throw new Error("Expected failed");
      expect(poll.hintCode).toBe("expiredTransaction");
    });
  });

  describe("completeSession unhappy paths", () => {
    it("throws ConflictError when completing a cancelled (FAILED) session", () => {
      const session = bankId.createSession("199001011239");
      bankId.cancelSession(session.orderRef);
      expect(() => bankId.completeSession(session.orderRef)).toThrow(
        "Session not in pending state"
      );
    });

    it("throws ConflictError when completing an expired (FAILED) session", () => {
      const session = bankId.createSession("199001011239");
      sessionStore.update(session.orderRef, { expiresAt: Date.now() - 1000 });
      // Trigger the expiry path via collect first
      bankId.collectSession(session.orderRef);
      expect(() => bankId.completeSession(session.orderRef)).toThrow(
        "Session not in pending state"
      );
    });
  });

  describe("collectSession edge cases", () => {
    it("collect on already-expired-and-failed session returns failed without re-expiring", () => {
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
