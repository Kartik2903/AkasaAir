import axios from 'axios';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  withCredentials: true, // HttpOnly session cookie
  timeout: 15000,
});

// Normalise failures to Error(message) with .status and .fieldErrors so UI code stays simple.
api.interceptors.response.use(
  (res) => res.data, // unwrap axios -> the API envelope {success,message,data,meta}
  (error) => {
    const body = error.response?.data;
    const err = new Error(body?.message ?? (error.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error. Is the API running?'));
    err.status = error.response?.status;
    err.fieldErrors = body?.errors ?? [];
    if (err.status === 401 && !error.config.url.includes('/auth/login')) window.dispatchEvent(new Event('auth:unauthorized'));
    return Promise.reject(err);
  },
);
