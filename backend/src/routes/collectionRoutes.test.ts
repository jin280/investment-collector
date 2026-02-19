import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { sessionStore } from "../store/sessionStore.js";

describe("API integration: /api/collections", () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe("POST /api/collections/auth", () => {
    it("returns 200 with orderRef for valid personnummer", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      expect(res.status).toBe(200);
      expect(res.body.orderRef).toBeDefined();
      expect(res.body.qrStartToken).toBeDefined();
      expect(res.body.autoStartToken).toBeDefined();
    });

    it("returns 400 for invalid personnummer", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.message).toBeDefined();
    });

    it("returns 400 for bad Luhn checksum", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011230" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/checksum/i);
    });

    it("returns 400 for missing body", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/collections/collect", () => {
    it("returns pending status with qrData for active session", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      const res = await request(app)
        .post("/api/collections/collect")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("pending");
      expect(res.body.qrData).toBeDefined();
      expect(res.body.qrData).toMatch(/^bankid\./);
      expect(res.body.hintCode).toBe("outstandingTransaction");
    });

    it("returns 404 for unknown orderRef", async () => {
      const res = await request(app)
        .post("/api/collections/collect")
        .send({ orderRef: "nonexistent-uuid" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("returns complete status after authentication", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      const res = await request(app)
        .post("/api/collections/collect")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("complete");
      expect(res.body.completionData).toBeDefined();
      expect(res.body.completionData.user.personalNumber).toBe("199001011239");
    });
  });

  describe("POST /api/collections/complete", () => {
    it("returns 200 with complete status", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      const res = await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("complete");
    });

    it("returns 409 if session already complete", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      const res = await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
    });

    it("returns 404 for unknown orderRef", async () => {
      const res = await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: "nonexistent-uuid" });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/collections/cancel", () => {
    it("returns 200 with empty body", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      const res = await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("marks session as failed so collect returns failed", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: auth.body.orderRef });

      const res = await request(app)
        .post("/api/collections/collect")
        .send({ orderRef: auth.body.orderRef });

      expect(res.body.status).toBe("failed");
      expect(res.body.hintCode).toBe("userCancel");
    });

    it("returns 404 for unknown orderRef", async () => {
      const res = await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: "nonexistent-uuid" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/collections/:orderRef/result", () => {
    it("returns investment data after successful auth", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      const res = await request(app)
        .get(`/api/collections/${auth.body.orderRef}/result`);

      expect(res.status).toBe(200);
      expect(res.body.accounts).toBeDefined();
      expect(res.body.accounts.length).toBeGreaterThan(0);
      expect(res.body.accounts[0].accountName).toBeDefined();
      expect(res.body.accounts[0].currency).toBe("SEK");
      expect(res.body.accounts[0].totalValue).toBeGreaterThan(0);
      expect(res.body.accounts[0].holdings.length).toBeGreaterThan(0);
    });

    it("returns 403 if session not complete", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      const res = await request(app)
        .get(`/api/collections/${auth.body.orderRef}/result`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("returns 404 for unknown orderRef", async () => {
      const res = await request(app)
        .get("/api/collections/nonexistent-uuid/result");

      expect(res.status).toBe(404);
    });

    it("validates investment data shape", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      const res = await request(app)
        .get(`/api/collections/${auth.body.orderRef}/result`);

      for (const account of res.body.accounts) {
        expect(account).toHaveProperty("accountName");
        expect(account).toHaveProperty("currency");
        expect(account).toHaveProperty("totalValue");
        expect(account).toHaveProperty("holdings");

        for (const holding of account.holdings) {
          expect(holding).toHaveProperty("name");
          expect(holding).toHaveProperty("type");
          expect(holding).toHaveProperty("value");
          expect(["Fund", "Stock", "Cash", "ETF", "Bond"]).toContain(holding.type);
        }
      }
    });
  });

  describe("full end-to-end flow via API", () => {
    it("completes auth → collect → complete → collect → result", async () => {
      // 1. Start collection
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });
      expect(auth.status).toBe(200);

      // 2. Poll — should be pending
      const poll1 = await request(app)
        .post("/api/collections/collect")
        .send({ orderRef: auth.body.orderRef });
      expect(poll1.body.status).toBe("pending");
      expect(poll1.body.qrData).toBeDefined();

      // 3. Authenticate
      const complete = await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });
      expect(complete.body.status).toBe("complete");

      // 4. Poll — should be complete
      const poll2 = await request(app)
        .post("/api/collections/collect")
        .send({ orderRef: auth.body.orderRef });
      expect(poll2.body.status).toBe("complete");
      expect(poll2.body.completionData.user.name).toBeDefined();

      // 5. Get results
      const result = await request(app)
        .get(`/api/collections/${auth.body.orderRef}/result`);
      expect(result.status).toBe(200);
      expect(result.body.accounts.length).toBe(2);
    });
  });

  describe("POST /api/collections/auth — requireString edge cases", () => {
    it("returns 400 when personalNumber is a number", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: 199001011239 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when personalNumber is null", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: null });

      expect(res.status).toBe(400);
    });

    it("returns 400 when personalNumber is an array", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: ["199001011239"] });

      expect(res.status).toBe(400);
    });

    it("returns 400 when personalNumber is empty string", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("missing orderRef validation", () => {
    it("POST /collect with missing orderRef returns 400", async () => {
      const res = await request(app)
        .post("/api/collections/collect")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("POST /complete with missing orderRef returns 400", async () => {
      const res = await request(app)
        .post("/api/collections/complete")
        .send({});

      expect(res.status).toBe(400);
    });

    it("POST /cancel with missing orderRef returns 400", async () => {
      const res = await request(app)
        .post("/api/collections/cancel")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("cross-state unhappy paths", () => {
    it("POST /cancel then POST /complete returns 409 conflict", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: auth.body.orderRef });

      const res = await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
    });

    it("POST /cancel then GET /result returns 403 forbidden", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: auth.body.orderRef });

      const res = await request(app)
        .get(`/api/collections/${auth.body.orderRef}/result`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("POST /complete then POST /cancel returns 409 conflict (terminal state)", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      const cancelRes = await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: auth.body.orderRef });

      expect(cancelRes.status).toBe(409);
      expect(cancelRes.body.error).toBe("CONFLICT");
    });
  });
});
