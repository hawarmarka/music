import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import SongCard from "../components/SongCard";

const SORTS = [
  { key: "newest", label: "Yeni eklenen" },
  { key: "name", label: "Ada göre" },
  { key: "artist", label: "Sanatçı" },
  { key: "played", label: "Çok dinlenen" },
];

export default function Favorites({ go }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const data = await api.favorites();
      setSongs(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Favoriler yüklenemedi.");
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
      if (!search) return true;

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

      return haystack.includes(search);
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
  }, [songs, q, sort]);

  return (
    <div className="favorites-page">
      <div className="page-head favorites-head">
        <div>
          <p className="hero-eyebrow">Favoriler</p>
          <h1>Beğendiğin şarkılar</h1>
          <span className="favorites-sub">
            {filtered.length} favori şarkı gösteriliyor
          </span>
        </div>

        {go && (
          <div className="favorites-actions">
            <button type="button" className="btn btn-ghost" onClick={() => go("library")}>
              Kütüphaneye git
            </button>

            <button type="button" className="btn btn-grad" onClick={() => go("import")}>
              + Linkten ekle
            </button>
          </div>
        )}
      </div>

      <section className="favorites-toolbar glass">
        <div className="favorites-search">
          <span>⌕</span>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Favoriler içinde ara..."
          />
        </div>

        <div className="favorites-sort">
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

      {err && <div className="error-box">{err}</div>}

      {loading ? (
        <div className="home-loading glass">
          <div className="loading-wave">♥</div>
          <strong>Favoriler yükleniyor...</strong>
          <span>Beğendiğin şarkılar hazırlanıyor.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty favorites-empty glass">
          <div className="empty-ic">♥</div>

          <h3>Henüz favorin yok</h3>

          <p>
            Şarkıların yanındaki kalbe dokunarak favorilerine ekleyebilirsin.
          </p>

          <div className="home-empty-actions">
            {q && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setQ("")}
              >
                Aramayı temizle
              </button>
            )}

            {go && (
              <button type="button" className="btn btn-grad" onClick={() => go("library")}>
                Kütüphaneye git
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid favorites-list">
          {filtered.map((s) => (
            <SongCard key={s.id} song={s} list={filtered} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
