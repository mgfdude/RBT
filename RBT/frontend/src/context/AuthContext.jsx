import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("rbt_access_token")
  );

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("rbt_user");

    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem(
        "rbt_access_token",
        token
      );
    } else {
      localStorage.removeItem(
        "rbt_access_token"
      );
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(
        "rbt_user",
        JSON.stringify(user)
      );
    } else {
      localStorage.removeItem("rbt_user");
    }
  }, [user]);

  function login(accessToken, userData = null) {
    setToken(accessToken);
    setUser(userData);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}