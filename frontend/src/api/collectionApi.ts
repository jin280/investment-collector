import type { AuthResponse, CollectResponse, CollectionResult } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const BASE_URL = `${API_BASE}/api/collections`;
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "Request timed out — please try again");
    }
    throw new ApiError(0, "NETWORK_ERROR", "Network error — check your connection");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "UNKNOWN", message: "Request failed" }));
    throw new ApiError(
      res.status,
      body.error || "UNKNOWN",
      body.message || `HTTP ${res.status}`
    );
  }

  return res.json();
}

export function auth(personalNumber: string): Promise<AuthResponse> {
  return request<AuthResponse>(`${BASE_URL}/auth`, {
    method: "POST",
    body: JSON.stringify({ personalNumber }),
  });
}

export function collect(orderRef: string): Promise<CollectResponse> {
  return request<CollectResponse>(`${BASE_URL}/collect`, {
    method: "POST",
    body: JSON.stringify({ orderRef }),
  });
}

export function complete(orderRef: string): Promise<{ orderRef: string; status: string }> {
  return request(`${BASE_URL}/complete`, {
    method: "POST",
    body: JSON.stringify({ orderRef }),
  });
}

export function cancel(orderRef: string): Promise<void> {
  return request(`${BASE_URL}/cancel`, {
    method: "POST",
    body: JSON.stringify({ orderRef }),
  });
}

export function getResult(orderRef: string): Promise<CollectionResult> {
  return request<CollectionResult>(`${BASE_URL}/${orderRef}/result`);
}
