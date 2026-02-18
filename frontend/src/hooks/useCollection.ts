import { useState, useCallback } from "react";
import * as api from "../api/collectionApi";
import type { AppStep, CollectionResult } from "../types";

interface UseCollectionReturn {
  step: AppStep;
  orderRef: string | null;
  investmentData: CollectionResult | null;
  error: string | null;
  loading: boolean;
  startCollection: (personalNumber: string) => Promise<void>;
  fetchResults: () => Promise<void>;
  cancelCollection: () => void;
  reset: () => void;
}

export function useCollection(): UseCollectionReturn {
  const [step, setStep] = useState<AppStep>("start");
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [investmentData, setInvestmentData] = useState<CollectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startCollection = useCallback(async (personalNumber: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.auth(personalNumber);
      setOrderRef(data.orderRef);
      setStep("authenticating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start collection");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    if (!orderRef) return;
    setLoading(true);
    try {
      const data = await api.getResult(orderRef);
      setInvestmentData(data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }, [orderRef]);

  const cancelCollection = useCallback(() => {
    if (orderRef) {
      api.cancel(orderRef).catch((err) => {
        console.warn("Failed to cancel session:", err);
      });
    }
    setStep("start");
    setOrderRef(null);
    setError(null);
    setLoading(false);
  }, [orderRef]);

  const reset = useCallback(() => {
    setStep("start");
    setOrderRef(null);
    setInvestmentData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    step, orderRef, investmentData, error, loading,
    startCollection, fetchResults, cancelCollection, reset,
  };
}
