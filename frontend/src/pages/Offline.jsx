import { useEffect, useMemo, useState } from "react";
import { offline } from "../lib/offline";
import { usePlayer } from "../lib/player";

function OfflineCover({ song }) {
  return (
    <div className="offline-cover" style={{ background: song.cover_gradient }}>
      ♪
    </div>
  );
}

export default function Offline({ online }) {
  const player = usePlayer();

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const s = await offline.list();
      setSongs(Array.isArray(s) ? s : []);
    } catch (e) {
      setErr(e.message || "Offline şarkılar alınamadı.");
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const h = (e) => setQ(e.detail || "");

    window.addEventListener("hm-search", h);

    return () => window.removeEventListener("hm-search", h);
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return songs;

    return songs.filter((s) => {
      const haystack = [
        s.title,
        s.artist,
        s.album,
        s.uploaded_by_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [songs, q]);

  async function play(song) {
    try {
      const rec = await offline.get(song.id);

      if (rec) {
        player.playSong(rec, songs);
      }
    } catch (e) {
      setErr(e.message || "Offline şarkı çalınamadı.");
    }
  }

  async function remove(id) {
    if (!confirm("Bu offline şarkı silinsin mi?")) return;

    try {
      await offline.remove(id);
      load();
    } catch (e) {
      setErr(e.message || "Offline şarkı silinemedi.");
    }
  }

  async function clearAll() {
    if (!songs.length) return;
    if (!confirm("Tüm offline şarkılar silinsin mi?")) return;

    try {
      for (const s of songs) {
        await offline.remove(s.id);
      }

      load();
    } catch (e) {
      setErr(e.message || "Offline arşiv temizlenemedi.");
    }
  }

  return (
    <div className="offline-page">
      <div className="page-head offline-head">
        <div>
          <p className="hero-eyebrow">Offline</p>

          <h1>Offline müzik</h1>

          <span className="offline-sub">
            {filtered.length} kayıtlı şarkı gösteriliyor
          </span>
        </div>

        {!online && (
          <span className="offline-warning">
            Çevrimdışısın — sadece kayıtlı şarkılar çalınabilir
          </span>
        )}
      </div>

      <section className="offline-toolbar glass">
        <div className="offline-search">
          <span>⌕</span>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Offline şarkılar içinde ara..."
          />
        </div>

        {songs.length > 0 && (
          <button type="button" className="btn btn-danger" onClick={clearAll}>
            Tümünü temizle
          </button>
        )}
      </section>

      {err && <div className="error-box">{err}</div>}

      {loading ? (
        <div className="home-loading glass">
          <div className="loading-wave">♪</div>
          <strong>Offline müzikler yükleniyor...</strong>
          <span>Kayıtlı şarkıların hazırlanıyor.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty offline-empty glass">
          <div className="empty-ic">♪</div>

          <h3>Offline şarkı yok</h3>

          <p>
            Bir şarkı kartındaki üç nokta menüsünden “Offline indir” diyerek
            buraya ekleyebilirsin.
          </p>

          {q && (
            <button type="button" className="btn btn-ghost" onClick={() => setQ("")}>
              Aramayı temizle
            </button>
          )}
        </div>
      ) : (
        <div className="offline-list">
          {filtered.map((s) => (
            <div key={s.id} className="offline-row glass">
              <button
                type="button"
                className="offline-main"
                onClick={() => play(s)}
                title="Çal"
              >
                <OfflineCover song={s} />

                <div className="offline-text">
                  <strong title={s.title}>{s.title}</strong>
                  <span title={s.artist || s.uploaded_by_name}>
                    {s.artist || s.uploaded_by_name || "HawarMusic"}
                  </span>
                </div>
              </button>

              <div className="offline-actions">
                <button type="button" className="btn btn-grad btn-sm" onClick={() => play(s)}>
                  ▶ Çal
                </button>

                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
