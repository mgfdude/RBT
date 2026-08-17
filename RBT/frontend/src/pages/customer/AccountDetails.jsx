import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";


// ==================================================
// HELPERS
// ==================================================

const money = (
  value,
  currency = "INR"
) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));


const mask = (value) =>
  value
    ? `•••• •••• ${String(value).slice(-4)}`
    : "—";


// ==================================================
// ACCOUNT DETAILS
// ==================================================

export default function AccountDetails() {
  const {
    accountId,
  } = useParams();

  const {
    user,
  } = useAuth();

  const navigate = useNavigate();

  const bankId =
    user?.bankId ||
    user?.bank_id ||
    "alpha";


  const [
    account,
    setAccount,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    show,
    setShow,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);


  // ==================================================
  // LOAD ACCOUNT
  // ==================================================

  const load = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/banks/${bankId}/accounts/${accountId}`
          );

        setAccount(
          response.data?.data?.account ||
            null
        );
      } catch (err) {
        setError(
          err.response?.data?.error?.message ||
            "Unable to load this account."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      bankId,
      accountId,
    ]
  );


  useEffect(() => {
    load();
  }, [load]);


  // ==================================================
  // COPY ACCOUNT NUMBER
  // ==================================================

  const copyAccountNumber =
    async () => {
      try {
        await navigator.clipboard.writeText(
          account.account_number
        );

        setCopied(true);

        setTimeout(
          () => setCopied(false),
          1500
        );
      } catch {
        setError(
          "Unable to copy account number."
        );
      }
    };


  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <Shell>
        <div className="card loading">
          <LoaderCircle
            className="spin"
            size={32}
          />

          <span>
            Loading account…
          </span>
        </div>
      </Shell>
    );
  }


  // ==================================================
  // ERROR / NOT FOUND
  // ==================================================

  if (
    error ||
    !account
  ) {
    return (
      <Shell>
        <div className="card empty">

          <CreditCard
            size={42}
          />

          <h2>
            Account unavailable
          </h2>

          <p>
            {error ||
              "Account not found."}
          </p>

          <button
            onClick={() =>
              navigate("/accounts")
            }
          >
            <ArrowLeft
              size={16}
            />

            Back to accounts
          </button>

        </div>
      </Shell>
    );
  }


  // ==================================================
  // ACCOUNT STATUS
  // ==================================================

  const active =
    String(account.status)
      .toUpperCase() ===
    "ACTIVE";


  // ==================================================
  // PAGE
  // ==================================================

  return (
    <Shell>

      <style>
        {css}
      </style>

      <div className="card">

        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="head">

          <div className="brand">

            <div className="icon">
              <CreditCard
                size={25}
              />
            </div>

            <div>

              <small>
                ACCOUNT DETAILS
              </small>

              <h1>
                {account.account_type ||
                  "Bank Account"}
              </h1>

              <p>
                {account.bank_name ||
                  bankId.toUpperCase()}
              </p>

            </div>

          </div>


          <span
            className={
              active
                ? "ok"
                : "bad"
            }
          >
            {account.status}
          </span>

        </div>


        {/* ==========================================
            BALANCE
            ========================================== */}

        <div className="hero">

          <small>
            AVAILABLE BALANCE
          </small>

          <strong>
            {money(
              account.balance,
              account.currency ||
                "INR"
            )}
          </strong>

        </div>


        {/* ==========================================
            ACCOUNT INFORMATION
            ========================================== */}

        <div className="info-grid">

          <Info label="Account number">

            <span className="number">

              {show
                ? account.account_number
                : mask(
                    account.account_number
                  )}

              <button
                type="button"
                title={
                  show
                    ? "Hide account number"
                    : "Show account number"
                }
                onClick={() =>
                  setShow(
                    (value) =>
                      !value
                  )
                }
              >
                {show ? (
                  <EyeOff
                    size={15}
                  />
                ) : (
                  <Eye
                    size={15}
                  />
                )}
              </button>


              <button
                type="button"
                title="Copy account number"
                onClick={
                  copyAccountNumber
                }
              >
                {copied ? (
                  <Check
                    size={15}
                  />
                ) : (
                  <Copy
                    size={15}
                  />
                )}
              </button>

            </span>

          </Info>


          <Info label="IFSC">
            {account.ifsc_code ||
              "—"}
          </Info>


          <Info label="Currency">
            {account.currency ||
              "INR"}
          </Info>


          <Info label="Account ID">
            {account.account_id}
          </Info>


          <Info label="Created">
            {account.created_at
              ? new Date(
                  account.created_at
                ).toLocaleString(
                  "en-IN"
                )
              : "—"}
          </Info>


          <Info label="Security">

            <ShieldCheck
              size={15}
            />

            Customer protected

          </Info>

        </div>


        {/* ==========================================
            CUSTOMER ACTIONS
            ========================================== */}

        <div className="buttons">

          <button
            type="button"
            onClick={() =>
              navigate("/accounts")
            }
          >
            <ArrowLeft
              size={16}
            />

            Accounts
          </button>


          <button
            type="button"
            disabled={!active}
            onClick={() =>
              navigate(
                `/transfer?accountId=${account.account_id}`
              )
            }
          >
            <ArrowUpRight
              size={16}
            />

            Transfer
          </button>

        </div>


        {/* ==========================================
            BANK-OPERATED NOTICE
            ========================================== */}

        <div className="bank-notice">

          <ShieldCheck
            size={17}
          />

          <div>

            <strong>
              Bank-operated transactions
            </strong>

            <p>
              Deposits and withdrawals
              are handled by authorized
              bank administrators.
            </p>

          </div>

        </div>

      </div>

    </Shell>
  );
}


// ==================================================
// INFO COMPONENT
// ==================================================

function Info({
  label,
  children,
}) {
  return (
    <div className="info">

      <small>
        {label}
      </small>

      <b>
        {children}
      </b>

    </div>
  );
}


// ==================================================
// PAGE SHELL
// ==================================================

function Shell({
  children,
}) {
  return (
    <main className="account-page">

      <div className="account-container">
        {children}
      </div>

    </main>
  );
}


// ==================================================
// STYLES
// ==================================================

const css = `

.account-page {
  min-height: 100vh;
  background: #f6f8fc;
  padding: 32px;
  color: #172033;
}

.account-container {
  max-width: 980px;
  margin: auto;
}

.card {
  background: #fff;
  border: 1px solid #e7eaf0;
  border-radius: 20px;
  padding: 27px;
  box-shadow: 0 6px 25px #1018280d;
}

.loading,
.empty {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.empty p {
  color: #667085;
  margin: 0;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.brand {
  display: flex;
  gap: 14px;
}

.icon {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  background: #eef2ff;
  color: #3730a3;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.brand small {
  font-size: 11px;
  letter-spacing: .1em;
  font-weight: 800;
  color: #667085;
}

.brand h1 {
  font-size: 30px;
  margin: 5px 0;
}

.brand p {
  margin: 0;
  color: #667085;
}

.head > span {
  font-size: 10px;
  font-weight: 850;
  padding: 7px 10px;
  border-radius: 999px;
  height: max-content;
}

.ok {
  background: #ecfdf3;
  color: #027a48;
}

.bad {
  background: #fef3f2;
  color: #b42318;
}

.hero {
  background: #111827;
  color: #fff;
  border-radius: 16px;
  padding: 22px;
  margin: 26px 0;
}

.hero small {
  opacity: .7;
  font-size: 11px;
}

.hero strong {
  display: block;
  font-size: 36px;
  margin-top: 5px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

.info {
  border: 1px solid #edf0f4;
  border-radius: 13px;
  padding: 14px;
}

.info small {
  display: block;
  font-size: 10px;
  color: #98a2b3;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.info b {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-top: 7px;
  word-break: break-word;
  font-size: 13px;
}

.number {
  display: flex;
  align-items: center;
  gap: 7px;
}

.number button {
  border: 1px solid #e4e7ec;
  background: #fff;
  border-radius: 7px;
  padding: 5px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.number button:hover {
  background: #f8fafc;
}

.buttons {
  display: flex;
  gap: 9px;
  margin-top: 23px;
}

.buttons button,
.empty button {
  border: 1px solid #e4e7ec;
  background: #fff;
  border-radius: 10px;
  padding: 11px 14px;
  font-weight: 750;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
}

.buttons button:not(:first-child) {
  background: #172033;
  color: #fff;
  border-color: #172033;
}

.buttons button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.bank-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 20px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  color: #475467;
}

.bank-notice svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.bank-notice strong {
  display: block;
  font-size: 12px;
  color: #344054;
}

.bank-notice p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #667085;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {

  .account-page {
    padding: 20px;
  }

  .head {
    flex-direction: column;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .buttons {
    flex-direction: column;
  }

  .buttons button {
    justify-content: center;
  }

  .hero strong {
    font-size: 30px;
  }
}

`;