import { useState, useEffect } from "react";
import { api, getToken, clearToken } from "./lib/api";
import { PlayerProvider } from "./lib/player";
import Auth from "./pages/Auth";
import PlayerBar from "./components/PlayerBar";
import Notifications from "./components/Notifications";
import Home from "./pages/Home";
import Library from "./pages/Library";
import Upload from "./pages/Upload";
import Import from "./pages/Import";
import Offline from "./pages/Offline";
import Playlists from "./pages/Playlists";
import Favorites from "./pages/Favorites";
import Requests from "./pages/Requests";
import Family from "./pages/Family";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";

const NAV = [
  { key: "home", label: "Ana Sayfa", icon: "⌂" },
  { key: "library", label: "Kütüphane", icon: "≣" },
  { key: "playlists", label: "Playlistler", icon: "≡" },
  { key: "favorites", label: "Favoriler", icon: "♥" },
  { key: "offline", label: "Offline", icon: "⤓" },
  { key: "requests", label: "İstekler", icon: "✎" },
  { key: "family", label: "Aile", icon: "⚇" },
  { key: "settings", label: "Ayarlar", icon: "⚙" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(location.hash.slice(1) || "home");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1) || "home");
    window.addEventListener("hashchange", onHash);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("hashchange", onHash);
      window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me().then(setUser).catch(() => clearToken()).finally(() => setLoading(false));
  }, []);

  function go(key) { location.hash = key; setRoute(key); }
  function logout() { clearToken(); setUser(null); }

  if (loading) return <div className="splash"><span className="brand-word">HawarMusic</span></div>;
  if (!user) return <Auth onAuth={setUser} />;

  // İnternet yokken sadece offline sayfası
  const effectiveRoute = !online && route !== "offline" ? "offline" : route;

  const pages = {
    home: <Home go={go} />,
    library: <Library />,
    upload: <Upload onDone={() => go("library")} />,
    import: <Import onDone={() => go("library")} />,
    offline: <Offline online={online} />,
    playlists: <Playlists />,
    favorites: <Favorites />,
    requests: <Requests />,
    family: <Family user={user} />,
    admin: <Admin />,
    settings: <Settings user={user} />,
  };

  const nav = [...NAV];
  if (user.role === "admin") nav.splice(7, 0, { key: "admin", label: "Admin", icon: "▦" });

  return (
    <PlayerProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo"><span className="brand-word">HawarMusic</span></div>
          <nav className="sb-nav">
            {nav.map((n) => (
              <button key={n.key} className={effectiveRoute === n.key ? "on" : ""} onClick={() => go(n.key)}>
                <span className="sb-ic">{n.icon}</span> {n.label}
              </button>
            ))}
          </nav>
          <div className="sb-foot">
            <div className="sb-user">
              <div className="sb-av" style={{ background: user.avatar_color || "var(--neon-blue)" }}>
                {(user.display_name || "?")[0].toUpperCase()}
              </div>
              <div className="sb-uinfo"><strong>{user.display_name}</strong><span>{user.role === "admin" ? "Yönetici" : "Üye"}</span></div>
            </div>
            <button className="sb-logout" onClick={logout}>Çıkış</button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="tb-search">
              <span>⌕</span>
              <input placeholder="Şarkı, sanatçı, albüm ara..." onChange={(e) => {
                window.dispatchEvent(new CustomEvent("hm-search", { detail: e.target.value }));
              }} />
            </div>
            <div className="tb-actions">
              {!online && <span className="tb-offline">Çevrimdışı</span>}
              <Notifications />
              <button className="btn btn-ghost" onClick={() => go("upload")}>⤴ Yükle</button>
              <button className="btn btn-grad" onClick={() => go("import")}>+ Linkten ekle</button>
            </div>
          </header>

          <div className="page">{pages[effectiveRoute] || pages.home}</div>
        </main>

        {/* Mobil alt navigasyon */}
        <nav className="mobile-nav">
          {nav.slice(0, 5).map((n) => (
            <button key={n.key} className={effectiveRoute === n.key ? "on" : ""} onClick={() => go(n.key)}>
              <span>{n.icon}</span><i>{n.label}</i>
            </button>
          ))}
        </nav>

        <PlayerBar />
      </div>
    </PlayerProvider>
  );
}
