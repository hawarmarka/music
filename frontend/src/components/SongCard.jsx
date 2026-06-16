import { useEffect, useState } from "react";
import { usePlayer } from "../lib/player";
import { offline } from "../lib/offline";
import { api, getToken } from "../lib/api";

const SRC_LABEL = {
  upload: "Dosya",
  direct_url: "İçe aktarım",
  youtube: "YouTube",
  spotify: "Spotify",
  yt_dlp: "Linkten indir",
};

const EMOJIS = ["❤️", "🔥", "👏", "🎧", "⭐"];

function safeStop(e) {
  e.preventDefault();
  e.stopPropagation();
}

function SongCover({ song, className = "" }) {
  const token = encodeURIComponent(getToken() || "");
  const fallback = song.cover_gradient || "linear-gradient(135deg,#7c4dff,#4f7cff)";

  if (song.cover_url) {
    return (
      <img
        className={className}
        src={`${song.cover_url}?t=${token}`}
        alt=""
        draggable="false"
      />
    );
  }

  return (
    <div className={`hm-song-cover-fallback ${className}`} style={{ background: fallback }}>
      <span>♪</span>
    </div>
  );
}

function SongDetails({ song, onClose, onChanged }) {
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [edit, setEdit] = useState({
    title: song.title || "",
    artist: song.artist || "",
    album: song.album || "",
    genre: song.genre || "",
    year: song.year || "",
    visibility: song.visibility || "family",
  });
  const [reactions, setReactions] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;

    api.comments(song.id).then((r) => alive && setComments(r || [])).catch(() => alive && setComments([]));
    api.playlists().then((r) => alive && setPlaylists(r || [])).catch(() => alive && setPlaylists([]));
    api.reactions(song.id).then((r) => alive && setReactions(r || [])).catch(() => alive && setReactions([]));

    return () => {
      alive = false;
    };
  }, [song.id]);

  async function addComment() {
    const text = comment.trim();
    if (!text) return;

    try {
      const c = await api.addComment(song.id, text);
      setComments((x) => [...x, c]);
      setComment("");
    } catch (e) {
      setMsg(e.message || "Yorum gönderilemedi.");
    }
  }

  async function addToPlaylist(pid) {
    if (!pid) return;

    try {
      await api.playlistAdd(pid, song.id);
      setMsg("Playlist'e eklendi ✓");
      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setMsg(e.message || "Playlist'e eklenemedi.");
    }
  }

  async function saveEdit() {
    try {
      const yearValue = edit.year ? parseInt(edit.year, 10) : null;

      await api.editSong(song.id, {
        ...edit,
        year: Number.isNaN(yearValue) ? null : yearValue,
      });

      setMsg("Şarkı bilgileri kaydedildi ✓");
      onChanged?.();

      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setMsg(e.message || "Kaydedilemedi.");
    }
  }

  async function react(emoji) {
    try {
      const r = await api.react(song.id, emoji);
      setReactions(r.items || []);
    } catch (e) {
      setMsg(e.message || "Tepki gönderilemedi.");
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="song-modal glass" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={onClose}>✕</button>

        <div className="modal-head">
          <div className="modal-cover">
            <SongCover song={song} className="hm-modal-cover-media" />
          </div>

          <div className="modal-title-area">
            <p className="hero-eyebrow">
              {SRC_LABEL[song.source_type] || "Bağlantı"} · Ekleyen: {song.uploaded_by_name || "HawarMusic"}
            </p>

            <h2>{song.title}</h2>

            <p className="hero-sub">
              {song.artist || "Sanatçı yok"}
              {song.album ? ` · ${song.album}` : ""}
            </p>

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
                <option value="family">Aile ile paylaş</option>
                <option value="private">Özel</option>
              </select>
            </div>

            <button type="button" className="btn btn-grad" onClick={saveEdit}>Kaydet</button>
            {msg && <div className="ok-box modal-msg">{msg}</div>}
          </section>

          <section>
            <h3>Playlist'e ekle</h3>

            <select className="f-input" onChange={(e) => addToPlaylist(e.target.value)} defaultValue="">
              <option value="" disabled>Playlist seç</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.share === "family" ? "aile" : "özel"})</option>
              ))}
            </select>

            <h3 style={{ marginTop: "1rem" }}>Aile tepkileri</h3>

            <div className="emoji-row">
              {EMOJIS.map((emoji) => {
                const r = reactions.find((x) => x.emoji === emoji);
                return (
                  <button type="button" key={emoji} className={r?.mine ? "emoji on" : "emoji"} onClick={() => react(emoji)}>
                    {emoji} {r?.count || ""}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="comments">
          <h3>Yorumlar</h3>

          <div className="comment-list">
            {comments.length === 0 ? (
              <p className="mini-empty">Henüz yorum yok.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="comment-row"><strong>{c.author}</strong><span>{c.text}</span></div>
              ))
            )}
          </div>

          <div className="comment-add">
            <input
              className="f-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Aile yorumu yaz..."
              onKeyDown={(e) => e.key === "Enter" && addComment()}
            />

            <button type="button" className="btn btn-grad" onClick={addComment}>Gönder</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SongCard({ song, list, onChanged, inPlaylist, onRemoveFromPlaylist }) {
  const player = usePlayer();

  const [liked, setLiked] = useState(Boolean(song.liked));
  const [likeCount, setLikeCount] = useState(song.like_count || 0);
  const [isOffline, setIsOffline] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    let alive = true;

    offline.has(song.id).then((r) => {
      if (alive) setIsOffline(Boolean(r));
    });

    return () => {
      alive = false;
    };
  }, [song.id]);

  const queue = Array.isArray(list) && list.length ? list : [song];
  const playing = player.current?.id === song.id;
  const artist = song.artist || `Ekleyen: ${song.uploaded_by_name || "HawarMusic"}`;
  const sourceLabel = SRC_LABEL[song.source_type] || "Bağlantı";

  function playSong(e) {
    safeStop(e);
    player.playSong(song, queue);
  }

  async function toggleFav(e) {
    safeStop(e);

    try {
      const r = await api.favorite(song.id);
      setLiked(Boolean(r.liked));
      setLikeCount(r.like_count || 0);
      if (!r.liked) onChanged?.();
    } catch (err) {
      alert(err.message || "Favori işlemi başarısız.");
    }
  }

  function toggleMenu(e) {
    safeStop(e);
    setMenu((v) => !v);
  }

  function openDetails(e) {
    safeStop(e);
    setMenu(false);
    setDetails(true);
  }

  async function saveOffline(e) {
    safeStop(e);
    setMenu(false);
    if (!song.is_downloadable) return;

    setBusy(true);
    try {
      const res = await fetch(`${api.streamUrl(song.id)}?t=${encodeURIComponent(getToken() || "")}`);
      if (!res.ok) throw new Error("Dosya indirilemedi.");
      const blob = await res.blob();
      await offline.save(song, blob);
      await api.offlineMark(song.id).catch(() => {});
      setIsOffline(true);
    } catch (err) {
      alert(err.message || "Offline indirme başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function removeOffline(e) {
    safeStop(e);
    setMenu(false);
    try {
      await offline.remove(song.id);
      await api.offlineRemove(song.id).catch(() => {});
      setIsOffline(false);
    } catch (err) {
      alert(err.message || "Offline kayıt kaldırılamadı.");
    }
  }

  async function del(e) {
    safeStop(e);
    setMenu(false);
    if (!confirm("Bu şarkı silinsin mi?")) return;

    try {
      await api.deleteSong(song.id);
      onChanged?.();
    } catch (err) {
      alert(err.message || "Şarkı silinemedi.");
    }
  }

  function removeFromPlaylist(e) {
    safeStop(e);
    setMenu(false);
    onRemoveFromPlaylist?.(song.id);
  }

  return (
    <>
      <article className={`hm-song-row ${playing ? "is-playing" : ""}`}>
        <div className="hm-song-hit hm-song-cover-box" role="button" tabIndex={0} onClick={playSong} onKeyDown={(e) => e.key === "Enter" && playSong(e)} title="Çal">
          <SongCover song={song} className="hm-song-cover-media" />
          {isOffline && <span className="hm-song-offline" title="Offline kayıtlı">⤓</span>}
        </div>

        <div className="hm-song-hit hm-song-info" role="button" tabIndex={0} onClick={playSong} onKeyDown={(e) => e.key === "Enter" && playSong(e)} title="Çal">
          <strong title={song.title}>{song.title || "İsimsiz şarkı"}</strong>
          <span title={artist}>{artist}</span>

          <div className="hm-song-meta">
            <i className={`hm-source hm-source-${song.source_type}`}>{sourceLabel}</i>
            {song.album && <em>{song.album}</em>}
            {song.year && <em>{song.year}</em>}
            {!song.is_downloadable && <em>Link-only</em>}
          </div>
        </div>

        <div className="hm-song-actions">
          <button type="button" className="hm-song-btn hm-song-play" onClick={playSong} aria-label="Çal" title="Çal">
            {playing && player.playing ? "❚❚" : "▶"}
          </button>

          <button type="button" className={`hm-song-btn hm-song-heart ${liked ? "on" : ""}`} onClick={toggleFav} aria-label="Favori" title="Favori">
            {liked ? "♥" : "♡"}
            {likeCount > 0 && <small>{likeCount}</small>}
          </button>

          <div className="hm-song-menu-wrap">
            <button type="button" className="hm-song-btn hm-song-dots" onClick={toggleMenu} aria-label="Menü" title="Menü">⋯</button>

            {menu && (
              <div className="hm-song-menu" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={openDetails}>Detay / yorum / playlist</button>

                {song.is_downloadable && !isOffline && (
                  <button type="button" onClick={saveOffline} disabled={busy}>{busy ? "İndiriliyor..." : "Offline indir"}</button>
                )}

                {isOffline && <button type="button" onClick={removeOffline}>Offline'dan kaldır</button>}
                {!song.is_downloadable && <div className="hm-song-note">Bu kaynak offline indirilemez</div>}

                {song.source_url && (
                  <a href={song.source_url} target="_blank" rel="noreferrer" onClick={() => setMenu(false)}>Harici dinle ↗</a>
                )}

                {inPlaylist && <button type="button" onClick={removeFromPlaylist}>Playlistten çıkar</button>}
                <button type="button" className="danger" onClick={del}>Sil</button>
              </div>
            )}
          </div>
        </div>
      </article>

      {details && <SongDetails song={song} onClose={() => setDetails(false)} onChanged={onChanged} />}
    </>
  );
}
