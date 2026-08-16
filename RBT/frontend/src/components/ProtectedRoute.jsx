import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, role }) {
  const {
    isAuthenticated,
    user,
  } = useAuth();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login/alpha"
        replace
      />
    );
  }

  if (
    role &&
    user?.role !== role
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;