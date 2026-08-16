import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  WalletCards,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

import "../../styles/open-account.css";

function generateTemporaryPassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*";

  let password = "";

  // Guarantee at least one of each important character type.
  password += "ABCDEFGHJKLMNPQRSTUVWXYZ"[
    Math.floor(Math.random() * 24)
  ];

  password += "abcdefghijkmnopqrstuvwxyz"[
    Math.floor(Math.random() * 23)
  ];

  password += "23456789"[
    Math.floor(Math.random() * 8)
  ];

  password += symbols[
    Math.floor(Math.random() * symbols.length)
  ];

  for (let i = password.length; i < 12; i++) {
    password += chars[
      Math.floor(Math.random() * chars.length)
    ];
  }

  // Fisher-Yates shuffle
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function getPasswordStrength(password) {
  if (!password) {
    return {
      label: "No password",
      level: 0,
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      label: "Weak",
      level: 1,
    };
  }

  if (score <= 4) {
    return {
      label: "Good",
      level: 2,
    };
  }

  return {
    label: "Strong",
    level: 3,
  };
}

function OpenAccount() {
  const { user } = useAuth();

  const bankId =
    user?.bankId ||
    user?.bank_id ||
    "alpha";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    username: "",
    accountType: "SAVINGS",
    currency: "INR",
    temporaryPassword: generateTemporaryPassword(),
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(null);

  const passwordStrength = useMemo(
    () =>
      getPasswordStrength(
        form.temporaryPassword
      ),
    [form.temporaryPassword]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  }

  function generateNewPassword() {
    setForm((previous) => ({
      ...previous,
      temporaryPassword:
        generateTemporaryPassword(),
    }));

    setCopied(false);
    setShowPassword(false);
  }

  async function copyPassword() {
    if (!form.temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(
        form.temporaryPassword
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "Unable to copy the password. Please copy it manually."
      );
    }
  }

  function validateForm() {
    if (!form.fullName.trim()) {
      return "Full name is required.";
    }

    if (form.fullName.trim().length < 2) {
      return "Full name must contain at least 2 characters.";
    }

    if (!form.phone.trim()) {
      return "Phone number is required.";
    }

    if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) {
      return "Enter a valid phone number.";
    }

    if (!form.username.trim()) {
      return "Username is required.";
    }

    if (
      !/^[a-zA-Z0-9_.-]{3,30}$/.test(
        form.username.trim()
      )
    ) {
      return "Username may contain letters, numbers, _, ., and - only.";
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      return "Enter a valid email address.";
    }

    if (!form.temporaryPassword) {
      return "Temporary password is required.";
    }

    if (form.temporaryPassword.length < 8) {
      return "Temporary password must contain at least 8 characters.";
    }

    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        `/banks/${bankId}/admin/customers`,
        {
          fullName: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim(),
          username: form.username.trim(),
          accountType: form.accountType,
          currency: form.currency,
          temporaryPassword:
            form.temporaryPassword,
        }
      );

      const result =
        response.data?.data ||
        response.data;

      setSuccess(result);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Unable to open the customer account.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSuccess(null);
    setError("");

    setForm({
      fullName: "",
      email: "",
      phone: "",
      username: "",
      accountType: "SAVINGS",
      currency: "INR",
      temporaryPassword:
        generateTemporaryPassword(),
    });

    setShowPassword(false);
    setCopied(false);
  }

  if (success) {
    const account =
      success.account ||
      success.data?.account ||
      success;

    return (
      <div className="oa-page">
        <div className="oa-success-wrapper">
          <div className="oa-success-card">
            <div className="oa-success-icon">
              <CheckCircle2 size={34} />
            </div>

            <div className="oa-success-heading">
              <h1>Account opened successfully</h1>

              <p>
                The customer account has been created
                successfully.
              </p>
            </div>

            <div className="oa-success-details">
              <div className="oa-success-row">
                <span>Customer</span>

                <strong>
                  {account.fullName ||
                    form.fullName}
                </strong>
              </div>

              <div className="oa-success-row">
                <span>Username</span>

                <strong>
                  {account.username ||
                    form.username}
                </strong>
              </div>

              <div className="oa-success-row">
                <span>Account number</span>

                <strong className="oa-account-number">
                  {account.accountNumber ||
                    account.account_number ||
                    "Generated"}
                </strong>
              </div>

              <div className="oa-success-row">
                <span>Account type</span>

                <strong>
                  {account.accountType ||
                    account.account_type ||
                    form.accountType}
                </strong>
              </div>

              <div className="oa-success-row">
                <span>Status</span>

                <strong className="oa-status-active">
                  ACTIVE
                </strong>
              </div>
            </div>

            <div className="oa-temporary-password-result">
              <div>
                <span>Temporary password</span>

                <strong>
                  {form.temporaryPassword}
                </strong>
              </div>

              <button
                type="button"
                onClick={copyPassword}
                className="oa-copy-result"
              >
                {copied ? (
                  <>
                    <ClipboardCheck size={17} />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard size={17} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="oa-warning">
              <ShieldCheck size={18} />

              <span>
                Give the temporary password to the
                customer securely. The customer should
                change it after their first login.
              </span>
            </div>

            <button
              type="button"
              className="oa-primary-button"
              onClick={resetForm}
            >
              <UserPlus size={18} />
              Open Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oa-page">
      <div className="oa-container">

        {/* Header */}
        <header className="oa-header">
          <div className="oa-title-area">
            <div className="oa-title-icon">
              <UserPlus size={22} />
            </div>

            <div>
              <h1>Open Customer Account</h1>

              <p>
                Create a new customer and open their
                bank account.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="oa-back-button"
            onClick={() =>
              window.history.back()
            }
          >
            <ArrowLeft size={17} />
            Back
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="oa-error">
            <XCircle size={19} />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <form
          className="oa-form"
          onSubmit={handleSubmit}
        >
          {/* Customer Information */}
          <section className="oa-card">
            <div className="oa-card-header">
              <div className="oa-section-icon">
                <UserPlus size={19} />
              </div>

              <div>
                <h2>Customer Information</h2>

                <p>
                  Basic information for the new
                  customer.
                </p>
              </div>
            </div>

            <div className="oa-fields">

              {/* Full name */}
              <div className="oa-field oa-full">
                <label htmlFor="fullName">
                  Full name
                  <span>*</span>
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter customer's full name"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div className="oa-field">
                <label htmlFor="email">
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="customer@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div className="oa-field">
                <label htmlFor="phone">
                  Phone number
                  <span>*</span>
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>

              {/* Username */}
              <div className="oa-field oa-full">
                <label htmlFor="username">
                  Customer username
                  <span>*</span>
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="e.g. rahul.kumar"
                  autoComplete="username"
                  disabled={loading}
                />

                <small>
                  Used by the customer to sign in.
                </small>
              </div>

            </div>
          </section>

          {/* Account Information */}
          <section className="oa-card">
            <div className="oa-card-header">
              <div className="oa-section-icon">
                <WalletCards size={19} />
              </div>

              <div>
                <h2>Account Information</h2>

                <p>
                  Configure the customer's bank
                  account.
                </p>
              </div>
            </div>

            <div className="oa-fields">

              {/* Account type */}
              <div className="oa-field">
                <label htmlFor="accountType">
                  Account type
                </label>

                <select
                  id="accountType"
                  name="accountType"
                  value={form.accountType}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="SAVINGS">
                    Savings
                  </option>

                  <option value="CURRENT">
                    Current
                  </option>
                </select>
              </div>

              {/* Currency */}
              <div className="oa-field">
                <label htmlFor="currency">
                  Currency
                </label>

                <select
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="INR">
                    INR — Indian Rupee
                  </option>
                </select>
              </div>

            </div>

            <div className="oa-info-box">
              <ShieldCheck size={18} />

              <div>
                <strong>
                  Account balance starts at ₹0.00
                </strong>

                <p>
                  Test money should be added later
                  through the controlled deposit
                  operation.
                </p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="oa-card">
            <div className="oa-card-header">
              <div className="oa-section-icon">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h2>Customer Security</h2>

                <p>
                  Generate the customer's temporary
                  login password.
                </p>
              </div>
            </div>

            <div className="oa-password-section">

              <label htmlFor="temporaryPassword">
                Temporary password
              </label>

              <div className="oa-password-wrapper">
                <input
                  id="temporaryPassword"
                  name="temporaryPassword"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    form.temporaryPassword
                  }
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                />

                <div className="oa-password-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    title={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={copyPassword}
                    title="Copy password"
                    aria-label="Copy password"
                    disabled={loading}
                  >
                    {copied ? (
                      <ClipboardCheck
                        size={18}
                      />
                    ) : (
                      <Clipboard size={18} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={generateNewPassword}
                    title="Generate new password"
                    aria-label="Generate new password"
                    disabled={loading}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>

              {/* Strength */}
              <div className="oa-password-strength">
                <div className="oa-strength-bars">
                  {[1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={
                        passwordStrength.level >=
                        level
                          ? `active level-${passwordStrength.level}`
                          : ""
                      }
                    />
                  ))}
                </div>

                <span
                  className={`oa-strength-label level-${passwordStrength.level}`}
                >
                  {passwordStrength.label}
                </span>
              </div>

              <small className="oa-password-help">
                The customer should change this
                temporary password after signing in.
              </small>
            </div>
          </section>

          {/* Submit */}
          <div className="oa-form-footer">
            <button
              type="button"
              className="oa-cancel-button"
              onClick={() =>
                window.history.back()
              }
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="oa-primary-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="oa-spinner"
                  />

                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus size={18} />

                  Create Customer Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OpenAccount;