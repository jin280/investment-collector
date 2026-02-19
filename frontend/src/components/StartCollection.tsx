import { useState, type FormEvent } from "react";
import { validatePersonnummer } from "../utils/personnummer";
import { ErrorMessage } from "./ErrorMessage";

interface StartCollectionProps {
  onStart: (personalNumber: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function StartCollection({ onStart, loading, error }: StartCollectionProps) {
  const [personalNumber, setPersonalNumber] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setPersonalNumber(value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const result = validatePersonnummer(personalNumber);
    if (!result.valid) {
      setValidationError(result.error!);
      return;
    }

    await onStart(personalNumber);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {/* Provider header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          A
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Avanza</h3>
          <p className="text-xs text-gray-500">Investment provider</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-500 mt-2">
          Enter your Swedish personal identity number to authenticate via BankID and collect your investment data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="personnummer" className="block text-sm font-medium text-gray-700 mb-1">
            Personal identity number
          </label>
          <input
            id="personnummer"
            type="text"
            value={personalNumber}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="YYYYMMDD-XXXX"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
            disabled={loading}
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-400">Format: YYYYMMDD-XXXX or YYMMDDXXXX</p>
        </div>

        {validationError && <ErrorMessage message={validationError} />}
        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={loading || !personalNumber.trim()}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </span>
          ) : (
            "Connect Avanza and fetch my investments"
          )}
        </button>
      </form>
    </div>
  );
}
