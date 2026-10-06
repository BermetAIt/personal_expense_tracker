const API_ROOT = "/api";
const TOKEN_KEY = "money-tracker-token";

let accessToken = sessionStorage.getItem(TOKEN_KEY);

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const body = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const detail = typeof body === "object" ? body?.detail : body;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(" ")
      : detail || "Не удалось выполнить запрос.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

function saveToken(token) {
  accessToken = token;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export const api = {
  hasToken: () => Boolean(accessToken),
  clearToken() {
    accessToken = null;
    sessionStorage.removeItem(TOKEN_KEY);
  },
  async login(credentials) {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    saveToken(result.access_token);
    return result.user;
  },
  async register(details) {
    const result = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(details),
    });
    saveToken(result.access_token);
    return result.user;
  },
  me: () => request("/auth/me"),
  updateProfile: (display_name) => request("/auth/me", {
    method: "PUT",
    body: JSON.stringify({ display_name }),
  }),
  transactions: ({ month, type, q } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    return request(`/transactions?${params}`);
  },
  createTransaction: (data) => request("/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),
  summary: (month) => request(`/stats/summary?month=${encodeURIComponent(month)}`),
  byCategory: (month, type) => request(
    `/stats/by-category?month=${encodeURIComponent(month)}&type=${encodeURIComponent(type)}`,
  ),
  byDay: (month, type = "expense") => request(
    `/stats/by-day?month=${encodeURIComponent(month)}&type=${encodeURIComponent(type)}`,
  ),
  budget: () => request("/budget"),
  saveBudget: (monthly_limit) => request("/budget", {
    method: "PUT",
    body: JSON.stringify({ monthly_limit }),
  }),
  addDemoData: () => request("/demo-data", { method: "POST" }),
  deleteAllData: () => request("/data", { method: "DELETE" }),
  async downloadCsv() {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const response = await fetch(`${API_ROOT}/export/csv`, { headers });
    if (!response.ok) throw new Error("Не удалось экспортировать данные.");
    return response.blob();
  },
};