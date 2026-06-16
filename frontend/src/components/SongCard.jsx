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

function SongCover({ song, className = "" }) {
  const token = encodeURIComponent(getToken() || "");

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
    <div className={`cover-grad ${className}`} style={{ background: song.cover_gradient }}>
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
        <button type="button" className="modal-x" onClick={onClose} aria-label="Kapat">
          ✕
        </button>

        <div className="modal-head">
          <div className="modal-cover">
            <SongCover song={song} />
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

            {!song.is_downloadable && (
              <span className="tb-offline">Link-only · offline indirilemez</span>
            )}
          </div>
        </div>

        <div className="detail-grid">
          <section>
            <h3>Şarkı bilgileri</h3>

            <div className="detail-fields">
              <input
                className="f-input"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="Başlık"
              />

              <input
                className="f-input"
                value={edit.artist}
                onChange={(e) => setEdit({ ...edit, artist: e.target.value })}
                placeholder="Sanatçı"
              />

              <input
                className="f-input"
                value={edit.album}
                onChange={(e) => setEdit({ ...edit, album: e.target.value })}
                placeholder="Albüm"
              />

              <input
                className="f-input"
                value={edit.genre}
                onChange={(e) => setEdit({ ...edit, genre: e.target.value })}
                placeholder="Tür"
              />

              <input
                className="f-input"
                value={edit.year || ""}
                onChange={(e) => setEdit({ ...edit, year: e.target.value })}
                placeholder="Yıl"
              />

              <select
                className="f-input"
                value={edit.visibility}
                onChange={(e) => setEdit({ ...edit, visibility: e.target.value })}
              >
                <option value="family">Aile ile paylaş</option>
                <option value="private">Özel</option>
              </select>
            </div>

            <button type="button" className="btn btn-grad" onClick={saveEdit}>
              Kaydet
            </button>

            {msg && <div className="ok-box modal-msg">{msg}</div>}
          </section>

          <section>
            <h3>Playlist'e ekle</h3>

            <select
              className="f-input"
              onChange={(e) => addToPlaylist(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                Playlist seç
              </option>

              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.share === "family" ? "aile" : "özel"})
                </option>
              ))}
            </select>

            <h3 style={{ marginTop: "1rem" }}>Aile tepkileri</h3>

            <div className="emoji-row">
              {EMOJIS.map((emoji) => {
                const r = reactions.find((x) => x.emoji === emoji);

                return (
                  <button
                    type="button"
                    key={emoji}
                    className={r?.mine ? "emoji on" : "emoji"}
                    onClick={() => react(emoji)}
                  >
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
                <div key={c.id} className="comment-row">
                  <strong>{c.author}</strong>
                  <span>{c.text}</span>
                </div>
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

            <button type="button" className="btn btn-grad" onClick={addComment}>
              Gönder
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SongCard({
  song,
  list,
  onChanged,
  inPlaylist,
  onRemoveFromPlaylist,
}) {
  const player = usePlayer();

  const [liked, setLiked] = useState(song.liked);
  const [likeCount, setLikeCount] = useState(song.like_count || 0);
  const [isOffline, setIsOffline] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    let alive = true;

    offline.has(song.id).then((r) => {
      if (alive) setIsOffline(r);
    });

    return () => {
      alive = false;
    };
  }, [song.id]);

  const playing = player.current?.id === song.id;

  const artist = song.artist || `Ekleyen: ${song.uploaded_by_name || "HawarMusic"}`;
  const sourceLabel = SRC_LABEL[song.source_type] || "Bağlantı";

  function playSong(e) {
    e.stopPropagation();
    player.playSong(song, list);
  }

  async function toggleFav(e) {
    e.stopPropagation();

    try {
      const r = await api.favorite(song.id);
      setLiked(r.liked);
      setLikeCount(r.like_count || 0);
    } catch {}
  }

  async function saveOffline(e) {
    e.stopPropagation();
    setMenu(false);

    if (!song.is_downloadable) return;

    setBusy(true);

    try {
      const res = await fetch(`${api.streamUrl(song.id)}?t=${encodeURIComponent(getToken() || "")}`);
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
    e.stopPropagation();
    setMenu(false);

    await offline.remove(song.id);
    await api.offlineRemove(song.id).catch(() => {});

    setIsOffline(false);
  }

  async function del(e) {
    e.stopPropagation();
    setMenu(false);

    if (!confirm("Bu şarkı silinsin mi?")) return;

    try {
      await api.deleteSong(song.id);
      onChanged?.();
    } catch (err) {
      alert(err.message || "Şarkı silinemedi.");
    }
  }

  function openDetails(e) {
    e.stopPropagation();
    setMenu(false);
    setDetails(true);
  }

  return (
    <>
      <article className={`song-card song-list-row ${playing ? "is-playing" : ""}`}>
        <div className="sc-art" onClick={playSong} title="Çal">
          <SongCover song={song} />

          {isOffline && (
            <span className="sc-offline" title="Offline kayıtlı">
              ⤓
            </span>
          )}
        </div>

        <div className="sc-body">
          <div className="sc-titles" onClick={playSong}>
            <strong title={song.title}>{song.title}</strong>
            <span title={artist}>{artist}</span>
          </div>

          <div className="sc-meta-line">
            <span className={`sc-meta-pill sc-${song.source_type}`}>
              {sourceLabel}
            </span>

            {song.album && <span>{song.album}</span>}
            {song.year && <span>{song.year}</span>}
            {!song.is_downloadable && <span>Link-only</span>}
          </div>
        </div>

        <div className="sc-actions">
          <button
            type="button"
            className="sc-play"
            onClick={playSong}
            aria-label="Çal"
            title="Çal"
          >
            {playing && player.playing ? "❚❚" : "▶"}
          </button>

          <button
            type="button"
            className={`sc-heart ${liked ? "on" : ""}`}
            onClick={toggleFav}
            aria-label="Favori"
            title="Favori"
          >
            {liked ? "♥" : "♡"}
            {likeCount > 0 && <i>{likeCount}</i>}
          </button>

          <div className="sc-menu-wrap">
            <button
              type="button"
              className="sc-dots"
              onClick={(e) => {
                e.stopPropagation();
                setMenu(!menu);
              }}
              aria-label="Menü"
              title="Menü"
            >
              ⋯
            </button>

            {menu && (
              <div className="sc-menu" onMouseLeave={() => setMenu(false)}>
                <button type="button" onClick={openDetails}>
                  Detay / yorum / playlist
                </button>

                {song.is_downloadable && !isOffline && (
                  <button type="button" onClick={saveOffline} disabled={busy}>
                    {busy ? "İndiriliyor..." : "Offline indir"}
                  </button>
                )}

                {isOffline && (
                  <button type="button" onClick={removeOffline}>
                    Offline'dan kaldır
                  </button>
                )}

                {!song.is_downloadable && (
                  <div className="sc-note">Bu kaynak offline indirilemez</div>
                )}

                {song.source_url && (
                  <a
                    href={song.source_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenu(false)}
                  >
                    Harici dinle ↗
                  </a>
                )}

                {inPlaylist && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(false);
                      onRemoveFromPlaylist?.(song.id);
                    }}
                  >
                    Playlistten çıkar
                  </button>
                )}

                <button type="button" className="m-danger" onClick={del}>
                  Sil
                </button>
              </div>
            )}
          </div>
        </div>
      </article>

      {details && (
        <SongDetails
          song={song}
          onClose={() => setDetails(false)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}
