import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

let isRedirectingToLogin = false;

function shouldRedirectToLogin(error: unknown): boolean {
  const status: number | undefined = (error as any)?.response?.status;
  const message = (error as any)?.response?.data?.info
    ?? (error as any)?.response?.data?.error
    ?? (error as any)?.response?.data?.message;

  return status === 401 && message === 'Autenticação Necessária';
}

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
    if (shouldRedirectToLogin(error) && !isRedirectingToLogin) {
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