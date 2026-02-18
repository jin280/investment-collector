import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth, collect, getResult, cancel, ApiError } from "./collectionApi";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("collectionApi", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("happy paths", () => {
    it("auth resolves with orderRef and tokens for valid input", async () => {
      const body = { orderRef: "abc", autoStartToken: "t", qrStartToken: "q" };
      mockFetch.mockReturnValue(jsonResponse(body));

      const result = await auth("199001011239");
      expect(result).toEqual(body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ personalNumber: "199001011239" }),
        })
      );
    });

    it("collect resolves with status and qrData for valid orderRef", async () => {
      const body = { orderRef: "abc", status: "pending", qrData: "bankid.x.0.y" };
      mockFetch.mockReturnValue(jsonResponse(body));

      const result = await collect("abc");
      expect(result).toEqual(body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/collect"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ orderRef: "abc" }),
        })
      );
    });

    it("getResult resolves with accounts data for valid orderRef", async () => {
      const body = { accounts: [] };
      mockFetch.mockReturnValue(jsonResponse(body));

      const result = await getResult("abc");
      expect(result).toEqual(body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/abc/result"),
        expect.objectContaining({ headers: { "Content-Type": "application/json" } })
      );
    });

    it("cancel resolves without error for valid orderRef", async () => {
      mockFetch.mockReturnValue(jsonResponse({}));

      const result = await cancel("abc");
      expect(result).toEqual({});
    });
  });

  describe("unhappy paths", () => {
    it("throws ApiError with status and code for HTTP error response", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ error: "VALIDATION_ERROR", message: "bad input" }, 400)
      );

      const err = await auth("bad").catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toBe("bad input");
    });

    it("throws ApiError with NETWORK_ERROR when fetch rejects", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const err = await auth("199001011239").catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe("NETWORK_ERROR");
      expect(err.status).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("falls back to UNKNOWN code when error response is not JSON", async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 502,
          json: () => Promise.reject(new Error("not json")),
        })
      );

      const err = await auth("199001011239").catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe("UNKNOWN");
    });

    it("falls back to HTTP status as message when error body has no message", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ error: "SOME_ERROR" }, 500)
      );

      const err = await auth("199001011239").catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toBe("HTTP 500");
    });
  });
});
