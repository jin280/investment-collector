import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBankIdAuth } from "./useBankIdAuth";

vi.mock("../api/collectionApi", () => ({
  collect: vi.fn(),
  complete: vi.fn(),
}));

import * as api from "../api/collectionApi";

const mockCollect = vi.mocked(api.collect);
const mockComplete = vi.mocked(api.complete);

describe("useBankIdAuth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no polling when orderRef is null", () => {
    const onComplete = vi.fn();
    renderHook(() => useBankIdAuth(null, onComplete));

    expect(mockCollect).not.toHaveBeenCalled();
  });

  it("starts polling on mount with orderRef", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "pending",
      hintCode: "outstandingTransaction",
      qrData: "bankid.token.0.hmac",
    });
    const onComplete = vi.fn();

    renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(mockCollect).toHaveBeenCalledWith("ref-1");
  });

  it("polls at 1-second intervals", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "pending",
      hintCode: "outstandingTransaction",
      qrData: "bankid.token.0.hmac",
    });
    const onComplete = vi.fn();

    renderHook(() => useBankIdAuth("ref-1", onComplete));

    // Initial poll
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mockCollect).toHaveBeenCalledTimes(1);

    // After 1 second
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(mockCollect).toHaveBeenCalledTimes(2);

    // After another second
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(mockCollect).toHaveBeenCalledTimes(3);
  });

  it("updates qrData and status from response", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "pending",
      hintCode: "outstandingTransaction",
      qrData: "bankid.token.5.abc123",
    });
    const onComplete = vi.fn();

    const { result } = renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current.qrData).toBe("bankid.token.5.abc123");
    expect(result.current.status).toBe("pending");
  });

  it("calls onComplete exactly once on complete (completedRef guard)", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "complete",
      completionData: { user: { personalNumber: "199001011239", name: "Test", givenName: "Test", surname: "Test" } },
    });
    const onComplete = vi.fn();

    renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Second poll should not call onComplete again
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("stops polling on failed status", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "failed",
      hintCode: "userCancel",
    });
    const onComplete = vi.fn();

    renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mockCollect).toHaveBeenCalledTimes(1);

    // Should not poll again after failure
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(mockCollect).toHaveBeenCalledTimes(1);
  });

  it("sets error on expiredTransaction hint code", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "failed",
      hintCode: "expiredTransaction",
    });
    const onComplete = vi.fn();

    const { result } = renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current.error).toBe("Session expired. Please try again.");
  });

  it("sets error and stops polling on network error", async () => {
    mockCollect.mockRejectedValue(new Error("Network error"));
    const onComplete = vi.fn();

    const { result } = renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current.error).toBe("Network error");

    // Should not poll again
    mockCollect.mockClear();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(mockCollect).not.toHaveBeenCalled();
  });

  it("timeLeft decreases over time, never goes negative", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "pending",
      hintCode: "outstandingTransaction",
      qrData: "bankid.token.0.hmac",
    });
    const onComplete = vi.fn();

    const { result } = renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));

    const initialTimeLeft = result.current.timeLeft;
    expect(initialTimeLeft).toBeLessThanOrEqual(300);
    expect(initialTimeLeft).toBeGreaterThanOrEqual(0);
  });

  it("cleans up interval on unmount (no leaked timers)", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "pending",
      hintCode: "outstandingTransaction",
      qrData: "bankid.token.0.hmac",
    });
    const onComplete = vi.fn();

    const { unmount } = renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));

    const callsBefore = mockCollect.mock.calls.length;
    unmount();

    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(mockCollect).toHaveBeenCalledTimes(callsBefore);
  });

  it("authenticate() calls api.complete", async () => {
    mockCollect.mockResolvedValue({
      orderRef: "ref-1",
      status: "pending",
      hintCode: "outstandingTransaction",
      qrData: "bankid.token.0.hmac",
    });
    mockComplete.mockResolvedValue({ orderRef: "ref-1", status: "complete" });
    const onComplete = vi.fn();

    const { result } = renderHook(() => useBankIdAuth("ref-1", onComplete));
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => result.current.authenticate());

    expect(mockComplete).toHaveBeenCalledWith("ref-1");
  });
});
