import { useRef, useState } from "react";
import { api } from "../lib/api";

const ACCEPTED_AUDIO = ".mp3,.m4a,.wav,.flac,.ogg,.aac,audio/*";

function sizeFmt(bytes) {
  if (!bytes) return "0 MB";

  const mb = bytes / 1024 / 1024;

  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;

  return `${mb.toFixed(1)} MB`;
}

function cleanTitle(name) {
  return String(name || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeItem(file) {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
    file,
    title: cleanTitle(file.name),
    artist: "",
    album: "",
    genre: "",
    year: "",
    status: "bekliyor",
    error: "",
  };
}

export default function Upload({ onDone }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const inputRef = useRef(null);

  function addFiles(list) {
    const incoming = Array.from(list || []);

    if (!incoming.length) return;

    const audioFiles = incoming.filter((f) => {
      return f.type?.startsWith("audio/") || /\.(mp3|m4a|wav|flac|ogg|aac)$/i.test(f.name);
    });

    if (!audioFiles.length) {
      setErr("Sadece ses dosyası seçebilirsin: MP3, M4A, WAV, FLAC, OGG, AAC.");
      return;
    }

    setErr("");
    setMsg("");

    setFiles((prev) => [...prev, ...audioFiles.map(makeItem)]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function updateFile(id, key, value) {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  }

  function updateStatus(id, status, error = "") {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, error } : item))
    );
  }

  function remove(id) {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  }

  function clearDone() {
    setFiles((prev) => prev.filter((item) => item.status !== "tamamlandı"));
  }

  async function uploadAll() {
    if (!files.length || busy) return;

    setBusy(true);
    setErr("");
    setMsg("");

    let success = 0;
    let failed = 0;

    for (const item of files) {
      updateStatus(item.id, "yükleniyor");

      const fd = new FormData();

      fd.append("file", item.file);
      fd.append("title", item.title || cleanTitle(item.file.name));
      fd.append("artist", item.artist || "");
      fd.append("album", item.album || "");
      fd.append("genre", item.genre || "");

      if (item.year) {
        fd.append("year", item.year);
      }

      try {
        await api.upload(fd);

        success += 1;
        updateStatus(item.id, "tamamlandı");
      } catch (e) {
        failed += 1;
        updateStatus(item.id, "hata", e.message || "Yükleme başarısız.");
      }
    }

    setBusy(false);

    if (success > 0 && failed === 0) {
      setMsg(`${success} şarkı başarıyla yüklendi.`);
      setTimeout(() => {
        onDone?.();
      }, 900);
      return;
    }

    if (success > 0 && failed > 0) {
      setMsg(`${success} şarkı yüklendi, ${failed} şarkıda hata var.`);
      return;
    }

    setErr("Hiçbir şarkı yüklenemedi.");
  }

  const waitingCount = files.filter((f) => f.status === "bekliyor").length;
  const doneCount = files.filter((f) => f.status === "tamamlandı").length;
  const errorCount = files.filter((f) => f.status === "hata").length;

  return (
    <div className="upload-page">
      <div className="page-head upload-head">
        <div>
          <p className="hero-eyebrow">Yükleme</p>
          <h1>Şarkı yükle</h1>
          <span className="upload-sub">
            MP3, M4A, WAV, FLAC, OGG veya AAC dosyalarını ekleyebilirsin.
          </span>
        </div>
      </div>

      <section
        className={`upload-drop glass ${drag ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_AUDIO}
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />

        <div className="upload-drop-icon">⤴</div>

        <div>
          <strong>Dosyaları buraya sürükle bırak</strong>
          <span>veya tıklayıp bilgisayardan seç</span>
        </div>

        <button type="button" className="btn btn-grad upload-pick-btn">
          Dosya seç
        </button>
      </section>

      {(msg || err) && (
        <div className="upload-messages">
          {msg && <div className="ok-box">{msg}</div>}
          {err && <div className="error-box">{err}</div>}
        </div>
      )}

      {files.length > 0 && (
        <>
          <section className="upload-summary glass">
            <div>
              <span>Toplam</span>
              <strong>{files.length}</strong>
            </div>

            <div>
              <span>Bekleyen</span>
              <strong>{waitingCount}</strong>
            </div>

            <div>
              <span>Tamamlanan</span>
              <strong>{doneCount}</strong>
            </div>

            <div>
              <span>Hata</span>
              <strong>{errorCount}</strong>
            </div>
          </section>

          <section className="upload-list">
            {files.map((item) => (
              <div key={item.id} className={`upload-row glass status-${item.status}`}>
                <div className="upload-file-meta">
                  <div className="upload-file-icon">♪</div>

                  <div>
                    <strong title={item.file.name}>{item.file.name}</strong>
                    <span>{sizeFmt(item.file.size)}</span>
                  </div>
                </div>

                <div className="upload-fields">
                  <input
                    className="f-input"
                    value={item.title}
                    onChange={(e) => updateFile(item.id, "title", e.target.value)}
                    placeholder="Başlık"
                    disabled={busy}
                  />

                  <input
                    className="f-input"
                    value={item.artist}
                    onChange={(e) => updateFile(item.id, "artist", e.target.value)}
                    placeholder="Sanatçı"
                    disabled={busy}
                  />

                  <input
                    className="f-input"
                    value={item.album}
                    onChange={(e) => updateFile(item.id, "album", e.target.value)}
                    placeholder="Albüm"
                    disabled={busy}
                  />

                  <input
                    className="f-input"
                    value={item.genre}
                    onChange={(e) => updateFile(item.id, "genre", e.target.value)}
                    placeholder="Tür"
                    disabled={busy}
                  />

                  <input
                    className="f-input"
                    value={item.year}
                    onChange={(e) => updateFile(item.id, "year", e.target.value)}
                    placeholder="Yıl"
                    inputMode="numeric"
                    disabled={busy}
                  />
                </div>

                <div className="upload-status">
                  <span>{item.status}</span>
                  {item.error && <i>{item.error}</i>}
                </div>

                {!busy && (
                  <button
                    type="button"
                    className="upload-remove"
                    onClick={() => remove(item.id)}
                    aria-label="Dosyayı kaldır"
                    title="Kaldır"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </section>

          <div className="upload-bottom-actions">
            {doneCount > 0 && !busy && (
              <button type="button" className="btn btn-ghost" onClick={clearDone}>
                Tamamlananları temizle
              </button>
            )}

            <button
              type="button"
              className="btn btn-grad upload-main-btn"
              onClick={uploadAll}
              disabled={busy || !files.length}
            >
              {busy ? "Yükleniyor..." : `${files.length} şarkıyı yükle`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
