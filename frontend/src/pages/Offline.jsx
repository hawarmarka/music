import { useState, useEffect } from "react";
import { offline } from "../lib/offline";
import { usePlayer } from "../lib/player";

export default function Offline({ online }) {
  const player = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);

    offline
      .list()
      .then((s) => {
        setSongs(s || []);
      })
      .catch(() => {
        setSongs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function play(song) {
    const rec = await offline.get(song.id);
    if (rec) player.playSong(rec, songs);
  }

  async function remove(id) {
    await offline.remove(id);
    load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Offline müzik</h1>
        {!online && (
          <span className="tb-offline">
            Çevrimdışısın — sadece kayıtlı şarkılar çalınabilir
          </span>
        )}
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : songs.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">♪</div>
          <h3>Offline şarkı yok</h3>
          <p>
            Bir şarkı kartındaki menüden “Offline indir” diyerek buraya
            ekleyebilirsin.
          </p>
        </div>
      ) : (
        <div className="offline-list">
          {songs.map((s) => (
            <div key={s.id} className="off-row glass">
              <div className="off-cover" style={{ background: s.cover_gradient }}>
                ♪
              </div>

              <div className="off-text" onClick={() => play(s)}>
                <strong>{s.title}</strong>
                <span>{s.artist || s.uploaded_by_name}</span>
              </div>

              <button type="button" className="off-play" onClick={() => play(s)}>
                Çal
              </button>

              <button type="button" className="off-del" onClick={() => remove(s.id)}>
                Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
