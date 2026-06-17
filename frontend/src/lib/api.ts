import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("support_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("support_token");
      localStorage.removeItem("support_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),

  register: (data: { email: string; full_name: string; password: string; role?: string }) =>
    api.post("/auth/register", data).then((r) => r.data),

  me: () => api.get("/auth/me").then((r) => r.data),
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chatApi = {
  send: (message: string, conversation_id?: string, history?: any[]) =>
    api.post("/chat", { message, conversation_id, history }).then((r) => r.data),

  getConversations: () =>
    api.get("/chat/conversations").then((r) => r.data),

  getConversation: (id: string) =>
    api.get(`/chat/conversations/${id}`).then((r) => r.data),

  streamUrl: () => `${API_URL}/api/v1/chat/stream`,
};

// ── Tickets ───────────────────────────────────────────────────────────────────

export const ticketsApi = {
  list: (params?: { status?: string; priority?: string; category?: string }) =>
    api.get("/tickets", { params }).then((r) => r.data),

  get: (id: string) => api.get(`/tickets/${id}`).then((r) => r.data),

  update: (id: string, data: any) =>
    api.patch(`/tickets/${id}`, data).then((r) => r.data),

  stats: () => api.get("/tickets/stats/summary").then((r) => r.data),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  metrics: () => api.get("/dashboard/metrics").then((r) => r.data),
  intentDistribution: (days = 7) =>
    api.get(`/dashboard/intent-distribution?days=${days}`).then((r) => r.data),
  recentTickets: () => api.get("/dashboard/recent-tickets").then((r) => r.data),
  liveConversations: () => api.get("/dashboard/live-conversations").then((r) => r.data),
};

// ── Knowledge ─────────────────────────────────────────────────────────────────

export const knowledgeApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/knowledge/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  stats: () => api.get("/knowledge/stats").then((r) => r.data),
  clear: () => api.delete("/knowledge/clear").then((r) => r.data),
};
