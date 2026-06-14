import { Component, useEffect, useMemo, useState } from "react";
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

const BASE_NAV = [
  { key: "home", label: "Ana Sayfa", Icon: FiHome },
  { key: "library", label: "Kütüphane", Icon: FiMusic },
  { key: "playlists", label: "Playlistler", Icon: FiList },
  { key: "favorites", label: "Favoriler", Icon: FiHeart },
  { key: "offline", label: "Offline", Icon: FiDownload },
  { key: "requests", label: "İstekler", Icon: FiEdit3 },
  { key: "family", label: "Aile", Icon: FiUsers },
  { key: "settings", label: "Ayarlar", Icon: FiSettings },
];

const VALID_ROUTES = [
  "home",
  "library",
  "upload",
  "import",
  "offline",
  "playlists",
  "favorites",
  "requests",
  "family",
  "admin",
  "settings",
];

function readRouteFromHash() {
  const raw = window.location.hash || "";
  const cleaned = raw
    .replace(/^#\/?/, "")
    .split("?")[0]
    .trim();

  if (!cleaned) return "home";
  if (!VALID_ROUTES.includes(cleaned)) return "home";

  return cleaned;
}

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Sayfa yüklenirken bir hata oluştu.",
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.routeKey !== this.props.routeKey && this.state.hasError) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty glass">
          <div className="empty-ic">!</div>
          <h3>Sayfa açılırken hata oluştu</h3>
          <p>{this.state.message}</p>
          <button
            type="button"
            className="btn btn-grad"
            onClick={() => {
              window.location.hash = "home";
              window.location.reload();
            }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(readRouteFromHash);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function syncRoute() {
      setRoute(readRouteFromHash());
    }

    window.addEventListener("hashchange", syncRoute);

    return () => {
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadUser() {
      try {
        if (!getToken()) {
          if (alive) setLoading(false);
          return;
        }

        const me = await api.me();

        if (alive) {
          setUser(me);
          setLoading(false);
        }
      } catch {
        clearToken();

        if (alive) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      alive = false;
    };
  }, []);

  function go(nextRoute) {
    if (!VALID_ROUTES.includes(nextRoute)) {
      nextRoute = "home";
    }

    setRoute(nextRoute);

    if (window.location.hash !== `#${nextRoute}`) {
      window.location.hash = nextRoute;
    }
  }

  function logout() {
    clearToken();
    setUser(null);
    setRoute("home");
    window.location.hash = "home";
  }

  const nav = useMemo(() => {
    const items = [...BASE_NAV];

    if (user?.role === "admin") {
      items.splice(7, 0, {
        key: "admin",
        label: "Admin",
        Icon: FiGrid,
      });
    }

    return items;
  }, [user]);

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
    admin: user.role === "admin" ? (
      <Admin />
    ) : (
      <div className="empty glass">
        <div className="empty-ic">!</div>
        <h3>Yetkin yok</h3>
        <p>Bu sayfaya sadece yönetici hesabı erişebilir.</p>
        <button type="button" className="btn btn-grad" onClick={() => go("home")}>
          Ana Sayfaya Dön
        </button>
      </div>
    ),
    settings: <Settings user={user} />,
  };

  return (
    <PlayerProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">
            <span className="brand-word">HawarMusic</span>
          </div>

          <nav className="sb-nav">
            {nav.map((item) => {
              const Icon = item.Icon;
              const active = effectiveRoute === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={active ? "on" : ""}
                  onClick={() => go(item.key)}
                >
                  <span className="sb-ic">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sb-foot">
            <div className="sb-user">
              <div
                className="sb-av"
                style={{
                  background: user.avatar_color || "var(--neon-blue)",
                }}
              >
                {(user.display_name || "?")[0].toUpperCase()}
              </div>

              <div className="sb-uinfo">
                <strong>{user.display_name}</strong>
                <span>{user.role === "admin" ? "Yönetici" : "Üye"}</span>
              </div>
            </div>

            <button type="button" className="sb-logout" onClick={logout}>
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
                    new CustomEvent("hm-search", {
                      detail: e.target.value,
                    })
                  );
                }}
              />
            </div>

            <div className="tb-actions">
              {!online && <span className="tb-offline">Çevrimdışı</span>}

              <Notifications />

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => go("upload")}
              >
                Yükle
              </button>

              <button
                type="button"
                className="btn btn-grad"
                onClick={() => go("import")}
              >
                Linkten ekle
              </button>
            </div>
          </header>

          <div className="page">
            <PageErrorBoundary routeKey={effectiveRoute}>
              {pages[effectiveRoute] || pages.home}
            </PageErrorBoundary>
          </div>
        </main>

        <nav className="mobile-nav">
          {nav.slice(0, 5).map((item) => {
            const Icon = item.Icon;
            const active = effectiveRoute === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={active ? "on" : ""}
                onClick={() => go(item.key)}
              >
                <span>
                  <Icon />
                </span>
                <i>{item.label}</i>
              </button>
            );
          })}
        </nav>

        <PlayerBar />
      </div>
    </PlayerProvider>
  );
}
