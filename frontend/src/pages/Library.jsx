import { useState, useEffect } from "react";
import { api } from "../lib/api";
import SongCard from "../components/SongCard";

export default function Library() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");

  const load = () => { setLoading(true); api.songs().then(setSongs).finally(() => setLoading(false)); };
  useEffect(load, []);
  useEffect(() => {
    const h = (e) => setQ(e.detail);
    window.addEventListener("hm-search", h);
    return () => window.removeEventListener("hm-search", h);
  }, []);

  const filtered = songs.filter((s) => {
    if (source && s.source_type !== source) return false;
    if (q && !`${s.title} ${s.artist} ${s.album} ${s.uploaded_by_name}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-head">
        <h1>Kütüphane</h1>
        <div className="filters">
          {["", "upload", "youtube", "spotify", "direct_url"].map((s) => (
            <button key={s} className={source === s ? "chip on" : "chip"} onClick={() => setSource(s)}>
              {s === "" ? "Hepsi" : s === "upload" ? "Dosya" : s === "direct_url" ? "İçe aktarım" : s === "youtube" ? "YouTube" : "Spotify"}
            </button>
          ))}
        </div>
      </div>
      {loading ? <div className="loading">Yükleniyor...</div>
        : filtered.length === 0 ? <div className="empty"><div className="empty-ic">♪</div><h3>Şarkı yok</h3><p>Filtreyi değiştir ya da yeni şarkı ekle.</p></div>
        : <div className="grid">{filtered.map((s) => <SongCard key={s.id} song={s} list={filtered} onChanged={load} />)}</div>}
    </div>
  );
}
