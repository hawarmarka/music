import { useState, useRef } from "react";
import { api } from "../lib/api";

export default function Upload({ onDone }) {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  function addFiles(list) {
    const arr = Array.from(list).map((f) => ({
      file: f, title: f.name.replace(/\.[^.]+$/, ""), artist: "", album: "",
      genre: "", year: "", status: "bekliyor",
    }));
    setFiles((prev) => [...prev, ...arr]);
  }

  function upd(i, k, v) { setFiles((p) => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f)); }
  function remove(i) { setFiles((p) => p.filter((_, idx) => idx !== i)); }

  async function uploadAll() {
    setBusy(true);
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      upd(i, "status", "yükleniyor");
      const fd = new FormData();
      fd.append("file", f.file);
      fd.append("title", f.title);
      fd.append("artist", f.artist);
      fd.append("album", f.album);
      fd.append("genre", f.genre);
      if (f.year) fd.append("year", f.year);
      try { await api.upload(fd); upd(i, "status", "tamam ✓"); out.push(f.title); }
      catch (e) { upd(i, "status", "hata: " + e.message); }
    }
    setResults(out);
    setBusy(false);
    if (out.length) setTimeout(onDone, 900);
  }

  return (
    <div className="upload-page">
      <div className="page-head"><h1>Şarkı yükle</h1></div>
      <div className={`dropzone ${drag ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current.click()}>
        <input ref={inputRef} type="file" multiple accept=".mp3,.m4a,.wav,.flac,.ogg,.aac,audio/*"
          hidden onChange={(e) => addFiles(e.target.files)} />
        <div className="dz-ic">⤴</div>
        <strong>Dosyaları sürükle bırak</strong>
        <span>veya tıklayıp seç · MP3, M4A, WAV, FLAC, OGG</span>
      </div>

      {files.length > 0 && (
        <div className="up-list">
          {files.map((f, i) => (
            <div key={i} className="up-row glass">
              <div className="up-fields">
                <input className="f-input" value={f.title} onChange={(e) => upd(i, "title", e.target.value)} placeholder="Başlık" />
                <input className="f-input" value={f.artist} onChange={(e) => upd(i, "artist", e.target.value)} placeholder="Sanatçı" />
                <input className="f-input" value={f.album} onChange={(e) => upd(i, "album", e.target.value)} placeholder="Albüm" />
                <input className="f-input" value={f.genre} onChange={(e) => upd(i, "genre", e.target.value)} placeholder="Tür" />
                <input className="f-input up-year" value={f.year} onChange={(e) => upd(i, "year", e.target.value)} placeholder="Yıl" />
              </div>
              <div className="up-status">{f.status}</div>
              {!busy && <button className="up-x" onClick={() => remove(i)}>✕</button>}
            </div>
          ))}
          <button className="btn btn-grad" onClick={uploadAll} disabled={busy}>
            {busy ? "Yükleniyor..." : `${files.length} şarkıyı yükle`}
          </button>
        </div>
      )}
    </div>
  );
}
