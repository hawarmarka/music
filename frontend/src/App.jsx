import { useState, useEffect } from "react";
import { api, getToken, clearToken } from "./lib/api";
import { PlayerProvider } from "./lib/player";
import {
  FiHome,
  FiMusic,
  FiList,
  FiHeart,
  FiDownload,
  FiEdit3,
  FiUsers,
  FiSettings,
  FiGrid,
} from "react-icons/fi";

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
  { key: "home", label: "Ana Sayfa", Icon: FiHome },
  { key: "library", label: "Kütüphane", Icon: FiMusic },
  { key: "playlists", label: "Playlistler", Icon: FiList },
  { key: "favorites", label: "Favoriler", Icon: FiHeart },
  { key: "offline", label: "Offline", Icon: FiDownload },
  { key: "requests", label: "İstekler", Icon: FiEdit3 },
  { key: "family", label: "Aile", Icon: FiUsers },
  { key: "settings", label: "Ayarlar", Icon: FiSettings },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(location.hash.slice(1) || "home");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1) || "home");
    window.addEventListener("hashchange", onHash);

    const on = () => setOnline(true);
    const off = () => setOnline(false);

    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  function go(key) {
    location.hash = key;
    setRoute(key);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  if (loading) {
    return (
      <div className="splash">
        <span className="brand-word">HawarMusic</span>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={setUser} />;
  }

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

  if (user.role === "admin") {
    nav.splice(7, 0, { key: "admin", label: "Admin", Icon: FiGrid });
  }

  const bottomNav = nav.slice(0, 5);

  return (
    <PlayerProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">
            <span className="brand-word">HawarMusic</span>
          </div>

          <nav className="sb-nav">
            {nav.map((n) => {
              const Icon = n.Icon;

              return (
                <button
                  key={n.key}
                  className={effectiveRoute === n.key ? "on" : ""}
                  onClick={() => go(n.key)}
                >
                  <span className="sb-ic">
                    <Icon />
                  </span>
                  {n.label}
                </button>
              );
            })}
          </nav>

          <div className="sb-foot">
            <div className="sb-user">
              <div
                className="sb-av"
                style={{ background: user.avatar_color || "var(--neon-blue)" }}
              >
                {(user.display_name || "?")[0].toUpperCase()}
              </div>

              <div className="sb-uinfo">
                <strong>{user.display_name}</strong>
                <span>{user.role === "admin" ? "Yönetici" : "Üye"}</span>
              </div>
            </div>

            <button className="sb-logout" onClick={logout}>
              Çıkış
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="tb-search">
              <span>⌕</span>
              <input
                placeholder="Şarkı, sanatçı, albüm ara..."
                onChange={(e) => {
                  window.dispatchEvent(
                    new CustomEvent("hm-search", { detail: e.target.value })
                  );
                }}
              />
            </div>

            <div className="tb-actions">
              {!online && <span className="tb-offline">Çevrimdışı</span>}

              <Notifications />

              <button className="btn btn-ghost" onClick={() => go("upload")}>
                ⤴ Yükle
              </button>

              <button className="btn btn-grad" onClick={() => go("import")}>
                + Linkten ekle
              </button>
            </div>
          </header>

          <div className="page">{pages[effectiveRoute] || pages.home}</div>
        </main>

        <nav className="hm-bottom-nav-wrap">
          <div className="hm-bottom-nav">
            {bottomNav.map((n) => {
              const Icon = n.Icon;

              return (
                <button
                  key={n.key}
                  className={`hm-nav-item ${effectiveRoute === n.key ? "active" : ""}`}
                  onClick={() => go(n.key)}
                >
                  <span className="hm-nav-icon">
                    <Icon />
                  </span>
                  <span className="hm-nav-text">{n.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <PlayerBar />
      </div>
    </PlayerProvider>
  );
}
