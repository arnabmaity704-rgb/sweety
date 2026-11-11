const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'sweety_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Error thrown for failed API calls. `fields` holds per-field messages for forms. */
export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error?.message || 'Something went wrong.', data.error?.fields);
  }
  return data;
}

export const api = {
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),
  me: () => request('GET', '/auth/me'),

  listReadings: ({ page = 1, limit = 10 } = {}) => request('GET', `/readings?page=${page}&limit=${limit}`),
  createReading: (body) => request('POST', '/readings', body),
  updateReading: (id, body) => request('PUT', `/readings/${id}`, body),
  deleteReading: (id) => request('DELETE', `/readings/${id}`),

  getReports: (date) => request('GET', `/reports?date=${date}`),
};
