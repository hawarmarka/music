import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import SongCard from "../components/SongCard";

const SOURCES = [
  { key: "", label: "Hepsi" },
  { key: "upload", label: "Dosya" },
  { key: "yt_dlp", label: "Linkten indir" },
  { key: "direct_url", label: "İçe aktarım" },
  { key: "youtube", label: "YouTube" },
  { key: "spotify", label: "Spotify" },
];

const SORTS = [
  { key: "newest", label: "Yeni eklenen" },
  { key: "name", label: "Ada göre" },
  { key: "artist", label: "Sanatçı" },
  { key: "played", label: "Çok dinlenen" },
];

export default function Library({ go }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("newest");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const r = await api.songs();
      setSongs(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(e.message || "Kütüphane yüklenemedi.");
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

    const list = songs.filter((s) => {
      if (source && s.source_type !== source) return false;

      if (search) {
        const haystack = [
          s.title,
          s.artist,
          s.album,
          s.genre,
          s.year,
          s.uploaded_by_name,
          s.source_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === "name") {
        return String(a.title || "").localeCompare(String(b.title || ""), "tr");
      }

      if (sort === "artist") {
        return String(a.artist || "").localeCompare(String(b.artist || ""), "tr");
      }

      if (sort === "played") {
        return Number(b.play_count || 0) - Number(a.play_count || 0);
      }

      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [songs, q, source, sort]);

  const activeSourceLabel =
    SOURCES.find((x) => x.key === source)?.label || "Hepsi";

  return (
    <div className="library-page">
      <div className="page-head library-head">
        <div>
          <p className="hero-eyebrow">Kütüphane</p>
          <h1>Müzik arşivi</h1>
          <span className="library-sub">
            {filtered.length} şarkı gösteriliyor · Filtre: {activeSourceLabel}
          </span>
        </div>

        <div className="library-actions">
          {go && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => go("upload")}>
                ⤴ Yükle
              </button>

              <button type="button" className="btn btn-grad" onClick={() => go("import")}>
                + Linkten ekle
              </button>
            </>
          )}
        </div>
      </div>

      <section className="library-toolbar glass">
        <div className="library-search">
          <span>⌕</span>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Şarkı, sanatçı, albüm veya ekleyen kişi ara..."
          />
        </div>

        <div className="library-sort">
          <select
            className="f-input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sıralama"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="filters library-filters">
        {SOURCES.map((s) => (
          <button
            type="button"
            key={s.key}
            className={source === s.key ? "chip on" : "chip"}
            onClick={() => setSource(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {err && <div className="error-box">{err}</div>}

      {loading ? (
        <div className="home-loading glass">
          <div className="loading-wave">♪</div>
          <strong>Kütüphane yükleniyor...</strong>
          <span>Şarkıların hazırlanıyor.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty library-empty glass">
          <div className="empty-ic">♪</div>

          <h3>Şarkı bulunamadı</h3>

          <p>Filtreyi değiştir, aramayı temizle veya yeni şarkı ekle.</p>

          <div className="home-empty-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setQ("");
                setSource("");
                setSort("newest");
              }}
            >
              Filtreleri temizle
            </button>

            {go && (
              <button type="button" className="btn btn-grad" onClick={() => go("upload")}>
                Şarkı yükle
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid library-list">
          {filtered.map((s) => (
            <SongCard key={s.id} song={s} list={filtered} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
