import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function num(v) {
  return Number(v || 0);
}

function formatStorage(mb) {
  const value = Number(mb || 0);

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`;
  }

  return `${value} MB`;
}

function AdminStat({ label, value, hint }) {
  return (
    <div className="admin-stat-card glass">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <i>{hint}</i>}
    </div>
  );
}

function MiniSongList({ title, items, empty, type = "played" }) {
  return (
    <section className="admin-panel glass">
      <div className="admin-panel-head">
        <h2>{title}</h2>
      </div>

      <div className="admin-mini-list">
        {!items?.length ? (
          <p className="mini-empty">{empty || "Veri yok"}</p>
        ) : (
          items.slice(0, 8).map((s, i) => (
            <div key={`${s.id || i}-${s.title}`} className="admin-mini-row">
              <div>
                <strong>
                  {i + 1}. {s.title || "İsimsiz şarkı"}
                </strong>
                <span>{s.artist || s.uploader || s.uploaded_by_name || "HawarMusic"}</span>
              </div>

              <i>
                {type === "played"
                  ? `${num(s.play_count)} ▶`
                  : s.source_type || "yükleme"}
              </i>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function Admin() {
  const [dash, setDash] = useState(null);
  const [logs, setLogs] = useState([]);
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const membersReq =
        typeof api.members === "function"
          ? api.members().catch(() => [])
          : Promise.resolve([]);

      const [d, l, s, p, m] = await Promise.all([
        api.dashboard().catch(() => null),
        api.logs().catch(() => []),
        api.songs().catch(() => []),
        api.playlists().catch(() => []),
        membersReq,
      ]);

      setDash(d);
      setLogs(Array.isArray(l) ? l : []);
      setSongs(Array.isArray(s) ? s : []);
      setPlaylists(Array.isArray(p) ? p : []);
      setMembers(Array.isArray(m) ? m : []);
    } catch (e) {
      setErr(e.message || "Admin verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const topPlayed = useMemo(() => {
    if (dash?.top_played?.length) return dash.top_played;

    return [...songs]
      .sort((a, b) => num(b.play_count) - num(a.play_count))
      .slice(0, 8);
  }, [dash, songs]);

  const recentUploads = useMemo(() => {
    if (dash?.recent_uploads?.length) return dash.recent_uploads;

    return [...songs].sort((a, b) => num(b.id) - num(a.id)).slice(0, 8);
  }, [dash, songs]);

  const totalSongs = dash?.total_songs ?? songs.length;
  const totalUsers = dash?.total_users ?? members.length;
  const storage = dash?.storage_mb ?? 0;
  const totalPlaylists = dash?.total_playlists ?? playlists.length;
  const totalPlays = songs.reduce((sum, s) => sum + num(s.play_count), 0);
  const downloadable = songs.filter((s) => s.is_downloadable).length;

  if (loading) {
    return (
      <div className="home-loading glass">
        <div className="loading-wave">⚙</div>
        <strong>Admin paneli yükleniyor...</strong>
        <span>Sistem verileri hazırlanıyor.</span>
      </div>
    );
  }

  if (!dash && !songs.length && !logs.length && err) {
    return (
      <div className="empty admin-empty glass">
        <div className="empty-ic">!</div>
        <h3>Yönetici verisi alınamadı</h3>
        <p>{err}</p>
        <button type="button" className="btn btn-grad" onClick={load}>
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-head admin-head">
        <div>
          <p className="hero-eyebrow">Admin</p>
          <h1>Yönetim paneli</h1>
          <span className="admin-sub">
            Şarkılar, playlistler, depolama ve sistem logları.
          </span>
        </div>

        <button type="button" className="btn btn-ghost" onClick={load}>
          Yenile
        </button>
      </div>

      {err && <div className="error-box">{err}</div>}

      <section className="admin-stat-grid">
        <AdminStat label="Toplam şarkı" value={totalSongs} hint="Kütüphane" />
        <AdminStat label="Aile üyesi" value={totalUsers} hint="Kullanıcı" />
        <AdminStat label="Playlist" value={totalPlaylists} hint="Liste" />
        <AdminStat label="Depolama" value={formatStorage(storage)} hint="Kullanılan alan" />
        <AdminStat label="Toplam dinlenme" value={totalPlays} hint="Çalma sayısı" />
        <AdminStat label="Offline uygun" value={downloadable} hint="İndirilebilir" />
      </section>

      <section className="admin-grid">
        <MiniSongList
          title="En çok dinlenenler"
          items={topPlayed}
          empty="Henüz dinlenme verisi yok."
          type="played"
        />

        <MiniSongList
          title="Son yüklenenler"
          items={recentUploads}
          empty="Henüz yükleme yok."
          type="recent"
        />
      </section>

      <section className="admin-grid">
        <section className="admin-panel glass">
          <div className="admin-panel-head">
            <h2>Playlist özeti</h2>
          </div>

          <div className="admin-playlist-list">
            {!playlists.length ? (
              <p className="mini-empty">Playlist yok.</p>
            ) : (
              playlists.slice(0, 8).map((p) => (
                <div key={p.id} className="admin-playlist-row">
                  <div
                    className="admin-playlist-cover"
                    style={{ background: p.cover_gradient }}
                  >
                    ≡
                  </div>

                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      {p.song_count || 0} şarkı · {p.share === "family" ? "aile" : "özel"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="admin-panel glass">
          <div className="admin-panel-head">
            <h2>Kullanıcı özeti</h2>
          </div>

          <div className="admin-member-list">
            {!members.length ? (
              <p className="mini-empty">
                Kullanıcı yönetimi için backend tarafında üye listesi endpoint’i yoksa burada sadece toplam sayı görünür.
              </p>
            ) : (
              members.slice(0, 8).map((m, i) => (
                <div key={m.id || i} className="admin-member-row">
                  <div className="admin-member-avatar">
                    {(m.name || m.username || "?").slice(0, 1).toUpperCase()}
                  </div>

                  <div>
                    <strong>{m.name || m.username || "Kullanıcı"}</strong>
                    <span>{m.role || m.email || "üye"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="admin-panel glass">
        <div className="admin-panel-head">
          <h2>Sistem logları</h2>
          <span>{logs.length} kayıt</span>
        </div>

        <div className="admin-log-list">
          {!logs.length ? (
            <p className="mini-empty">Log kaydı yok.</p>
          ) : (
            logs.slice(0, 40).map((l, i) => (
              <div key={i} className="admin-log-row">
                <span className="admin-log-action">{l.action || "İşlem"}</span>
                <span className="admin-log-detail">{l.detail || "—"}</span>
                <span className="admin-log-user">{l.user || "—"}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
