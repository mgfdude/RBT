import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({
  children,
  role,
  roles = [],
  loginPath = "/login/alpha",
}) {
  const {
    isAuthenticated,
    user,
  } = useAuth();

  // -----------------------------------------
  // Authentication
  // -----------------------------------------

  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPath}
        replace
      />
    );
  }

  // -----------------------------------------
  // Build allowed roles
  // -----------------------------------------

  const allowedRoles = [
    ...(role ? [role] : []),
    ...roles,
  ];

  // -----------------------------------------
  // Authorization
  // -----------------------------------------

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    // Send customers to customer dashboard
    if (user?.role === "CUSTOMER") {
      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );
    }

    // Send admins/managers to admin dashboard
    if (
      user?.role === "ADMIN" ||
      user?.role === "MANAGER"
    ) {
      return (
        <Navigate
          to="/admin"
          replace
        />
      );
    }

    return (
      <Navigate
        to={loginPath}
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;