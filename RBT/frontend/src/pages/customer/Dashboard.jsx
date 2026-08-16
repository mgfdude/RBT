import { useToast } from "../../context/ToastContext";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Clipboard,
  CreditCard,
  Eye,
  EyeOff,
  IndianRupee,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return "•••• •••• ••••";

  return `•••• •••• ${accountNumber.slice(-4)}`;
}

function Dashboard() {

  const { user } = useAuth();
  const toast = useToast();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showBalance, setShowBalance] = useState(true);
  const [showAccountNumber, setShowAccountNumber] =
    useState(false);

  const [copied, setCopied] = useState(false);

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
  if (!mounted) return;

  if (!err.response) {
    toast.error(
      "Server unavailable",
      "Unable to connect to the banking server."
    );
  } else if (err.response.status === 404) {
    toast.error(
      "Route not found",
      "The accounts service could not be found."
    );
  } else if (err.response.status === 401) {
    toast.error(
      "Session expired",
      "Please sign in again."
    );
  } else if (err.response.status === 403) {
    toast.error(
      "Access denied",
      "You don't have permission to view these accounts."
    );
  } else {
    toast.error(
      "Unable to load accounts",
      err.response?.data?.error?.message ||
        "An unexpected server error occurred."
    );
  }

  setError("");

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

  const primaryAccount = accounts[0];

  const firstName =
    user?.fullName?.split(" ")[0] ||
    user?.username ||
    "Customer";

  const fullName =
    user?.fullName ||
    user?.username ||
    "Customer";

  const bankName =
    primaryAccount?.bank_name ||
    user?.bankName ||
    `${bankId.toUpperCase()} BANK`;

  const bankIfsc =
    primaryAccount?.ifsc_code ||
    user?.ifscCode ||
    "—";

  const accountNumber =
    primaryAccount?.account_number || "";

  const accountType =
    primaryAccount?.account_type || "SAVINGS";

  const accountStatus =
    primaryAccount?.status || "ACTIVE";

  const currency =
    primaryAccount?.currency || "INR";

  async function copyAccountNumber() {
  if (!accountNumber) return;

  try {
    await navigator.clipboard.writeText(
      accountNumber
    );

    setCopied(true);

    toast.success(
      "Copied",
      "Account number copied to clipboard."
    );

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  } catch {
    toast.error(
      "Copy failed",
      "Unable to copy the account number."
    );
  }
}

  function handleTransfer() {
    window.location.href = "/transfer";
  }

  function handleWithdraw() {
    window.location.href = "/withdraw";
  }

  function handleSetMpin() {
    window.location.href = "/security/mpin";
  }

  return (
    <main className="customer-dashboard">

      {/* ============================================
          TOP HEADER
      ============================================ */}

      <header className="dashboard-header">

        <div className="dashboard-header-left">

          <div className="bank-brand">
            <div className="bank-brand-icon">
              <Building2 size={19} />
            </div>

            <div>
              <span className="bank-brand-name">
                {bankName}
              </span>

              <span className="bank-brand-code">
                {bankId.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="dashboard-welcome">
            <p className="dashboard-eyebrow">
              CUSTOMER DASHBOARD
            </p>

            <h1>
              Welcome back, {firstName}
            </h1>

            <p>
              Manage your accounts and banking
              activity from one place.
            </p>
          </div>

        </div>

        <div className="dashboard-user">

          <div className="dashboard-avatar">
            {firstName.charAt(0).toUpperCase()}
          </div>

          <div className="dashboard-user-info">
            <strong>{fullName}</strong>

            <span>
              {user?.role || "CUSTOMER"}
            </span>
          </div>

        </div>

      </header>


      {/* ============================================
          ERROR
      ============================================ */}

      {error && (
        <div className="dashboard-error">
          <span>{error}</span>
        </div>
      )}


      {/* ============================================
          MAIN GRID
      ============================================ */}

      <div className="dashboard-layout">

        <div className="dashboard-main">

          {/* ========================================
              BALANCE
          ======================================== */}

          <section className="balance-card">

            <div className="balance-top">

              <div>
                <p className="balance-label">
                  Total balance
                </p>

                <div className="balance-value">

                  {loading ? (
                    <LoaderCircle
                      size={29}
                      className="loading-icon"
                    />
                  ) : showBalance ? (
                    formatCurrency(
                      totalBalance,
                      currency
                    )
                  ) : (
                    "₹ ••••••"
                  )}

                  {!loading && (
                    <button
                      type="button"
                      className="balance-toggle"
                      onClick={() =>
                        setShowBalance(
                          (value) => !value
                        )
                      }
                      aria-label={
                        showBalance
                          ? "Hide balance"
                          : "Show balance"
                      }
                    >
                      {showBalance ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  )}

                </div>
              </div>

              <div className="balance-icon">
                <IndianRupee size={24} />
              </div>

            </div>

            <div className="balance-footer">

              <span>
                {accounts.length} active account
                {accounts.length !== 1
                  ? "s"
                  : ""}
              </span>

              <span>
                Currency: {currency}
              </span>

            </div>

          </section>


          {/* ========================================
              QUICK ACTIONS
          ======================================== */}

          <section className="quick-actions-section">

            <div className="section-title-row">

              <div>
                <h2>Quick actions</h2>
                <p>
                  Frequently used banking services
                </p>
              </div>

            </div>

            <div className="quick-actions-grid">

              <button
                type="button"
                className="action-card transfer-action"
                onClick={handleTransfer}
              >
                <div className="action-icon">
                  <ArrowUpRight size={22} />
                </div>

                <div className="action-content">
                  <strong>Transfer money</strong>

                  <span>
                    Send money to a bank account
                  </span>
                </div>

                <ChevronRight size={19} />
              </button>


              <button
                type="button"
                className="action-card withdraw-action"
                onClick={handleWithdraw}
              >
                <div className="action-icon">
                  <ArrowDownLeft size={22} />
                </div>

                <div className="action-content">
                  <strong>Withdraw</strong>

                  <span>
                    Withdraw funds from your account
                  </span>
                </div>

                <ChevronRight size={19} />
              </button>

            </div>

          </section>


          {/* ========================================
              ACCOUNTS
          ======================================== */}

          <section className="dashboard-section">

            <div className="section-title-row">

              <div>
                <h2>Your accounts</h2>

                <p>
                  {accounts.length} account
                  {accounts.length !== 1
                    ? "s"
                    : ""} linked to your profile
                </p>
              </div>

            </div>


            {loading ? (

              <div className="dashboard-loading">
                <LoaderCircle
                  size={28}
                  className="loading-icon"
                />

                <span>
                  Loading your accounts...
                </span>
              </div>

            ) : accounts.length === 0 ? (

              <div className="empty-state">

                <Wallet size={34} />

                <h3>No accounts found</h3>

                <p>
                  You don't have any accounts
                  with this bank.
                </p>

              </div>

            ) : (

              <div className="account-list">

                {accounts.map((account) => (

                  <article
                    className="account-card"
                    key={account.account_id}
                  >

                    <div className="account-card-header">

                      <div className="account-card-title">

                        <div className="account-icon">
                          <CreditCard size={20} />
                        </div>

                        <div>
                          <strong>
                            {account.account_type ||
                              "SAVINGS"}
                          </strong>

                          <span>
                            {account.currency ||
                              "INR"} Account
                          </span>
                        </div>

                      </div>


                      <span
                        className={`account-status ${(
                          account.status || ""
                        ).toLowerCase()}`}
                      >
                        <span className="status-dot" />

                        {account.status}
                      </span>

                    </div>


                    <div className="account-card-body">

                      <div>
                        <span className="account-detail-label">
                          Account number
                        </span>

                        <strong className="account-number">
                          {maskAccountNumber(
                            account.account_number
                          )}
                        </strong>
                      </div>


                      <div>
                        <span className="account-detail-label">
                          Available balance
                        </span>

                        <strong className="account-balance">
                          {formatCurrency(
                            account.balance,
                            account.currency
                          )}
                        </strong>
                      </div>

                    </div>

                  </article>

                ))}

              </div>

            )}

          </section>


          {/* ========================================
              RECENT TRANSACTIONS
          ======================================== */}

          <section className="transactions-card">

            <div className="section-title-row">

              <div>
                <h2>Recent transactions</h2>

                <p>
                  Your latest banking activity
                </p>
              </div>

              <button
                type="button"
                className="text-button"
              >
                View all
                <ChevronRight size={16} />
              </button>

            </div>


            <div className="transaction-empty">

              <div className="transaction-empty-icon">
                <Wallet size={21} />
              </div>

              <div>
                <strong>
                  Transaction history
                </strong>

                <p>
                  Your recent transfers and
                  withdrawals will appear here.
                </p>
              </div>

            </div>

          </section>

        </div>


        {/* ==========================================
            RIGHT SIDEBAR
        ========================================== */}

        <aside className="dashboard-sidebar">

          {/* ========================================
              ACCOUNT DETAILS
          ======================================== */}

          <section className="info-card">

            <div className="info-card-header">

              <div>
                <h3>Account details</h3>

                <p>
                  Your banking information
                </p>
              </div>

              <CreditCard size={19} />

            </div>


            <div className="details-list">

              <div className="detail-row">

                <span>
                  <UserRound size={16} />
                  Account holder
                </span>

                <strong>
                  {fullName}
                </strong>

              </div>


              <div className="detail-row">

                <span>
                  <Phone size={16} />
                  Phone
                </span>

                <strong>
                  {user?.phone || "—"}
                </strong>

              </div>


              <div className="detail-row">

                <span>
                  <Mail size={16} />
                  Email
                </span>

                <strong>
                  {user?.email || "—"}
                </strong>

              </div>


              <div className="detail-row">

                <span>
                  <Building2 size={16} />
                  Bank ID
                </span>

                <strong>
                  {bankId}
                </strong>

              </div>


              <div className="detail-row">

                <span>
                  IFSC code
                </span>

                <strong>
                  {bankIfsc}
                </strong>

              </div>


              <div className="detail-row">

                <span>
                  Account type
                </span>

                <strong>
                  {accountType}
                </strong>

              </div>


              <div className="detail-row account-number-row">

                <span>
                  Account number
                </span>

                <div className="account-number-actions">

                  <strong>
                    {showAccountNumber
                      ? accountNumber
                      : maskAccountNumber(
                          accountNumber
                        )}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAccountNumber(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showAccountNumber
                        ? "Hide account number"
                        : "Show account number"
                    }
                  >
                    {showAccountNumber ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    aria-label="Copy account number"
                  >
                    {copied ? (
                      <Check size={15} />
                    ) : (
                      <Clipboard size={15} />
                    )}
                  </button>

                </div>

              </div>

            </div>

          </section>


          {/* ========================================
              SECURITY
          ======================================== */}

          <section className="security-card">

            <div className="security-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="security-content">

              <span className="security-label">
                ACCOUNT SECURITY
              </span>

              <h3>
                Secure your transactions
              </h3>

              <p>
                Set an MPIN to authorize
                transfers and withdrawals.
              </p>

              <button
                type="button"
                onClick={handleSetMpin}
                className="security-button"
              >
                Set up MPIN
                <ChevronRight size={16} />
              </button>

            </div>

          </section>


          {/* ========================================
              ACCOUNT STATUS
          ======================================== */}

          <section className="status-card">

            <div className="status-card-icon">
              <Check size={17} />
            </div>

            <div>
              <strong>
                Account {accountStatus}
              </strong>

              <p>
                Your account is currently
                {accountStatus === "ACTIVE"
                  ? " active and ready for transactions."
                  : ` ${accountStatus.toLowerCase()}.`}
              </p>
            </div>

          </section>

        </aside>

      </div>

    </main>
  );
}

export default Dashboard;