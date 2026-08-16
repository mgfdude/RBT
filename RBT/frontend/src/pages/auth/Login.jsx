import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  User,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bankName =
    bankId?.charAt(0).toUpperCase() +
    bankId?.slice(1);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.username.trim() || !form.password) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        username: form.username.trim(),
        password: form.password,
        bankId,
      });

      const data = response.data.data;

      login(data.accessToken, {
        ...(data.user || {}),
        bankId,
      });

      if (data.user?.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <div className="brand-mark">
            RBT
          </div>

          <div className="bank-label">
            {bankName} Bank
          </div>

          <h1>Welcome back</h1>

          <p>
            Sign in to your banking account
          </p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">
            Username
          </label>

          <div className="input-wrapper">
            <User size={18} />

            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>

          <label htmlFor="password">
            Password
          </label>

          <div className="input-wrapper">
            <LockKeyhole size={18} />

            <input
              id="password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              autoComplete="current-password"
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(
                  (value) => !value
                )
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          className="forgot-password"
          onClick={() =>
            navigate(
              `/forgot-password?bankId=${bankId}`
            )
          }
        >
          Forgot password?
        </button>
      </section>
    </main>
  );
}

export default Login;