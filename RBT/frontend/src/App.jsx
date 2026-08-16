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