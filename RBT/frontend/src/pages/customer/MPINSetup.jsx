import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

import "../../styles/mpin.css";

function maskAccount(number) {
  if (!number) return "Unknown account";

  return `•••• •••• ${String(number).slice(-4)}`;
}

function MPINSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const bankId =
    user?.bankId ||
    user?.bank_id ||
    "alpha";

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] =
    useState("");

  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] =
    useState("");

  const [showMpin, setShowMpin] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [loadingAccounts, setLoadingAccounts] =
    useState(true);

  const [checkingStatus, setCheckingStatus] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  // ==================================================
  // LOAD CUSTOMER ACCOUNTS
  // ==================================================

  useEffect(() => {
    let mounted = true;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const response = await api.get(
          `/banks/${bankId}/accounts`
        );

        if (!mounted) return;

        const data =
          response.data?.data?.accounts || [];

        const activeAccounts = data.filter(
          (account) =>
            String(account.status).toUpperCase() ===
            "ACTIVE"
        );

        setAccounts(activeAccounts);

        if (activeAccounts.length === 1) {
          setSelectedAccount(
            activeAccounts[0].account_id
          );
        }
      } catch (err) {
        if (!mounted) return;

        if (!err.response) {
          toast.error(
            "Server unavailable",
            "Unable to connect to the banking server."
          );
        } else if (
          err.response.status === 404
        ) {
          toast.error(
            "Route not found",
            "The accounts service could not be found."
          );
        } else if (
          err.response.status === 401
        ) {
          toast.error(
            "Session expired",
            "Please sign in again."
          );
        } else {
          toast.error(
            "Unable to load accounts",
            err.response?.data?.error?.message ||
              "Something went wrong."
          );
        }
      } finally {
        if (mounted) {
          setLoadingAccounts(false);
        }
      }
    }

    loadAccounts();

    return () => {
      mounted = false;
    };
  }, [bankId, toast]);

  // ==================================================
  // VALIDATION
  // ==================================================

  function validate() {
    setError("");

    if (!selectedAccount) {
      setError(
        "Please select an account."
      );
      return false;
    }

    if (!/^\d{6}$/.test(mpin)) {
      setError(
        "MPIN must contain exactly 6 digits."
      );
      return false;
    }

    if (
      !/^\d{6}$/.test(confirmMpin)
    ) {
      setError(
        "Please enter the confirmation MPIN."
      );
      return false;
    }

    if (mpin !== confirmMpin) {
      setError(
        "MPIN and confirmation MPIN do not match."
      );
      return false;
    }

    return true;
  }

  // ==================================================
  // SET MPIN
  // ==================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post(
        `/banks/${bankId}/accounts/${selectedAccount}/mpin`,
        {
          mpin,
          confirmMpin,
        }
      );

      if (response.data?.success) {
        toast.success(
          "MPIN created",
          "Your transaction MPIN has been securely configured."
        );

        setMpin("");
        setConfirmMpin("");

        setTimeout(() => {
          navigate("/dashboard");
        }, 700);
      }
    } catch (err) {
      const code =
        err.response?.data?.error?.code;

      const message =
        err.response?.data?.error?.message ||
        "Unable to set your MPIN.";

      if (
        code === "MPIN_ALREADY_CONFIGURED"
      ) {
        toast.error(
          "MPIN already configured",
          "This account already has an MPIN."
        );
      } else if (
        code === "WEAK_MPIN"
      ) {
        toast.error(
          "Weak MPIN",
          message
        );
      } else if (
        code === "MPIN_MISMATCH"
      ) {
        toast.error(
          "MPIN mismatch",
          "Both MPIN fields must match."
        );
      } else if (
        code === "ACCOUNT_NOT_ACTIVE"
      ) {
        toast.error(
          "Account unavailable",
          "Only active accounts can have an MPIN."
        );
      } else if (
        code === "ACCOUNT_ACCESS_DENIED"
      ) {
        toast.error(
          "Access denied",
          "You cannot configure MPIN for this account."
        );
      } else if (!err.response) {
        toast.error(
          "Server unavailable",
          "Unable to connect to the banking server."
        );
      } else {
        toast.error(
          "MPIN setup failed",
          message
        );
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loadingAccounts) {
    return (
      <main className="mpin-page">
        <div className="mpin-loading">
          <LoaderCircle
            size={30}
            className="mpin-spinner"
          />

          <p>
            Loading your accounts...
          </p>
        </div>
      </main>
    );
  }

  // ==================================================
  // NO ACTIVE ACCOUNTS
  // ==================================================

  if (accounts.length === 0) {
    return (
      <main className="mpin-page">
        <section className="mpin-card">

          <button
            className="mpin-back"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>

          <div className="mpin-empty-icon">
            <ShieldCheck size={30} />
          </div>

          <h1>
            MPIN setup unavailable
          </h1>

          <p className="mpin-description">
            You need an active account before
            you can configure a transaction MPIN.
          </p>

          <button
            className="mpin-secondary-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            Back to dashboard
          </button>

        </section>
      </main>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <main className="mpin-page">

      <section className="mpin-card">

        {/* HEADER */}

        <button
          type="button"
          className="mpin-back"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>

        <div className="mpin-header">

          <div className="mpin-icon">
            <KeyRound size={27} />
          </div>

          <div>
            <span className="mpin-eyebrow">
              ACCOUNT SECURITY
            </span>

            <h1>
              Set up your MPIN
            </h1>

            <p>
              Create a 6-digit MPIN to authorize
              secure banking transactions.
            </p>
          </div>

        </div>

        {/* SECURITY NOTICE */}

        <div className="mpin-security">
          <ShieldCheck size={20} />

          <div>
            <strong>
              Your MPIN is protected
            </strong>

            <span>
              Your MPIN is never stored as
              plain text.
            </span>
          </div>
        </div>

        {/* FORM */}

        <form
          className="mpin-form"
          onSubmit={handleSubmit}
        >

          {/* ACCOUNT */}

          <div className="mpin-field">

            <label htmlFor="mpin-account">
              Account
            </label>

            <select
              id="mpin-account"
              value={selectedAccount}
              onChange={(event) =>
                setSelectedAccount(
                  event.target.value
                )
              }
              disabled={submitting}
            >
              <option value="">
                Select an account
              </option>

              {accounts.map((account) => (
                <option
                  key={account.account_id}
                  value={account.account_id}
                >
                  {account.account_type ||
                    "Account"}{" "}
                  —{" "}
                  {maskAccount(
                    account.account_number
                  )}
                </option>
              ))}
            </select>

          </div>

          {/* MPIN */}

          <div className="mpin-field">

            <label htmlFor="mpin">
              New MPIN
            </label>

            <div className="mpin-input">

              <input
                id="mpin"
                type={
                  showMpin
                    ? "text"
                    : "password"
                }
                inputMode="numeric"
                maxLength={6}
                value={mpin}
                onChange={(event) =>
                  setMpin(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder="Enter 6 digits"
                autoComplete="new-password"
                disabled={submitting}
              />

              <button
                type="button"
                onClick={() =>
                  setShowMpin(
                    (value) => !value
                  )
                }
                disabled={submitting}
                aria-label={
                  showMpin
                    ? "Hide MPIN"
                    : "Show MPIN"
                }
              >
                {showMpin ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

            <small>
              Use 6 digits. Avoid simple
              combinations such as 123456.
            </small>

          </div>

          {/* CONFIRM MPIN */}

          <div className="mpin-field">

            <label htmlFor="confirm-mpin">
              Confirm MPIN
            </label>

            <div className="mpin-input">

              <input
                id="confirm-mpin"
                type={
                  showConfirm
                    ? "text"
                    : "password"
                }
                inputMode="numeric"
                maxLength={6}
                value={confirmMpin}
                onChange={(event) =>
                  setConfirmMpin(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder="Re-enter MPIN"
                autoComplete="new-password"
                disabled={submitting}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirm(
                    (value) => !value
                  )
                }
                disabled={submitting}
                aria-label={
                  showConfirm
                    ? "Hide confirmation MPIN"
                    : "Show confirmation MPIN"
                }
              >
                {showConfirm ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mpin-error">
              {error}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            className="mpin-submit"
            disabled={
              submitting ||
              !selectedAccount ||
              mpin.length !== 6 ||
              confirmMpin.length !== 6
            }
          >
            {submitting ? (
              <>
                <LoaderCircle
                  size={18}
                  className="mpin-spinner"
                />

                Setting up MPIN...
              </>
            ) : (
              <>
                <Check size={18} />

                Set up MPIN
              </>
            )}
          </button>

        </form>

        <p className="mpin-footer">
          Never share your MPIN with anyone,
          including bank staff.
        </p>

      </section>

    </main>
  );
}

export default MPINSetup;