import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/customer/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default */}
        <Route
          path="/"
          element={
            <Navigate
              to="/login/alpha"
              replace
            />
          }
        />

        {/* Bank-specific login */}
        <Route
          path="/login/:bankId"
          element={<Login />}
        />

        {/* Customer dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="CUSTOMER">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Temporary admin route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <div>Admin Dashboard</div>
            </ProtectedRoute>
          }
        />

        {/* Unknown routes */}
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