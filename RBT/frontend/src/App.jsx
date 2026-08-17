import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import CustomerLogin from "./pages/auth/Login";
import AdminLogin from "./pages/admin/auth/Login";

import CustomerDashboard from "./pages/customer/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import OpenAccount from "./pages/admin/OpenAccount";

import ProtectedRoute from "./components/ProtectedRoute";

import Accounts from "./pages/customer/Accounts";
import AccountDetails from "./pages/customer/AccountDetails";
import Transactions from "./pages/customer/Transactions";
import TransactionDetails from "./pages/customer/TransactionDetails";
import Transfer from "./pages/customer/Transfer";
import MPINSetup from "./pages/customer/MPINSetup";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =========================================
            DEFAULT
            ========================================= */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login/alpha"
              replace
            />
          }
        />

        {/* =========================================
            CUSTOMER LOGIN
            ========================================= */}

        <Route
          path="/login/:bankId"
          element={<CustomerLogin />}
        />

        {/* =========================================
            ADMIN LOGIN
            ========================================= */}

        <Route
          path="/admin/login/:bankId"
          element={<AdminLogin />}
        />

        {/* =========================================
            CUSTOMER DASHBOARD
            ========================================= */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              role="CUSTOMER"
            >
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            ADMIN DASHBOARD
            ========================================= */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              roles={[
                "ADMIN",
                "MANAGER",
              ]}
              loginPath="/admin/login/alpha"
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            ADMIN — OPEN ACCOUNT
            ========================================= */}

        <Route
          path="/admin/accounts/open"
          element={
            <ProtectedRoute
              roles={[
                "ADMIN",
                "MANAGER",
              ]}
              loginPath="/admin/login/alpha"
            >
              <OpenAccount />
            </ProtectedRoute>
          }
        />

        <Route
  path="/accounts"
  element={
    <ProtectedRoute role="CUSTOMER">
      <Accounts />
    </ProtectedRoute>
  }
/>

<Route
  path="/accounts/:accountId"
  element={
    <ProtectedRoute role="CUSTOMER">
      <AccountDetails />
    </ProtectedRoute>
  }
/>

<Route
  path="/transactions"
  element={
    <ProtectedRoute role="CUSTOMER">
      <Transactions />
    </ProtectedRoute>
  }
/>

<Route
  path="/transactions/:transactionId"
  element={
    <ProtectedRoute role="CUSTOMER">
      <TransactionDetails />
    </ProtectedRoute>
  }
/>

<Route
  path="/transfer"
  element={
    <ProtectedRoute role="CUSTOMER">
      <Transfer />
    </ProtectedRoute>
  }
/>

{/* =========================================
            CUSTOMER — MPIN SETUP
            ========================================= */}

        <Route
          path="/security/mpin"
          element={
            <ProtectedRoute
              role="CUSTOMER"
              loginPath="/login/alpha"
            >
              <MPINSetup />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            UNKNOWN ROUTES
            ========================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login/alpha"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;