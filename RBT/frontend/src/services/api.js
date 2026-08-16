import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8080/api",

  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rbt_access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.error?.code;

      if (
        code === "INVALID_TOKEN" ||
        code === "TOKEN_REVOKED"
      ) {
        localStorage.removeItem("rbt_access_token");
        localStorage.removeItem("rbt_user");
      }
    }

    return Promise.reject(error);
  }
);

export default api;