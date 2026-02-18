import { Layout } from "./components/Layout";
import { StartCollection } from "./components/StartCollection";
import { BankIdAuth } from "./components/BankIdAuth";
import { InvestmentResults } from "./components/InvestmentResults";
import { useCollection } from "./hooks/useCollection";

function App() {
  const {
    step, orderRef, investmentData, error, loading,
    startCollection, fetchResults, cancelCollection, reset,
  } = useCollection();

  return (
    <Layout>
      {step === "start" && (
        <StartCollection onStart={startCollection} loading={loading} error={error} />
      )}

      {step === "authenticating" && orderRef && (
        <BankIdAuth
          orderRef={orderRef}
          onComplete={fetchResults}
          onCancel={cancelCollection}
          fetchError={error}
        />
      )}

      {step === "results" && investmentData && (
        <InvestmentResults data={investmentData} onReset={reset} />
      )}
    </Layout>
  );
}

export default App;
