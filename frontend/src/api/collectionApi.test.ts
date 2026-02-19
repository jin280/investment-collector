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

  describe("valid requests", () => {
    it("should resolve with orderRef and tokens when auth is called with valid input", async () => {
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

    it("should resolve with status and qrData when collect is called with valid orderRef", async () => {
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

    it("should resolve with accounts data when getResult is called with valid orderRef", async () => {
      const body = { accounts: [] };
      mockFetch.mockReturnValue(jsonResponse(body));

      const result = await getResult("abc");
      expect(result).toEqual(body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/abc/result"),
        expect.objectContaining({ headers: { "Content-Type": "application/json" } })
      );
    });

    it("should resolve without error when cancel is called with valid orderRef", async () => {
      mockFetch.mockReturnValue(jsonResponse({}));

      const result = await cancel("abc");
      expect(result).toEqual({});
    });
  });

  describe("error responses", () => {
    it("should throw ApiError with status and code when HTTP error is returned", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ error: "VALIDATION_ERROR", message: "bad input" }, 400)
      );

      const err = await auth("bad").catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toBe("bad input");
    });

    it("should throw ApiError with NETWORK_ERROR when fetch is rejected", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const err = await auth("199001011239").catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe("NETWORK_ERROR");
      expect(err.status).toBe(0);
    });
  });

  describe("response parsing fallbacks", () => {
    it("should fall back to UNKNOWN code when error response is not JSON", async () => {
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

    it("should fall back to HTTP status as message when error body has no message", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ error: "SOME_ERROR" }, 500)
      );

      const err = await auth("199001011239").catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toBe("HTTP 500");
    });
  });
});
