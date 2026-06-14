import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { api, getToken } from "./api";
import { offline } from "./offline";

const PlayerCtx = createContext(null);
export const usePlayer = () => useContext(PlayerCtx);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);     // çalma sırası (şarkı listesi)
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off"); // off | all | one
  const [embedTrack, setEmbedTrack] = useState(null); // youtube/spotify => iframe

  const a = audioRef.current;

  // Ses kaynağını çöz: önce offline blob, yoksa stream (+token query)
  const resolveSrc = useCallback(async (song) => {
    const localUrl = song._localUrl;
    if (localUrl) return localUrl;
    const has = await offline.has(song.id).catch(() => false);
    if (has) {
      const rec = await offline.get(song.id);
      if (rec?._localUrl) return rec._localUrl;
    }
    // çevrimiçi stream — token'ı query ile geçir (audio elementi header gönderemez)
    return `${api.streamUrl(song.id)}?t=${encodeURIComponent(getToken() || "")}`;
  }, []);

  const playSong = useCallback(async (song, list = null) => {
    if (list) {
      setQueue(list);
      setIndex(list.findIndex((s) => s.id === song.id));
    }
    // embed (youtube/spotify) — iframe ile çal, audio'yu durdur
    if (song.source_type === "youtube" || song.source_type === "spotify") {
      a.pause();
      setPlaying(false);
      setCurrent(song);
      setEmbedTrack(song);
      return;
    }
    setEmbedTrack(null);
    setCurrent(song);
    const src = await resolveSrc(song);
    a.src = src;
    a.volume = volume;
    try { await a.play(); setPlaying(true); } catch { setPlaying(false); }
  }, [a, volume, resolveSrc]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    let ni;
    if (shuffle) ni = Math.floor(Math.random() * queue.length);
    else ni = index + 1 >= queue.length ? (repeat === "all" ? 0 : -1) : index + 1;
    if (ni === -1) { setPlaying(false); return; }
    setIndex(ni);
    playSong(queue[ni]);
  }, [queue, index, shuffle, repeat, playSong]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    if (a.currentTime > 3) { a.currentTime = 0; return; }
    const pi = index - 1 < 0 ? 0 : index - 1;
    setIndex(pi);
    playSong(queue[pi]);
  }, [queue, index, a, playSong]);

  const toggle = useCallback(() => {
    if (!current) return;
    if (current.source_type === "youtube" || current.source_type === "spotify") return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  }, [a, current]);

  const seek = useCallback((sec) => { if (a.duration) a.currentTime = sec; }, [a]);
  const setVol = useCallback((v) => { a.volume = v; setVolume(v); }, [a]);

  // audio olayları
  useEffect(() => {
    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      if (repeat === "one") { a.currentTime = 0; a.play(); return; }
      next();
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", () => setPlaying(true));
    a.addEventListener("pause", () => setPlaying(false));
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [a, next, repeat]);

  // klavye kısayolları
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "ArrowRight" && e.shiftKey) next();
      if (e.code === "ArrowLeft" && e.shiftKey) prev();
      if (e.code === "ArrowRight" && !e.shiftKey) seek(a.currentTime + 5);
      if (e.code === "ArrowLeft" && !e.shiftKey) seek(a.currentTime - 5);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, next, prev, seek, a]);

  const value = {
    current, queue, index, playing, progress, duration, volume,
    shuffle, repeat, embedTrack,
    playSong, next, prev, toggle, seek, setVol,
    toggleShuffle: () => setShuffle((s) => !s),
    cycleRepeat: () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    closeEmbed: () => { setEmbedTrack(null); setCurrent(null); },
  };
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}
