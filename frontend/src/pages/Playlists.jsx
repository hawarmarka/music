import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { usePlayer } from "../lib/player";
import SongCard from "../components/SongCard";

export default function Playlists() {
  const player = usePlayer();

  const [lists, setLists] = useState([]);
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [err, setErr] = useState("");

  const [newName, setNewName] = useState("");
  const [newShare, setNewShare] = useState("family");

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const data = await api.playlists();
      setLists(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Playlistler alınamadı.");
      setLists([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail() {
    if (!active) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    setErr("");

    try {
      const data = await api.playlist(active);
      setDetail(data);
    } catch (e) {
      setErr(e.message || "Playlist açılırken hata oluştu.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadDetail();
  }, [active]);

  const sortedLists = useMemo(() => {
    return [...lists].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [lists]);

  async function create(e) {
    e?.preventDefault();

    const name = newName.trim();

    if (!name) {
      setErr("Playlist adı boş olamaz.");
      return;
    }

    setErr("");

    try {
      const created = await api.createPlaylist({
        name,
        share: newShare,
      });

      setNewName("");
      setNewShare("family");

      await load();

      if (created?.id) {
        setActive(created.id);
      }
    } catch (e2) {
      setErr(e2.message || "Playlist oluşturulamadı.");
    }
  }

  async function del(id) {
    if (!confirm("Playlist silinsin mi?")) return;

    setErr("");

    try {
      await api.deletePlaylist(id);
      setActive(null);
      setDetail(null);
      await load();
    } catch (e) {
      setErr(e.message || "Playlist silinemedi.");
    }
  }

  async function removeSong(songId) {
    if (!detail?.id) return;

    setErr("");

    try {
      await api.playlistRemove(detail.id, songId);
      await loadDetail();
      await load();
    } catch (e) {
      setErr(e.message || "Şarkı playlistten çıkarılamadı.");
    }
  }

  async function dropOn(targetId) {
    if (!dragId || dragId === targetId || !detail?.songs) return;

    const arr = [...detail.songs];
    const from = arr.findIndex((s) => s.id === dragId);
    const to = arr.findIndex((s) => s.id === targetId);

    if (from < 0 || to < 0) return;

    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);

    setDetail({ ...detail, songs: arr });
    setDragId(null);

    try {
      await api.playlistReorder(
        detail.id,
        arr.map((s) => s.id)
      );
    } catch (e) {
      setErr(e.message || "Sıralama kaydedilemedi.");
      loadDetail();
    }
  }

  function playPlaylist() {
    if (!detail?.songs?.length) return;
    player.playSong(detail.songs[0], detail.songs);
  }

  if (active) {
    return (
      <div className="playlist-detail-page">
        <div className="page-head playlist-detail-top">
          <button
            type="button"
            className="back-btn"
            onClick={() => {
              setActive(null);
              setDetail(null);
              setErr("");
            }}
          >
            ← Geri
          </button>
        </div>

        {err && <div className="error-box">{err}</div>}

        {detailLoading || !detail ? (
          <div className="home-loading glass">
            <div className="loading-wave">≡</div>
            <strong>Playlist yükleniyor...</strong>
            <span>Şarkılar hazırlanıyor.</span>
          </div>
        ) : (
          <>
            <section className="playlist-detail-hero glass">
              <div
                className="playlist-detail-cover"
                style={{ background: detail.cover_gradient }}
              >
                ≡
              </div>

              <div className="playlist-detail-info">
                <p className="hero-eyebrow">
                  {detail.share === "family" ? "Aile playlisti" : "Özel playlist"}
                </p>

                <h1>{detail.name}</h1>

                <p className="hero-sub">
                  {detail.songs?.length || 0} şarkı · {detail.owner_name || "HawarMusic"}
                </p>

                <div className="playlist-detail-actions">
                  <button
                    type="button"
                    className="btn btn-grad"
                    onClick={playPlaylist}
                    disabled={!detail.songs?.length}
                  >
                    ▶ Playlisti çal
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => del(detail.id)}
                  >
                    Playlisti sil
                  </button>
                </div>
              </div>
            </section>

            {detail.songs?.length === 0 ? (
              <div className="empty playlist-empty glass">
                <div className="empty-ic">♪</div>
                <h3>Bu playlist boş</h3>
                <p>Şarkı kartlarındaki üç nokta menüsünden playlist'e ekleyebilirsin.</p>
              </div>
            ) : (
              <>
                <p className="muted-note playlist-note">
                  Sıralamak için kartı tutup başka kartın üstüne bırak.
                </p>

                <div className="grid playlist-song-list">
                  {detail.songs.map((s) => (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => setDragId(s.id)}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropOn(s.id)}
                      className={`drag-wrap ${dragId === s.id ? "dragging" : ""}`}
                    >
                      <SongCard
                        song={s}
                        list={detail.songs}
                        inPlaylist
                        onRemoveFromPlaylist={removeSong}
                        onChanged={loadDetail}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="playlists-page">
      <div className="page-head playlists-head">
        <div>
          <p className="hero-eyebrow">Playlistler</p>
          <h1>Aile listeleri</h1>
          <span className="playlists-sub">{lists.length} playlist mevcut</span>
        </div>
      </div>

      <form className="playlist-create glass" onSubmit={create}>
        <div>
          <strong>Yeni playlist oluştur</strong>
          <span>Şarkıları aileyle paylaşmak veya özel saklamak için liste oluştur.</span>
        </div>

        <input
          className="f-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Playlist adı"
        />

        <select
          className="f-input"
          value={newShare}
          onChange={(e) => setNewShare(e.target.value)}
        >
          <option value="family">Aile ile paylaş</option>
          <option value="private">Özel</option>
        </select>

        <button type="submit" className="btn btn-grad">
          + Oluştur
        </button>
      </form>

      {err && <div className="error-box">{err}</div>}

      {loading ? (
        <div className="home-loading glass">
          <div className="loading-wave">≡</div>
          <strong>Playlistler yükleniyor...</strong>
          <span>Listelerin hazırlanıyor.</span>
        </div>
      ) : sortedLists.length === 0 ? (
        <div className="empty playlist-empty glass">
          <div className="empty-ic">♪</div>
          <h3>Playlist yok</h3>
          <p>İlk playlistini oluşturup sevdiğin şarkıları içine ekle.</p>
        </div>
      ) : (
        <div className="playlist-list">
          {sortedLists.map((p) => (
            <button
              key={p.id}
              type="button"
              className="playlist-item glass"
              onClick={() => setActive(p.id)}
            >
              <div
                className="playlist-item-cover"
                style={{ background: p.cover_gradient }}
              >
                ≡
              </div>

              <div className="playlist-item-info">
                <strong>{p.name}</strong>

                <span>
                  {p.song_count || 0} şarkı · {p.share === "family" ? "aile" : "özel"}
                </span>
              </div>

              <i>›</i>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
