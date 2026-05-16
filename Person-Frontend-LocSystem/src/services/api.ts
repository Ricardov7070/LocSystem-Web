import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

let isRedirectingToLogin = false;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('locsystem_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error?.response?.status;

    if (status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;

      localStorage.removeItem('locsystem_user');
      localStorage.removeItem('locsystem_token');

      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default api;