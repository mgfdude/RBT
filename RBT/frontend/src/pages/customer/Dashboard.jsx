import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  IndianRupee,
  LoaderCircle,
  Wallet,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return "••••";
  return `•••• •••• ${accountNumber.slice(-4)}`;
}

function Dashboard() {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bankId = user?.bankId || "alpha";

  useEffect(() => {
    let mounted = true;

    async function loadAccounts() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/banks/${bankId}/accounts`
        );

        if (mounted) {
          setAccounts(
            response.data?.data?.accounts || []
          );
        }
      } catch (err) {
        if (mounted) {
          setError(
            err.response?.data?.error?.message ||
              "Unable to load your accounts."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      mounted = false;
    };
  }, [bankId]);

  const totalBalance = useMemo(() => {
    return accounts.reduce(
      (total, account) =>
        total + Number(account.balance || 0),
      0
    );
  }, [accounts]);

  const firstName =
    user?.fullName?.split(" ")[0] ||
    user?.username ||
    "Customer";

  return (
    <main className="customer-dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            {bankId.toUpperCase()} BANK
          </p>

          <h1>
            Welcome back, {firstName}
          </h1>

          <p className="dashboard-subtitle">
            Here's an overview of your accounts.
          </p>
        </div>

        <div className="dashboard-user">
          <div className="dashboard-avatar">
            {firstName.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{firstName}</strong>
            <span>{user?.role || "CUSTOMER"}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      <section className="balance-card">
        <div className="balance-card-icon">
          <IndianRupee size={22} />
        </div>

        <div>
          <p>Total balance</p>

          {loading ? (
            <LoaderCircle
              className="loading-icon"
              size={30}
            />
          ) : (
            <h2>
              {formatCurrency(
                totalBalance,
                accounts[0]?.currency || "INR"
              )}
            </h2>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Your accounts</h2>
            <p>
              {accounts.length} account
              {accounts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <LoaderCircle
              className="loading-icon"
              size={28}
            />

            <span>Loading accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <Wallet size={32} />

            <h3>No accounts found</h3>

            <p>
              You don't have any active accounts
              with this bank.
            </p>
          </div>
        ) : (
          <div className="account-grid">
            {accounts.map((account) => (
              <article
                className="account-card"
                key={account.account_id}
              >
                <div className="account-card-top">
                  <div className="account-icon">
                    <CreditCard size={20} />
                  </div>

                  <span
                    className={`account-status ${account.status.toLowerCase()}`}
                  >
                    {account.status}
                  </span>
                </div>

                <div className="account-type">
                  {account.account_type}
                </div>

                <div className="account-number">
                  {maskAccountNumber(
                    account.account_number
                  )}
                </div>

                <div className="account-balance">
                  {formatCurrency(
                    account.balance,
                    account.currency
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="quick-actions">
        <button
          type="button"
          className="quick-action"
        >
          <ArrowUpRight size={20} />
          <span>Transfer</span>
        </button>

        <button
          type="button"
          className="quick-action"
        >
          <ArrowDownLeft size={20} />
          <span>Withdraw</span>
        </button>
      </section>
    </main>
  );
}

export default Dashboard;