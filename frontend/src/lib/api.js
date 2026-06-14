// HawarMusic API istemcisi
const BASE = import.meta.env.VITE_API_URL || "";

export function getToken() { return localStorage.getItem("hm_token"); }
export function setToken(t) { localStorage.setItem("hm_token", t); }
export function clearToken() { localStorage.removeItem("hm_token"); }

async function req(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = "Bir hata oluştu";
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res;
}

export const api = {
  // auth
  createFamily: (d) => req("/api/auth/create-family", { method: "POST", body: d }),
  register: (d) => req("/api/auth/register", { method: "POST", body: d }),
  login: (d) => req("/api/auth/login", { method: "POST", body: d }),
  me: () => req("/api/auth/me"),
  // invites
  invites: () => req("/api/invites"),
  createInvite: (d) => req("/api/invites", { method: "POST", body: d }),
  // songs
  songs: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return req(`/api/songs${q ? "?" + q : ""}`);
  },
  upload: (fd) => req("/api/songs/upload", { method: "POST", body: fd, isForm: true }),
  importLink: (d) => req("/api/songs/import", { method: "POST", body: d }),
  metubeImport: (d) => req("/api/metube/import", { method: "POST", body: d }),
  editSong: (id, d) => req(`/api/songs/${id}`, { method: "PATCH", body: d }),
  deleteSong: (id) => req(`/api/songs/${id}`, { method: "DELETE" }),
  favorite: (id) => req(`/api/songs/${id}/favorite`, { method: "POST" }),
  reactions: (id) => req(`/api/songs/${id}/reactions`),
  react: (id, emoji) => req(`/api/songs/${id}/reactions`, { method: "POST", body: { emoji } }),
  streamUrl: (id) => `${BASE}/api/songs/${id}/stream`,
  // playlists
  playlists: () => req("/api/playlists"),
  createPlaylist: (d) => req("/api/playlists", { method: "POST", body: d }),
  playlist: (id) => req(`/api/playlists/${id}`),
  playlistAdd: (id, song_id) => req(`/api/playlists/${id}/songs`, { method: "POST", body: { song_id } }),
  playlistRemove: (id, sid) => req(`/api/playlists/${id}/songs/${sid}`, { method: "DELETE" }),
  playlistReorder: (id, song_ids) => req(`/api/playlists/${id}/reorder`, { method: "POST", body: { song_ids } }),
  deletePlaylist: (id) => req(`/api/playlists/${id}`, { method: "DELETE" }),
  // personal
  favorites: () => req("/api/favorites"),
  recent: () => req("/api/history/recent"),
  offlineList: () => req("/api/offline"),
  offlineMark: (id) => req(`/api/offline/${id}`, { method: "POST" }),
  offlineRemove: (id) => req(`/api/offline/${id}`, { method: "DELETE" }),
  // social
  requests: () => req("/api/requests"),
  createRequest: (d) => req("/api/requests", { method: "POST", body: d }),
  fulfillRequest: (id) => req(`/api/requests/${id}/fulfill`, { method: "POST" }),
  comments: (id) => req(`/api/songs/${id}/comments`),
  addComment: (id, text) => req(`/api/songs/${id}/comments`, { method: "POST", body: { text } }),
  // family / admin
  members: () => req("/api/family/members"),
  updateMember: (id, d) => req(`/api/family/members/${id}`, { method: "PATCH", body: d }),
  removeMember: (id) => req(`/api/family/members/${id}`, { method: "DELETE" }),
  notifications: () => req("/api/notifications"),
  dashboard: () => req("/api/admin/dashboard"),
  logs: () => req("/api/admin/logs"),
  settings: () => req("/api/settings"),
  updateSettings: (d) => req("/api/settings", { method: "PATCH", body: d }),
};
