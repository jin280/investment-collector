import { QRCodeSVG } from "qrcode.react";
import { useBankIdAuth } from "../hooks/useBankIdAuth";
import { ErrorMessage } from "./ErrorMessage";

interface BankIdAuthProps {
  orderRef: string;
  onComplete: () => void;
  onCancel: () => void;
  fetchError?: string | null;
}

export function BankIdAuth({ orderRef, onComplete, onCancel, fetchError }: BankIdAuthProps) {
  const { qrData, status, timeLeft, error, authenticate } = useBankIdAuth(
    orderRef,
    onComplete
  );

  const displayError = fetchError || error;

  const minutes = Math.floor(timeLeft / 60);
  const progressPercent = (timeLeft / 300) * 100;

  const isFailed = status === "failed";
  const isComplete = status === "complete";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* BankID-style card with light blue background */}
      <div className="bg-sky-50 p-8">
        {/* Back button */}
        {!isComplete && (
          <button
            onClick={onCancel}
            className="mb-4 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isComplete && fetchError
              ? "Failed to load data"
              : isComplete
                ? "Authenticated!"
                : isFailed
                  ? "Authentication Failed"
                  : "Start the BankID app"}
          </h2>

          {!isFailed && !isComplete && (
            <p className="text-sm text-gray-600 mb-6">
              Start the BankID app and press Scan QR code.
              <br />
              Then scan this QR code:
            </p>
          )}

          {displayError && (
            <div className="mb-4 text-left">
              <ErrorMessage message={displayError} />
            </div>
          )}

          {/* QR Code */}
          {qrData && !isFailed && !isComplete && (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 inline-block mb-2">
                <QRCodeSVG value={qrData} size={200} level="M" />
              </div>

              {/* Progress bar directly under QR, matching BankID style */}
              <div className="w-[224px] mb-1">
                <div
                  className="w-full bg-gray-300 h-1.5 rounded-full"
                  role="progressbar"
                  aria-valuenow={timeLeft}
                  aria-valuemin={0}
                  aria-valuemax={300}
                  aria-label="Session time remaining"
                >
                  <div
                    className="bg-teal-700 h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-teal-700 font-medium">
                {minutes} {minutes === 1 ? "minute" : "minutes"} left
              </p>
            </div>
          )}

          {isComplete && !fetchError && (
            <div className="my-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-500">Loading your investment data...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions below the blue area */}
      {isComplete && fetchError && (
        <div className="p-6 space-y-3">
          <button
            onClick={onComplete}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry loading data
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 px-4 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Start over
          </button>
        </div>
      )}
      {!isComplete && (
        <div className="p-6 space-y-3">
          {!isFailed && (
            <button
              onClick={authenticate}
              className="w-full py-3 px-4 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Mock successful login
            </button>
          )}

          {isFailed && (
            <button
              onClick={onCancel}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
