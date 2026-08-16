import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FilePlus2,
  Landmark,
  LoaderCircle,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

import "../../styles/ad-dashboard.css";

function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return "••••";

  return `•••• ${String(accountNumber).slice(-4)}`;
}

function getStatusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  type = "default",
}) {
  return (
    <article className={`ad-stat-card ${type}`}>
      <div className="ad-stat-icon">
        <Icon size={20} />
      </div>

      <div className="ad-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>

        {description && (
          <small>{description}</small>
        )}
      </div>
    </article>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}) {
  return (
    <button
      type="button"
      className={`ad-action-button ${variant}`}
      onClick={onClick}
    >
      <Icon size={18} />
      <span>{label}</span>
      <ChevronRight size={16} />
    </button>
  );
}

function Dashboard() {

  const navigate = useNavigate();  
  const { user } = useAuth();
   
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [selectedAccount, setSelectedAccount] =
    useState(null);

  const bankId =
    user?.bankId ||
    user?.bank_id ||
    "alpha";

  /*
   * --------------------------------------------------
   * LOAD ACCOUNTS
   * --------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function loadAccounts() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
  `/banks/${bankId}/admin/accounts`
);

        if (!mounted) return;

        setAccounts(
          response.data?.data?.accounts || []
        );
      } catch (err) {
        if (!mounted) return;

        setError(
          err.response?.data?.error?.message ||
            "Unable to load bank accounts."
        );
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

  /*
   * --------------------------------------------------
   * ACCOUNT STATISTICS
   * --------------------------------------------------
   */

  const statistics = useMemo(() => {
    const active = accounts.filter(
      (account) =>
        String(account.status).toUpperCase() ===
        "ACTIVE"
    );

    const blocked = accounts.filter(
      (account) =>
        String(account.status).toUpperCase() ===
        "BLOCKED"
    );

    const balance = accounts.reduce(
      (total, account) =>
        total + Number(account.balance || 0),
      0
    );

    const savings = accounts.filter(
      (account) =>
        String(account.account_type).toUpperCase() ===
        "SAVINGS"
    );

    const current = accounts.filter(
      (account) =>
        String(account.account_type).toUpperCase() ===
        "CURRENT"
    );

    return {
      total: accounts.length,
      active: active.length,
      blocked: blocked.length,
      balance,
      savings: savings.length,
      current: current.length,
    };
  }, [accounts]);

  /*
   * --------------------------------------------------
   * SEARCH / FILTER
   * --------------------------------------------------
   */

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const status =
        String(account.status || "")
          .toUpperCase();

      if (
        statusFilter !== "ALL" &&
        status !== statusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        account.account_id,
        account.account_number,
        account.user_id,
        account.account_type,
        account.currency,
        account.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [
    accounts,
    search,
    statusFilter,
  ]);

  /*
   * --------------------------------------------------
   * REFRESH
   * --------------------------------------------------
   */

  async function refreshAccounts() {
    try {
      setError("");

      const response = await api.get(
  `/banks/${bankId}/admin/accounts`
);

      setAccounts(
        response.data?.data?.accounts || []
      );
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Unable to refresh accounts."
      );
    }
  }

  /*
   * --------------------------------------------------
   * ACTION PLACEHOLDERS
   *
   * These are deliberately isolated.
   * We will connect them to the admin API endpoints
   * as we build those endpoints.
   * --------------------------------------------------
   */

  function handleOpenAccount() {
  navigate("/admin/accounts/open");
}

  function handleDeposit(account) {
    setSelectedAccount(account);

    alert(
      `Deposit action selected for ${maskAccountNumber(
        account.account_number
      )}`
    );
  }

  function handleWithdraw(account) {
    setSelectedAccount(account);

    alert(
      `Withdrawal action selected for ${maskAccountNumber(
        account.account_number
      )}`
    );
  }

  function handleBlock(account) {
    setSelectedAccount(account);

    alert(
      `Block action selected for ${maskAccountNumber(
        account.account_number
      )}`
    );
  }

  function handleUnblock(account) {
    setSelectedAccount(account);

    alert(
      `Unblock action selected for ${maskAccountNumber(
        account.account_number
      )}`
    );
  }

  function handleTransactions(account) {
    setSelectedAccount(account);

    alert(
      `Transaction history selected for ${maskAccountNumber(
        account.account_number
      )}`
    );
  }

  const bankName =
    user?.bankName ||
    user?.bank_name ||
    `${String(bankId).toUpperCase()} Bank`;

  const adminName =
    user?.fullName ||
    user?.full_name ||
    user?.username ||
    "Administrator";

  return (
    <main className="ad-dashboard">

      {/* ==================================================
          TOP HEADER
          ================================================== */}

      <header className="ad-header">

        <div className="ad-header-brand">

          <div className="ad-bank-logo">
            <Landmark size={22} />
          </div>

          <div>
            <div className="ad-header-bank-name">
              {bankName}
            </div>

            <div className="ad-header-bank-meta">
              Core Banking Administration
            </div>
          </div>

        </div>

        <div className="ad-header-right">

          <div className="ad-system-status">
            <span className="ad-status-dot" />
            System operational
          </div>

          <div className="ad-admin-profile">

            <div className="ad-admin-avatar">
              {adminName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>{adminName}</strong>
              <span>
                {user?.role || "ADMIN"}
              </span>
            </div>

          </div>

        </div>

      </header>

      <div className="ad-container">

        {/* ==================================================
            PAGE INTRO
            ================================================== */}

        <section className="ad-page-intro">

          <div>
            <div className="ad-eyebrow">
              BANK OPERATIONS
            </div>

            <h1>Administration Dashboard</h1>

            <p>
              Monitor accounts, customers and
              banking activity from one place.
            </p>
          </div>

          <button
            type="button"
            className="ad-primary-button"
            onClick={handleOpenAccount}
          >
            <FilePlus2 size={18} />
            Open account
          </button>

        </section>

        {/* ==================================================
            ERROR
            ================================================== */}

        {error && (
          <div className="ad-error">
            <AlertTriangle size={18} />

            <span>{error}</span>

            <button
              type="button"
              onClick={refreshAccounts}
            >
              Retry
            </button>
          </div>
        )}

        {/* ==================================================
            STATISTICS
            ================================================== */}

        <section className="ad-stat-grid">

          <StatCard
            icon={Wallet}
            label="Total deposits"
            value={
              loading
                ? "—"
                : formatCurrency(
                    statistics.balance
                  )
            }
            description="Across visible accounts"
            type="primary"
          />

          <StatCard
            icon={CreditCard}
            label="Total accounts"
            value={
              loading
                ? "—"
                : statistics.total
            }
            description={`${statistics.savings} savings · ${statistics.current} current`}
          />

          <StatCard
            icon={CheckCircle2}
            label="Active accounts"
            value={
              loading
                ? "—"
                : statistics.active
            }
            description="Currently operational"
            type="success"
          />

          <StatCard
            icon={Ban}
            label="Blocked accounts"
            value={
              loading
                ? "—"
                : statistics.blocked
            }
            description="Require attention"
            type="danger"
          />

        </section>

        {/* ==================================================
            QUICK OPERATIONS
            ================================================== */}

        <section className="ad-section">

          <div className="ad-section-heading">

            <div>
              <span className="ad-section-label">
                OPERATIONS
              </span>

              <h2>Quick actions</h2>

              <p>
                Common banking administration tasks.
              </p>
            </div>

          </div>

          <div className="ad-action-grid">

            <ActionButton
              icon={FilePlus2}
              label="Open account"
              onClick={handleOpenAccount}
              variant="primary"
            />

            <ActionButton
              icon={CircleDollarSign}
              label="Deposit funds"
              onClick={() => {
                if (accounts[0]) {
                  handleDeposit(accounts[0]);
                }
              }}
            />

            <ActionButton
              icon={ArrowDownLeft}
              label="Process withdrawal"
              onClick={() => {
                if (accounts[0]) {
                  handleWithdraw(accounts[0]);
                }
              }}
            />

            <ActionButton
              icon={Activity}
              label="View transactions"
              onClick={() => {
                if (accounts[0]) {
                  handleTransactions(accounts[0]);
                }
              }}
            />

          </div>

        </section>

        {/* ==================================================
            ACCOUNTS
            ================================================== */}

        <section className="ad-section">

          <div className="ad-section-heading">

            <div>
              <span className="ad-section-label">
                ACCOUNT MANAGEMENT
              </span>

              <h2>Bank accounts</h2>

              <p>
                Search and manage customer accounts.
              </p>
            </div>

            <div className="ad-section-count">
              {filteredAccounts.length} shown
            </div>

          </div>

          {/* SEARCH */}

          <div className="ad-toolbar">

            <div className="ad-search">

              <Search size={18} />

              <input
                type="search"
                placeholder="Search account, user ID, type..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="ad-filter"
            >
              <option value="ALL">
                All statuses
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="BLOCKED">
                Blocked
              </option>

              <option value="CLOSED">
                Closed
              </option>
            </select>

            <button
              type="button"
              className="ad-refresh-button"
              onClick={refreshAccounts}
              disabled={loading}
            >
              <Activity size={17} />
              Refresh
            </button>

          </div>

          {/* ACCOUNT TABLE */}

          {loading ? (
            <div className="ad-loading">

              <LoaderCircle
                size={28}
                className="ad-spin"
              />

              <span>
                Loading bank accounts...
              </span>

            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="ad-empty">

              <CreditCard size={34} />

              <h3>
                No accounts found
              </h3>

              <p>
                Try changing your search or
                status filter.
              </p>

            </div>
          ) : (
            <div className="ad-table-wrapper">

              <table className="ad-table">

                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Owner</th>
                    <th>Type</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>

                <tbody>

                  {filteredAccounts.map(
                    (account) => (
                      <tr
                        key={
                          account.account_id
                        }
                      >

                        <td>

                          <div className="ad-account-cell">

                            <div className="ad-account-icon">
                              <CreditCard
                                size={17}
                              />
                            </div>

                            <div>
                              <strong>
                                {maskAccountNumber(
                                  account.account_number
                                )}
                              </strong>

                              <span>
                                {account.account_id}
                              </span>
                            </div>

                          </div>

                        </td>

                        <td>

                          <div className="ad-owner-cell">

                            <span>
                              User
                            </span>

                            <strong>
                              {account.user_id}
                            </strong>

                          </div>

                        </td>

                        <td>

                          <span className="ad-type-badge">
                            {account.account_type}
                          </span>

                        </td>

                        <td>

                          <strong className="ad-balance">
                            {formatCurrency(
                              account.balance,
                              account.currency
                            )}
                          </strong>

                        </td>

                        <td>

                          <span
                            className={`ad-status ${getStatusClass(
                              account.status
                            )}`}
                          >
                            <span />
                            {account.status}
                          </span>

                        </td>

                        <td className="ad-date">
                          {formatDate(
                            account.created_at
                          )}
                        </td>

                        <td>

                          <div className="ad-row-actions">

                            <button
                              type="button"
                              title="Deposit"
                              onClick={() =>
                                handleDeposit(
                                  account
                                )
                              }
                            >
                              <CircleDollarSign
                                size={17}
                              />
                            </button>

                            <button
                              type="button"
                              title="Transactions"
                              onClick={() =>
                                handleTransactions(
                                  account
                                )
                              }
                            >
                              <Activity
                                size={17}
                              />
                            </button>

                            <button
                              type="button"
                              title={
                                String(
                                  account.status
                                ).toUpperCase() ===
                                "BLOCKED"
                                  ? "Unblock"
                                  : "Block"
                              }
                              onClick={() =>
                                String(
                                  account.status
                                ).toUpperCase() ===
                                "BLOCKED"
                                  ? handleUnblock(
                                      account
                                    )
                                  : handleBlock(
                                      account
                                    )
                              }
                            >
                              {String(
                                account.status
                              ).toUpperCase() ===
                              "BLOCKED" ? (
                                <CheckCircle2
                                  size={17}
                                />
                              ) : (
                                <Ban
                                  size={17}
                                />
                              )}
                            </button>

                            <button
                              type="button"
                              title="More"
                              onClick={() =>
                                setSelectedAccount(
                                  account
                                )
                              }
                            >
                              <MoreHorizontal
                                size={17}
                              />
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* ==================================================
            BANK INFORMATION
            ================================================== */}

        <section className="ad-section">

          <div className="ad-section-heading">

            <div>
              <span className="ad-section-label">
                BANK INFORMATION
              </span>

              <h2>Bank details</h2>

              <p>
                Core identification details for this
                banking institution.
              </p>
            </div>

          </div>

          <div className="ad-bank-details">

            <div className="ad-detail-card">

              <Building2 size={20} />

              <span>Bank ID</span>

              <strong>
                {bankId}
              </strong>

            </div>

            <div className="ad-detail-card">

              <Landmark size={20} />

              <span>Bank name</span>

              <strong>
                {bankName}
              </strong>

            </div>

            <div className="ad-detail-card">

              <ShieldCheck size={20} />

              <span>IFSC</span>

              <strong>
                {user?.ifscCode ||
                  user?.ifsc_code ||
                  "—"}
              </strong>

            </div>

            <div className="ad-detail-card">

              <Users size={20} />

              <span>Administrator</span>

              <strong>
                {adminName}
              </strong>

            </div>

          </div>

        </section>

      </div>

      {/* ==================================================
          SELECTED ACCOUNT DRAWER
          ================================================== */}

      {selectedAccount && (
        <div
          className="ad-drawer-backdrop"
          onClick={() =>
            setSelectedAccount(null)
          }
        >

          <aside
            className="ad-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="ad-drawer-header">

              <div>
                <span>
                  ACCOUNT DETAILS
                </span>

                <h2>
                  {maskAccountNumber(
                    selectedAccount.account_number
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedAccount(null)
                }
              >
                ×
              </button>

            </div>

            <div className="ad-drawer-balance">
              <span>Available balance</span>

              <strong>
                {formatCurrency(
                  selectedAccount.balance,
                  selectedAccount.currency
                )}
              </strong>
            </div>

            <div className="ad-detail-list">

              <div>
                <span>Account ID</span>
                <strong>
                  {selectedAccount.account_id}
                </strong>
              </div>

              <div>
                <span>Account number</span>
                <strong>
                  {selectedAccount.account_number}
                </strong>
              </div>

              <div>
                <span>User ID</span>
                <strong>
                  {selectedAccount.user_id}
                </strong>
              </div>

              <div>
                <span>Bank ID</span>
                <strong>
                  {selectedAccount.bank_id ||
                    bankId}
                </strong>
              </div>

              <div>
                <span>Account type</span>
                <strong>
                  {selectedAccount.account_type}
                </strong>
              </div>

              <div>
                <span>Currency</span>
                <strong>
                  {selectedAccount.currency}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {selectedAccount.status}
                </strong>
              </div>

              <div>
                <span>Created</span>
                <strong>
                  {formatDate(
                    selectedAccount.created_at
                  )}
                </strong>
              </div>

            </div>

            <div className="ad-drawer-actions">

              <button
                type="button"
                onClick={() =>
                  handleDeposit(
                    selectedAccount
                  )
                }
              >
                <CircleDollarSign size={18} />
                Deposit
              </button>

              <button
                type="button"
                onClick={() =>
                  handleWithdraw(
                    selectedAccount
                  )
                }
              >
                <ArrowDownLeft size={18} />
                Withdraw
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTransactions(
                    selectedAccount
                  )
                }
              >
                <Activity size={18} />
                Transactions
              </button>

              {String(
                selectedAccount.status
              ).toUpperCase() === "BLOCKED" ? (
                <button
                  type="button"
                  onClick={() =>
                    handleUnblock(
                      selectedAccount
                    )
                  }
                >
                  <CheckCircle2 size={18} />
                  Unblock account
                </button>
              ) : (
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    handleBlock(
                      selectedAccount
                    )
                  }
                >
                  <Ban size={18} />
                  Block account
                </button>
              )}

            </div>

          </aside>

        </div>
      )}

    </main>
  );
}

export default Dashboard;