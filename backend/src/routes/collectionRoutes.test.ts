import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { sessionStore } from "../store/sessionStore.js";

describe("API integration: /api/collections", () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe("POST /api/collections/auth", () => {
    it("should return 200 with orderRef when given valid personnummer", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      expect(res.status).toBe(200);
      expect(res.body.orderRef).toBeDefined();
      expect(res.body.qrStartToken).toBeDefined();
      expect(res.body.autoStartToken).toBeDefined();
    });

    it("should return 400 when given invalid personnummer", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.message).toBeDefined();
    });

    it("should return 400 when given bad Luhn checksum", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011230" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/personal number/i);
    });

    it("should return 400 when body is missing", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/collections/collect", () => {
    it("should return pending status with qrData when session is active", async () => {
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

    it("should return 404 when orderRef is unknown", async () => {
      const res = await request(app)
        .post("/api/collections/collect")
        .send({ orderRef: "nonexistent-uuid" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("should return complete status when authenticated", async () => {
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
    it("should return 200 with complete status when completed", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      const res = await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("complete");
    });

    it("should return 409 when session is already completed", async () => {
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

    it("should return 404 when orderRef is unknown", async () => {
      const res = await request(app)
        .post("/api/collections/complete")
        .send({ orderRef: "nonexistent-uuid" });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/collections/cancel", () => {
    it("should return 200 with empty body when cancelled", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      const res = await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: auth.body.orderRef });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("should mark session as failed when cancelled so collect returns failed", async () => {
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

    it("should return 404 when orderRef is unknown", async () => {
      const res = await request(app)
        .post("/api/collections/cancel")
        .send({ orderRef: "nonexistent-uuid" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/collections/:orderRef/result", () => {
    it("should return investment data when authenticated successfully", async () => {
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

    it("should return 403 when session is not completed", async () => {
      const auth = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "199001011239" });

      const res = await request(app)
        .get(`/api/collections/${auth.body.orderRef}/result`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("should return 404 when orderRef is unknown", async () => {
      const res = await request(app)
        .get("/api/collections/nonexistent-uuid/result");

      expect(res.status).toBe(404);
    });

    it("should validate investment data shape when completed", async () => {
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
    it("should complete full auth → collect → complete → collect → result flow", async () => {
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

  describe("POST /api/collections/auth — requireString validation", () => {
    it("should return 400 when personalNumber is a number", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: 199001011239 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when personalNumber is null", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: null });

      expect(res.status).toBe(400);
    });

    it("should return 400 when personalNumber is an array", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: ["199001011239"] });

      expect(res.status).toBe(400);
    });

    it("should return 400 when personalNumber is empty string", async () => {
      const res = await request(app)
        .post("/api/collections/auth")
        .send({ personalNumber: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("missing orderRef validation", () => {
    it("should return 400 when POST /collect is called with missing orderRef", async () => {
      const res = await request(app)
        .post("/api/collections/collect")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when POST /complete is called with missing orderRef", async () => {
      const res = await request(app)
        .post("/api/collections/complete")
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return 400 when POST /cancel is called with missing orderRef", async () => {
      const res = await request(app)
        .post("/api/collections/cancel")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("cross-state transitions", () => {
    it("should return 409 when completing after cancellation", async () => {
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

    it("should return 403 when getting result after cancellation", async () => {
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

    it("should return 409 when cancelling after completion", async () => {
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
