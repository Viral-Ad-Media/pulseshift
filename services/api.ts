const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const request = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  const text = await res.text();
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = text ? (isJson ? JSON.parse(text) : { message: text }) : null;
  if (!res.ok) {
    const error = data?.error || data?.message || res.statusText;
    throw new Error(error);
  }
  return data;
};

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: (path: string) => request(path, { method: 'DELETE' }),
};
