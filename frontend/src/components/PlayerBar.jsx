import { useState } from "react";
import { usePlayer } from "../lib/player";
import { getToken } from "../lib/api";

const fmt = (s) => isNaN(s) ? "0:00" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function PlayerBar() {
  const p = usePlayer();
  const [expanded, setExpanded] = useState(false);
  if (!p.current && !p.embedTrack) return null;

  const song = p.current;
  const isEmbed = song?.source_type === "youtube" || song?.source_type === "spotify";

  // Embed çalar (YouTube/Spotify iframe)
  if (isEmbed && p.embedTrack) {
    const src = song.source_type === "youtube" ? `${song.external_embed}?autoplay=1` : song.external_embed;
    return (
      <div className="player-bar embed-bar">
        <div className="pb-meta">
          <div className="pb-cover" style={{ background: song.cover_gradient }}>♪</div>
          <div className="pb-text"><strong>{song.title}</strong><span>{song.artist || song.uploaded_by_name}</span></div>
        </div>
        <iframe className="pb-embed" title={song.title} src={src}
          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture" allowFullScreen />
        <button className="pb-icon" onClick={p.closeEmbed} aria-label="Kapat">✕</button>
      </div>
    );
  }

  const cover = song.cover_url
    ? <img src={`${song.cover_url}?t=${encodeURIComponent(getToken() || "")}`} alt="" />
    : <div className="pb-cover" style={{ background: song.cover_gradient }}>♪</div>;

  const Controls = ({ big = false }) => (
    <>
      <div className={big ? "pb-buttons big" : "pb-buttons"}>
        <button className={`pb-sm ${p.shuffle ? "on" : ""}`} onClick={p.toggleShuffle} aria-label="Karıştır" title="Karıştır">⤮</button>
        <button className="pb-sm" onClick={p.prev} aria-label="Önceki">⏮</button>
        <button className="pb-play" onClick={p.toggle} aria-label={p.playing ? "Duraklat" : "Çal"}>{p.playing ? "❚❚" : "▶"}</button>
        <button className="pb-sm" onClick={p.next} aria-label="Sonraki">⏭</button>
        <button className={`pb-sm ${p.repeat !== "off" ? "on" : ""}`} onClick={p.cycleRepeat} aria-label="Tekrar" title={`Tekrar: ${p.repeat}`}>
          {p.repeat === "one" ? "🔂" : "🔁"}
        </button>
      </div>
      <div className="pb-progress">
        <span className="pb-t">{fmt(p.progress)}</span>
        <div className="pb-line" onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          p.seek(((e.clientX - r.left) / r.width) * p.duration);
        }}>
          <div className="pb-fill" style={{ width: `${p.duration ? (p.progress / p.duration) * 100 : 0}%` }} />
        </div>
        <span className="pb-t">{fmt(p.duration)}</span>
      </div>
    </>
  );

  return (
    <>
      <div className="player-bar">
        <div className="pb-meta" onClick={() => setExpanded(true)}>
          <div className="pb-cover-wrap">{cover}</div>
          <div className="pb-text"><strong>{song.title}</strong><span>{song.artist || song.uploaded_by_name}</span></div>
        </div>

        <div className="pb-center"><Controls /></div>

        <div className="pb-right">
          <button className="pb-icon" onClick={() => setExpanded(true)} title="Tam ekran">⤢</button>
          <span className="pb-vol-icon">🔊</span>
          <input className="pb-vol" type="range" min="0" max="1" step="0.05" value={p.volume}
            onChange={(e) => p.setVol(parseFloat(e.target.value))} aria-label="Ses" />
        </div>
      </div>

      {expanded && (
        <div className="full-player" onClick={() => setExpanded(false)}>
          <div className="full-card glass" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" onClick={() => setExpanded(false)}>✕</button>
            <div className="full-cover">{cover}</div>
            <p className="hero-eyebrow">Şimdi çalıyor</p>
            <h2>{song.title}</h2>
            <p className="hero-sub">{song.artist || song.uploaded_by_name}</p>
            <Controls big />
            <div className="full-volume"><span>🔊</span><input className="pb-vol" type="range" min="0" max="1" step="0.05" value={p.volume} onChange={(e) => p.setVol(parseFloat(e.target.value))} /></div>
            <div className="queue-list">
              <strong>Sıradaki</strong>
              {p.queue.slice(p.index + 1, p.index + 6).map((q) => <button key={q.id} onClick={() => p.playSong(q, p.queue)}>{q.title}<span>{q.artist}</span></button>)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
