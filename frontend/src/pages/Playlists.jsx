import { useState, useEffect } from "react";
import { api } from "../lib/api";
import SongCard from "../components/SongCard";

export default function Playlists() {
  const [lists, setLists] = useState([]);
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.playlists().then(setLists).finally(() => setLoading(false));
  const loadDetail = () => active ? api.playlist(active).then(setDetail).catch((e) => setErr(e.message)) : setDetail(null);
  useEffect(load, []);
  useEffect(() => { loadDetail(); }, [active]);

  async function create() {
    const name = prompt("Playlist adı:");
    if (!name?.trim()) return;
    const share = confirm("Aile ile paylaşılsın mı? (İptal = özel)") ? "family" : "private";
    await api.createPlaylist({ name: name.trim(), share });
    load();
  }
  async function del(id) {
    if (!confirm("Playlist silinsin mi?")) return;
    await api.deletePlaylist(id); setActive(null); load();
  }
  async function removeSong(songId) {
    try { await api.playlistRemove(detail.id, songId); loadDetail(); load(); }
    catch (e) { setErr(e.message); }
  }
  async function dropOn(targetId) {
    if (!dragId || dragId === targetId) return;
    const arr = [...detail.songs];
    const from = arr.findIndex((s) => s.id === dragId);
    const to = arr.findIndex((s) => s.id === targetId);
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setDetail({ ...detail, songs: arr });
    setDragId(null);
    try { await api.playlistReorder(detail.id, arr.map((s) => s.id)); }
    catch (e) { setErr(e.message); loadDetail(); }
  }

  if (active && detail) {
    return (
      <div>
        <div className="page-head">
          <button className="back-btn" onClick={() => setActive(null)}>← Geri</button>
        </div>
        <div className="pl-detail-head">
          <div className="pl-detail-cover" style={{ background: detail.cover_gradient }}>≡</div>
          <div>
            <p className="hero-eyebrow">{detail.share === "family" ? "Aile playlisti" : "Özel playlist"}</p>
            <h1>{detail.name}</h1>
            <p className="hero-sub">{detail.songs.length} şarkı · {detail.owner_name}</p>
            <div className="hero-cta"><button className="btn btn-ghost" onClick={() => del(detail.id)}>Playlisti sil</button></div>
          </div>
        </div>
        {err && <div className="error-box" style={{ marginBottom: "1rem" }}>{err}</div>}
        {detail.songs.length === 0 ? <div className="empty"><p>Bu playlist boş. Şarkı kartlarındaki ⋯ menüsünden ekleyebilirsin.</p></div>
          : <>
              <p className="muted-note">Sıralamak için kartı tutup başka kartın üstüne bırak.</p>
              <div className="grid">
                {detail.songs.map((s) => (
                  <div key={s.id} draggable onDragStart={() => setDragId(s.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(s.id)} className="drag-wrap">
                    <SongCard song={s} list={detail.songs} inPlaylist onRemoveFromPlaylist={removeSong} onChanged={loadDetail} />
                  </div>
                ))}
              </div>
            </>}
      </div>
    );
  }

  return (
    <div>
      <div className="page-head"><h1>Playlistler</h1><button className="btn btn-grad" onClick={create}>+ Yeni playlist</button></div>
      {loading ? <div className="loading">Yükleniyor...</div>
        : lists.length === 0 ? <div className="empty"><div className="empty-ic">≡</div><h3>Playlist yok</h3><p>İlk playlistini oluştur.</p></div>
        : <div className="pl-grid">
            {lists.map((p) => (
              <button key={p.id} className="pl-card" onClick={() => setActive(p.id)}>
                <div className="pl-cover" style={{ background: p.cover_gradient }}>≡</div>
                <strong>{p.name}</strong><span>{p.song_count} şarkı · {p.share === "family" ? "aile" : "özel"}</span>
              </button>
            ))}
          </div>}
    </div>
  );
}
