import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import SongCard from "../components/SongCard";

function HomeStat({ label, value, hint }) {
  return (
    <div className="home-stat glass">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <i>{hint}</i>}
    </div>
  );
}

function Row({ title, songs, action, onChanged }) {
  if (!songs?.length) return null;

  return (
    <section className="row home-song-section">
      <div className="row-head">
        <div>
          <h2>{title}</h2>
          <p>{songs.length} şarkı gösteriliyor</p>
        </div>

        {action}
      </div>

      <div className="row-grid home-song-list">
        {songs.map((s) => (
          <SongCard key={s.id} song={s} list={songs} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

export default function Home({ go }) {
  const [recent, setRecent] = useState([]);
  const [all, setAll] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");

    try {
      const [r, a, p] = await Promise.all([
        api.recent().catch(() => []),
        api.songs().catch(() => []),
        api.playlists().catch(() => []),
      ]);

      setRecent(Array.isArray(r) ? r : []);
      setAll(Array.isArray(a) ? a : []);
      setPlaylists(Array.isArray(p) ? p : []);
    } catch (e) {
      setErr(e.message || "Ana sayfa yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function run() {
      setErr("");

      try {
        const [r, a, p] = await Promise.all([
          api.recent().catch(() => []),
          api.songs().catch(() => []),
          api.playlists().catch(() => []),
        ]);

        if (!alive) return;

        setRecent(Array.isArray(r) ? r : []);
        setAll(Array.isArray(a) ? a : []);
        setPlaylists(Array.isArray(p) ? p : []);
      } catch (e) {
        if (alive) setErr(e.message || "Ana sayfa yüklenemedi.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, []);

  const newest = useMemo(() => all.slice(0, 8), [all]);

  const mostPlayed = useMemo(() => {
    return [...all]
      .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
      .slice(0, 8);
  }, [all]);

  const totalPlays = useMemo(() => {
    return all.reduce((sum, s) => sum + Number(s.play_count || 0), 0);
  }, [all]);

  const downloadableCount = useMemo(() => {
    return all.filter((s) => s.is_downloadable).length;
  }, [all]);

  if (loading) {
    return (
      <div className="home-loading glass">
        <div className="loading-wave">♪</div>
        <strong>HawarMusic yükleniyor...</strong>
        <span>Arşivin hazırlanıyor.</span>
      </div>
    );
  }

  return (
    <div className="home-page">
      <section className="hero home-hero glass">
        <div className="hero-text">
          <p className="hero-eyebrow">HawarMusic</p>

          <h1>Ailene özel müzik arşivin</h1>

          <p className="hero-sub">
            Şarkılarını yükle, linkten indir, playlist oluştur ve telefonda rahatça dinle.
          </p>

          <div className="hero-cta">
            <button type="button" className="btn btn-grad" onClick={() => go("upload")}>
              ⤴ Şarkı yükle
            </button>

            <button type="button" className="btn btn-ghost" onClick={() => go("import")}>
              + Linkten ekle
            </button>

            <button type="button" className="btn btn-ghost" onClick={() => go("library")}>
              Kütüphaneye git
            </button>
          </div>
        </div>

        <div className="home-hero-card">
          <span>Toplam arşiv</span>
          <strong>{all.length}</strong>
          <i>şarkı</i>
        </div>
      </section>

      {err && <div className="error-box">{err}</div>}

      <section className="home-stats">
        <HomeStat label="Toplam şarkı" value={all.length} hint="Kütüphane" />
        <HomeStat label="Playlist" value={playlists.length} hint="Aile listeleri" />
        <HomeStat label="Dinlenme" value={totalPlays} hint="Toplam çalma" />
        <HomeStat label="Offline uygun" value={downloadableCount} hint="İndirilebilir" />
      </section>

      {all.length === 0 ? (
        <div className="empty home-empty glass">
          <div className="empty-ic">♪</div>

          <h3>Arşiv henüz boş</h3>

          <p>İlk şarkını yükleyerek ya da bir bağlantı ekleyerek başla.</p>

          <div className="home-empty-actions">
            <button type="button" className="btn btn-grad" onClick={() => go("upload")}>
              İlk şarkıyı yükle
            </button>

            <button type="button" className="btn btn-ghost" onClick={() => go("import")}>
              Linkten ekle
            </button>
          </div>
        </div>
      ) : (
        <>
          <Row title="Devam et" songs={recent.slice(0, 8)} onChanged={load} />

          <Row
            title="Son eklenenler"
            songs={newest}
            onChanged={load}
            action={
              <button type="button" className="row-link" onClick={() => go("library")}>
                Tümü
              </button>
            }
          />

          <Row title="En çok dinlenenler" songs={mostPlayed} onChanged={load} />
        </>
      )}

      {playlists.length > 0 && (
        <section className="row home-playlist-section">
          <div className="row-head">
            <div>
              <h2>Aile playlistleri</h2>
              <p>{playlists.length} playlist mevcut</p>
            </div>

            <button type="button" className="row-link" onClick={() => go("playlists")}>
              Tümü
            </button>
          </div>

          <div className="home-playlist-list">
            {playlists.slice(0, 6).map((p) => (
              <button
                type="button"
                key={p.id}
                className="home-playlist-item glass"
                onClick={() => go("playlists")}
              >
                <div className="home-playlist-cover" style={{ background: p.cover_gradient }}>
                  ≡
                </div>

                <div>
                  <strong>{p.name}</strong>
                  <span>{p.song_count || 0} şarkı</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
