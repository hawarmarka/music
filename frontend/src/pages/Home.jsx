import { useState, useEffect } from "react";
import { api } from "../lib/api";
import SongCard from "../components/SongCard";

function Row({ title, songs, action }) {
  if (!songs?.length) return null;
  return (
    <section className="row">
      <div className="row-head"><h2>{title}</h2>{action}</div>
      <div className="row-grid">{songs.map((s) => <SongCard key={s.id} song={s} list={songs} />)}</div>
    </section>
  );
}

export default function Home({ go }) {
  const [recent, setRecent] = useState([]);
  const [all, setAll] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.recent().catch(() => []),
      api.songs().catch(() => []),
      api.playlists().catch(() => []),
    ]).then(([r, a, p]) => { setRecent(r); setAll(a); setPlaylists(p); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Yükleniyor...</div>;

  const newest = all.slice(0, 8);
  const mostPlayed = [...all].sort((a, b) => b.play_count - a.play_count).slice(0, 8);

  return (
    <div>
      <div className="hero glass">
        <div className="hero-text">
          <p className="hero-eyebrow">HawarMusic</p>
          <h1>Ailene özel müzik arşivin</h1>
          <p className="hero-sub">Kendi müziklerini yükle, playlist oluştur, offline dinle.</p>
          <div className="hero-cta">
            <button className="btn btn-grad" onClick={() => go("upload")}>⤴ Şarkı yükle</button>
            <button className="btn btn-ghost" onClick={() => go("import")}>+ Linkten ekle</button>
          </div>
        </div>
      </div>

      {recent.length > 0 && <Row title="Devam et" songs={recent.slice(0, 8)} />}
      <Row title="Son eklenenler" songs={newest} action={<button className="row-link" onClick={() => go("library")}>Tümü →</button>} />
      <Row title="En çok dinlenenler" songs={mostPlayed} />

      {playlists.length > 0 && (
        <section className="row">
          <div className="row-head"><h2>Aile playlistleri</h2><button className="row-link" onClick={() => go("playlists")}>Tümü →</button></div>
          <div className="pl-grid">
            {playlists.slice(0, 6).map((p) => (
              <button key={p.id} className="pl-card" onClick={() => go("playlists")}>
                <div className="pl-cover" style={{ background: p.cover_gradient }}>≡</div>
                <strong>{p.name}</strong><span>{p.song_count} şarkı</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {all.length === 0 && (
        <div className="empty">
          <div className="empty-ic">♪</div>
          <h3>Arşiv henüz boş</h3>
          <p>İlk şarkını yükleyerek ya da bir bağlantı ekleyerek başla.</p>
          <button className="btn btn-grad" onClick={() => go("upload")}>İlk şarkıyı ekle</button>
        </div>
      )}
    </div>
  );
}
