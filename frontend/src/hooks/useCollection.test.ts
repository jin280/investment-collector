import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollection } from "./useCollection";

vi.mock("../api/collectionApi", () => ({
  auth: vi.fn(),
  getResult: vi.fn(),
  cancel: vi.fn(),
}));

import * as api from "../api/collectionApi";

const mockAuth = vi.mocked(api.auth);
const mockGetResult = vi.mocked(api.getResult);
const mockCancel = vi.mocked(api.cancel);

describe("useCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCancel.mockResolvedValue(undefined as unknown as void);
  });

  it("should initialize with step=start, null orderRef, and no error when rendered", () => {
    const { result } = renderHook(() => useCollection());
    expect(result.current.step).toBe("start");
    expect(result.current.orderRef).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.investmentData).toBeNull();
  });

  it("should set orderRef and step=authenticating when startCollection succeeds", async () => {
    mockAuth.mockResolvedValue({
      orderRef: "ref-123",
      autoStartToken: "t",
      qrStartToken: "q",
    });

    const { result } = renderHook(() => useCollection());
    await act(() => result.current.startCollection("199001011239"));

    expect(result.current.orderRef).toBe("ref-123");
    expect(result.current.step).toBe("authenticating");
    expect(result.current.error).toBeNull();
  });

  it("should set error and keep step=start when startCollection fails", async () => {
    mockAuth.mockRejectedValue(new Error("Connection refused"));

    const { result } = renderHook(() => useCollection());
    await act(() => result.current.startCollection("199001011239"));

    expect(result.current.error).toBe("Connection refused");
    expect(result.current.step).toBe("start");
  });

  it("should set investmentData and step=results when fetchResults succeeds", async () => {
    mockAuth.mockResolvedValue({
      orderRef: "ref-123",
      autoStartToken: "t",
      qrStartToken: "q",
    });
    const mockData = { accounts: [{ accountName: "ISK", currency: "SEK", totalValue: 1000, holdings: [] }] };
    mockGetResult.mockResolvedValue(mockData);

    const { result } = renderHook(() => useCollection());
    await act(() => result.current.startCollection("199001011239"));
    await act(() => result.current.fetchResults());

    expect(result.current.investmentData).toEqual(mockData);
    expect(result.current.step).toBe("results");
  });

  it("should not call API when fetchResults is called without orderRef", async () => {
    const { result } = renderHook(() => useCollection());
    await act(() => result.current.fetchResults());

    expect(mockGetResult).not.toHaveBeenCalled();
  });

  it("should set error when fetchResults fails", async () => {
    mockAuth.mockResolvedValue({
      orderRef: "ref-123",
      autoStartToken: "t",
      qrStartToken: "q",
    });
    mockGetResult.mockRejectedValue(new Error("Forbidden"));

    const { result } = renderHook(() => useCollection());
    await act(() => result.current.startCollection("199001011239"));
    await act(() => result.current.fetchResults());

    expect(result.current.error).toBe("Forbidden");
  });

  it("should reset to start and call api.cancel when cancelled", async () => {
    mockAuth.mockResolvedValue({
      orderRef: "ref-123",
      autoStartToken: "t",
      qrStartToken: "q",
    });

    const { result } = renderHook(() => useCollection());
    await act(() => result.current.startCollection("199001011239"));
    act(() => result.current.cancelCollection());

    expect(result.current.step).toBe("start");
    expect(result.current.orderRef).toBeNull();
    expect(mockCancel).toHaveBeenCalledWith("ref-123");
  });

  it("should clear all state including error and investmentData when reset", async () => {
    mockAuth.mockResolvedValue({
      orderRef: "ref-123",
      autoStartToken: "t",
      qrStartToken: "q",
    });
    const mockData = { accounts: [] };
    mockGetResult.mockResolvedValue(mockData);

    const { result } = renderHook(() => useCollection());
    await act(() => result.current.startCollection("199001011239"));
    await act(() => result.current.fetchResults());
    act(() => result.current.reset());

    expect(result.current.step).toBe("start");
    expect(result.current.orderRef).toBeNull();
    expect(result.current.investmentData).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
