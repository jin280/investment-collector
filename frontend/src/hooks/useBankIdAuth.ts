import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "../api/collectionApi";
import type { CollectResponse } from "../types";

const POLL_INTERVAL_MS = 1000;
const SESSION_TTL_S = 300; // 5 minutes

interface UseBankIdAuthReturn {
  qrData: string | null;
  status: CollectResponse["status"] | null;
  hintCode: string | null;
  timeLeft: number;
  error: string | null;
  authenticate: () => Promise<void>;
}

export function useBankIdAuth(
  orderRef: string | null,
  onComplete: () => void
): UseBankIdAuthReturn {
  const [qrData, setQrData] = useState<string | null>(null);
  const [status, setStatus] = useState<CollectResponse["status"] | null>(
    orderRef ? "pending" : null
  );
  const [hintCode, setHintCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SESSION_TTL_S);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Polling — component remounts on new orderRef so no reset logic needed
  useEffect(() => {
    if (!orderRef) return;
    startTimeRef.current = Date.now();

    const poll = async () => {
      try {
        const data = await api.collect(orderRef);
        setStatus(data.status);
        setHintCode(data.hintCode ?? null);

        if (data.qrData) {
          setQrData(data.qrData);
        }

        // Update time left
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeLeft(Math.max(0, SESSION_TTL_S - elapsed));

        if (data.status === "complete" && !completedRef.current) {
          completedRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          onCompleteRef.current();
        }

        if (data.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (data.hintCode === "expiredTransaction") {
            setError("Session expired. Please try again.");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Polling failed");
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    // Initial poll
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderRef]);

  const authenticate = useCallback(async () => {
    if (!orderRef) return;
    try {
      await api.complete(orderRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }, [orderRef]);

  return { qrData, status, hintCode, timeLeft, error, authenticate };
}
