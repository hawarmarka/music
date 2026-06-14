import { useState, useEffect } from "react";
import { usePlayer } from "../lib/player";
import { offline } from "../lib/offline";
import { api, getToken } from "../lib/api";

const SRC_LABEL = { upload: "Dosya", direct_url: "İçe aktarım", youtube: "YouTube", spotify: "Spotify" };
const EMOJIS = ["❤️", "🔥", "👏", "🎧", "⭐"];

function SongDetails({ song, onClose, onChanged }) {
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [edit, setEdit] = useState({ title: song.title, artist: song.artist || "", album: song.album || "", genre: song.genre || "", year: song.year || "", visibility: song.visibility || "family" });
  const [reactions, setReactions] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.comments(song.id).then(setComments).catch(() => []);
    api.playlists().then(setPlaylists).catch(() => []);
    api.reactions(song.id).then(setReactions).catch(() => []);
  };
  useEffect(load, [song.id]);

  async function addComment() {
    if (!comment.trim()) return;
    const c = await api.addComment(song.id, comment.trim());
    setComments((x) => [...x, c]); setComment("");
  }
  async function addToPlaylist(pid) {
    if (!pid) return;
    try { await api.playlistAdd(pid, song.id); setMsg("Playlist'e eklendi ✓"); setTimeout(() => setMsg(""), 1600); }
    catch (e) { setMsg(e.message); }
  }
  async function saveEdit() {
    try {
      await api.editSong(song.id, { ...edit, year: edit.year ? parseInt(edit.year) : null });
      setMsg("Şarkı bilgileri kaydedildi ✓"); onChanged?.();
      setTimeout(() => setMsg(""), 1600);
    } catch (e) { setMsg(e.message); }
  }
  async function react(emoji) {
    const r = await api.react(song.id, emoji);
    setReactions(r.items || []);
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="song-modal glass" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <div className="modal-head">
          <div className="modal-cover" style={{ background: song.cover_gradient }}>♪</div>
          <div>
            <p className="hero-eyebrow">{SRC_LABEL[song.source_type] || "Bağlantı"} · Ekleyen: {song.uploaded_by_name}</p>
            <h2>{song.title}</h2>
            <p className="hero-sub">{song.artist || "Sanatçı yok"} {song.album ? `· ${song.album}` : ""}</p>
            {!song.is_downloadable && <span className="tb-offline">Link-only · offline indirilemez</span>}
          </div>
        </div>

        <div className="detail-grid">
          <section>
            <h3>Şarkı bilgileri</h3>
            <div className="detail-fields">
              <input className="f-input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Başlık" />
              <input className="f-input" value={edit.artist} onChange={(e) => setEdit({ ...edit, artist: e.target.value })} placeholder="Sanatçı" />
              <input className="f-input" value={edit.album} onChange={(e) => setEdit({ ...edit, album: e.target.value })} placeholder="Albüm" />
              <input className="f-input" value={edit.genre} onChange={(e) => setEdit({ ...edit, genre: e.target.value })} placeholder="Tür" />
              <input className="f-input" value={edit.year || ""} onChange={(e) => setEdit({ ...edit, year: e.target.value })} placeholder="Yıl" />
              <select className="f-input" value={edit.visibility} onChange={(e) => setEdit({ ...edit, visibility: e.target.value })}>
                <option value="family">Aile ile paylaş</option><option value="private">Özel</option>
              </select>
            </div>
            <button className="btn btn-grad" onClick={saveEdit}>Kaydet</button>
            {msg && <div className="ok-box modal-msg">{msg}</div>}
          </section>

          <section>
            <h3>Playlist'e ekle</h3>
            <select className="f-input" onChange={(e) => addToPlaylist(e.target.value)} defaultValue="">
              <option value="" disabled>Playlist seç</option>
              {playlists.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.share === "family" ? "aile" : "özel"})</option>)}
            </select>
            <h3 style={{ marginTop: "1rem" }}>Aile tepkileri</h3>
            <div className="emoji-row">
              {EMOJIS.map((e) => {
                const r = reactions.find((x) => x.emoji === e);
                return <button key={e} className={r?.mine ? "emoji on" : "emoji"} onClick={() => react(e)}>{e} {r?.count || ""}</button>;
              })}
            </div>
          </section>
        </div>

        <section className="comments">
          <h3>Yorumlar</h3>
          <div className="comment-list">
            {comments.length === 0 ? <p className="mini-empty">Henüz yorum yok.</p> : comments.map((c) => (
              <div key={c.id} className="comment-row"><strong>{c.author}</strong><span>{c.text}</span></div>
            ))}
          </div>
          <div className="comment-add">
            <input className="f-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Aile yorumu yaz..." onKeyDown={(e) => e.key === "Enter" && addComment()} />
            <button className="btn btn-grad" onClick={addComment}>Gönder</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SongCard({ song, list, onChanged, inPlaylist, onRemoveFromPlaylist }) {
  const player = usePlayer();
  const [liked, setLiked] = useState(song.liked);
  const [likeCount, setLikeCount] = useState(song.like_count);
  const [isOffline, setIsOffline] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => { offline.has(song.id).then(setIsOffline); }, [song.id]);

  const playing = player.current?.id === song.id;

  async function toggleFav(e) {
    e.stopPropagation();
    try {
      const r = await api.favorite(song.id);
      setLiked(r.liked); setLikeCount(r.like_count);
    } catch {}
  }

  async function saveOffline(e) {
    e.stopPropagation(); setMenu(false);
    if (!song.is_downloadable) return;
    setBusy(true);
    try {
      const res = await fetch(`${api.streamUrl(song.id)}?t=${encodeURIComponent(getToken() || "")}`);
      const blob = await res.blob();
      await offline.save(song, blob);
      await api.offlineMark(song.id).catch(() => {});
      setIsOffline(true);
    } catch (err) { alert(err.message || "Offline indirme başarısız"); }
    finally { setBusy(false); }
  }

  async function removeOffline(e) {
    e.stopPropagation(); setMenu(false);
    await offline.remove(song.id);
    await api.offlineRemove(song.id).catch(() => {});
    setIsOffline(false);
  }

  async function del(e) {
    e.stopPropagation(); setMenu(false);
    if (!confirm("Bu şarkı silinsin mi?")) return;
    try { await api.deleteSong(song.id); onChanged?.(); } catch (err) { alert(err.message); }
  }

  const cover = song.cover_url
    ? <img src={song.cover_url ? `${song.cover_url}?t=${encodeURIComponent(getToken() || "")}` : ""} alt="" />
    : <div className="cover-grad" style={{ background: song.cover_gradient }}><span>♪</span></div>;

  return (
    <>
      <article className={`song-card ${playing ? "is-playing" : ""}`}>
        <div className="sc-art" onClick={() => player.playSong(song, list)}>
          {cover}
          <span className={`sc-src sc-${song.source_type}`}>{SRC_LABEL[song.source_type] || "Bağlantı"}</span>
          {isOffline && <span className="sc-offline" title="Offline kayıtlı">⤓</span>}
          <button className="sc-play" onClick={(e) => { e.stopPropagation(); player.playSong(song, list); }} aria-label="Çal">▶</button>
        </div>
        <div className="sc-body">
          <div className="sc-titles" onClick={() => player.playSong(song, list)}>
            <strong title={song.title}>{song.title}</strong>
            <span>{song.artist || `Ekleyen: ${song.uploaded_by_name}`}</span>
          </div>
          <div className="sc-actions">
            <button className={`sc-heart ${liked ? "on" : ""}`} onClick={toggleFav} aria-label="Favori">
              {liked ? "♥" : "♡"}{likeCount > 0 && <i>{likeCount}</i>}
            </button>
            <div className="sc-menu-wrap">
              <button className="sc-dots" onClick={(e) => { e.stopPropagation(); setMenu(!menu); }} aria-label="Menü">⋯</button>
              {menu && (
                <div className="sc-menu" onMouseLeave={() => setMenu(false)}>
                  <button onClick={(e) => { e.stopPropagation(); setMenu(false); setDetails(true); }}>Detay / yorum / playlist</button>
                  {song.is_downloadable && !isOffline && (
                    <button onClick={saveOffline} disabled={busy}>{busy ? "İndiriliyor..." : "Offline indir"}</button>
                  )}
                  {isOffline && <button onClick={removeOffline}>Offline'dan kaldır</button>}
                  {!song.is_downloadable && <div className="sc-note">Bu kaynak offline indirilemez</div>}
                  {song.source_url && (
                    <a href={song.source_url} target="_blank" rel="noreferrer" onClick={() => setMenu(false)}>Harici dinle ↗</a>
                  )}
                  {inPlaylist && <button onClick={(e) => { e.stopPropagation(); setMenu(false); onRemoveFromPlaylist?.(song.id); }}>Playlistten çıkar</button>}
                  <button className="m-danger" onClick={del}>Sil</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
      {details && <SongDetails song={song} onClose={() => setDetails(false)} onChanged={onChanged} />}
    </>
  );
}
