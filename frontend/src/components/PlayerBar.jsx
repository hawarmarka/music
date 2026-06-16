import { useState } from "react";
import { usePlayer } from "../lib/player";
import { getToken } from "../lib/api";

const fmt = (s) => {
  if (!s || isNaN(s)) return "0:00";

  const minutes = Math.floor(s / 60);
  const seconds = String(Math.floor(s % 60)).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

export default function PlayerBar() {
  const p = usePlayer();
  const [expanded, setExpanded] = useState(false);

  const song = p.current || p.embedTrack;

  if (!song) return null;

  const isEmbed =
    Boolean(p.embedTrack) &&
    (song.source_type === "youtube" || song.source_type === "spotify");

  const title = song.title || "Bilinmeyen şarkı";
  const artist = song.artist || song.uploaded_by_name || "HawarMusic";

  const progressPercent = p.duration
    ? Math.min(100, Math.max(0, (p.progress / p.duration) * 100))
    : 0;

  function seekByClick(e) {
    if (!p.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

    p.seek(ratio * p.duration);
  }

  function renderCover(size = "normal") {
    if (song.cover_url) {
      return (
        <img
          src={`${song.cover_url}?t=${encodeURIComponent(getToken() || "")}`}
          alt=""
          draggable="false"
        />
      );
    }

    return (
      <div
        className={`pb-cover ${size === "large" ? "pb-cover-large" : ""}`}
        style={{ background: song.cover_gradient }}
      >
        ♪
      </div>
    );
  }

  function Controls({ big = false }) {
    return (
      <div className={big ? "pb-controls-wrap big" : "pb-controls-wrap"}>
        <div className={big ? "pb-buttons big" : "pb-buttons"}>
          <button
            type="button"
            className={`pb-sm ${p.shuffle ? "on" : ""}`}
            onClick={p.toggleShuffle}
            aria-label="Karıştır"
            title="Karıştır"
          >
            ⤮
          </button>

          <button
            type="button"
            className="pb-sm"
            onClick={p.prev}
            aria-label="Önceki"
            title="Önceki"
          >
            ⏮
          </button>

          <button
            type="button"
            className="pb-play"
            onClick={p.toggle}
            aria-label={p.playing ? "Duraklat" : "Çal"}
            title={p.playing ? "Duraklat" : "Çal"}
          >
            {p.playing ? "❚❚" : "▶"}
          </button>

          <button
            type="button"
            className="pb-sm"
            onClick={p.next}
            aria-label="Sonraki"
            title="Sonraki"
          >
            ⏭
          </button>

          <button
            type="button"
            className={`pb-sm ${p.repeat !== "off" ? "on" : ""}`}
            onClick={p.cycleRepeat}
            aria-label="Tekrar"
            title={`Tekrar: ${p.repeat}`}
          >
            {p.repeat === "one" ? "🔂" : "🔁"}
          </button>
        </div>

        <div className="pb-progress">
          <span className="pb-t">{fmt(p.progress)}</span>

          <div
            className="pb-line"
            onClick={seekByClick}
            role="slider"
            aria-label="Şarkı ilerleme"
            aria-valuemin="0"
            aria-valuemax={Math.floor(p.duration || 0)}
            aria-valuenow={Math.floor(p.progress || 0)}
          >
            <div className="pb-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <span className="pb-t">{fmt(p.duration)}</span>
        </div>
      </div>
    );
  }

  // YouTube / Spotify iframe player
  if (isEmbed) {
    const src =
      song.source_type === "youtube"
        ? `${song.external_embed}?autoplay=1`
        : song.external_embed;

    return (
      <div className="player-bar embed-bar">
        <div className="pb-meta" onClick={() => setExpanded(true)}>
          <div className="pb-cover-wrap">{renderCover()}</div>

          <div className="pb-text">
            <strong>{title}</strong>
            <span>{artist}</span>
          </div>
        </div>

        <iframe
          className="pb-embed"
          title={title}
          src={src}
          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
          allowFullScreen
        />

        <button
          type="button"
          className="pb-icon"
          onClick={p.closeEmbed}
          aria-label="Kapat"
          title="Kapat"
        >
          ✕
        </button>
      </div>
    );
  }

  const nextQueue = Array.isArray(p.queue)
    ? p.queue.slice((p.index || 0) + 1, (p.index || 0) + 6)
    : [];

  return (
    <>
      <div className="player-bar">
        <div className="pb-meta" onClick={() => setExpanded(true)}>
          <div className="pb-cover-wrap">{renderCover()}</div>

          <div className="pb-text">
            <strong>{title}</strong>
            <span>{artist}</span>
          </div>
        </div>

        <div className="pb-center">
          <Controls />
        </div>

        <div className="pb-right">
          <button
            type="button"
            className="pb-icon"
            onClick={() => setExpanded(true)}
            title="Tam ekran"
            aria-label="Tam ekran"
          >
            ⤢
          </button>

          <span className="pb-vol-icon">🔊</span>

          <input
            className="pb-vol"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={p.volume}
            onChange={(e) => p.setVol(parseFloat(e.target.value))}
            aria-label="Ses"
          />
        </div>

        <div className="pb-mobile-controls">
          <button
            type="button"
            className="pb-sm"
            onClick={p.prev}
            aria-label="Önceki"
          >
            ⏮
          </button>

          <button
            type="button"
            className="pb-play"
            onClick={p.toggle}
            aria-label={p.playing ? "Duraklat" : "Çal"}
          >
            {p.playing ? "❚❚" : "▶"}
          </button>

          <button
            type="button"
            className="pb-sm"
            onClick={p.next}
            aria-label="Sonraki"
          >
            ⏭
          </button>
        </div>
      </div>

      {expanded && (
        <div className="full-player" onClick={() => setExpanded(false)}>
          <div className="full-card glass" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-x"
              onClick={() => setExpanded(false)}
              aria-label="Kapat"
            >
              ✕
            </button>

            <div className="full-cover">{renderCover("large")}</div>

            <p className="hero-eyebrow">Şimdi çalıyor</p>

            <h2>{title}</h2>

            <p className="hero-sub">{artist}</p>

            <Controls big />

            <div className="full-volume">
              <span>🔊</span>

              <input
                className="pb-vol"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={p.volume}
                onChange={(e) => p.setVol(parseFloat(e.target.value))}
                aria-label="Ses"
              />
            </div>

            <div className="queue-list">
              <strong>Sıradaki</strong>

              {nextQueue.length === 0 && (
                <span className="queue-empty">Sırada başka şarkı yok.</span>
              )}

              {nextQueue.map((q) => (
                <button
                  type="button"
                  key={q.id}
                  onClick={() => p.playSong(q, p.queue)}
                >
                  <span>{q.title}</span>
                  <i>{q.artist || q.uploaded_by_name || "HawarMusic"}</i>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
