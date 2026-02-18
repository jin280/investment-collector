import type { CollectionResult } from "../types";

interface InvestmentResultsProps {
  data: CollectionResult;
  onReset: () => void;
}

const formatCurrency = (value: number, currency: string = "SEK") =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency }).format(value);

const typeColors: Record<string, string> = {
  Fund: "bg-blue-100 text-blue-700",
  Stock: "bg-purple-100 text-purple-700",
  ETF: "bg-indigo-100 text-indigo-700",
  Bond: "bg-amber-100 text-amber-700",
  Cash: "bg-gray-100 text-gray-700",
};

export function InvestmentResults({ data, onReset }: InvestmentResultsProps) {
  const totalPortfolio = data.accounts.reduce((sum, a) => sum + a.totalValue, 0);

  if (data.accounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-500">No accounts found for this user.</p>
        </div>
        <button
          onClick={onReset}
          className="w-full py-3 px-4 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Start new collection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Portfolio summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total portfolio value</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalPortfolio)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{data.accounts.length} accounts</p>
            <p className="text-sm text-gray-500">
              {data.accounts.reduce((sum, a) => sum + a.holdings.length, 0)} holdings
            </p>
          </div>
        </div>
      </div>

      {/* Account cards */}
      {data.accounts.map((account, accountIndex) => (
        <div
          key={`${account.accountName}-${accountIndex}`}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{account.accountName}</h3>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mr-2">
                {account.currency}
              </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(account.totalValue, account.currency)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {account.holdings.map((holding, holdingIndex) => (
              <div
                key={`${holding.name}-${holding.type}-${holdingIndex}`}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      typeColors[holding.type] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {holding.type}
                  </span>
                  <span className="text-sm text-gray-900">{holding.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {formatCurrency(holding.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={onReset}
        className="w-full py-3 px-4 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
      >
        Start new collection
      </button>
    </div>
  );
}
