import { useState } from "react";
import { api } from "../lib/api";

export default function Import({ onDone }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const cleanUrl = url.trim();

  async function submitDownload() {
    setErr("");
    setMsg("");

    if (!cleanUrl) {
      setErr("Lütfen bir link gir.");
      return;
    }

    setBusy(true);

    try {
      const r = await api.metubeImport({
        url: cleanUrl,
        title: "",
        artist: "",
        license_confirmed: true,
        visibility: "family",
      });

      setMsg(r.notice || "Şarkı indirildi ve kütüphaneye eklendi.");

      if (r.id) {
        setUrl("");

        setTimeout(() => {
          if (onDone) onDone();
        }, 800);
      }
    } catch (e) {
      setErr(e.message || "İndirme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-page">
      <div className="page-head">
        <h1>Linkten indir</h1>
      </div>

      <div className="import-card glass">
        <label className="f-block">
          <span className="f-label">Video, müzik veya playlist linki</span>

          <input
            className="f-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube / video / müzik linki yapıştır"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitDownload();
            }}
          />
        </label>

        {err && <div className="error-box">{err}</div>}
        {msg && <div className="ok-box">{msg}</div>}

        <button
          type="button"
          className="btn btn-grad metube-main-btn"
          onClick={submitDownload}
          disabled={busy || !cleanUrl}
        >
          {busy ? "İndiriliyor..." : "İndir ve kütüphaneye ekle"}
        </button>
      </div>
    </div>
  );
}import { useState } from "react";
import { api } from "../lib/api";

export default function Import({ onDone }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const cleanUrl = url.trim();

  async function submitMetube() {
    setErr("");
    setMsg("");

    if (!cleanUrl) {
      setErr("Lütfen bir link gir.");
      return;
    }

    setBusy(true);

    try {
      const r = await api.metubeImport({
        url: cleanUrl,
        title: "",
        artist: "",
        license_confirmed: true,
        visibility: "family",
      });

      setMsg(r.notice || "MeTube indirdi ve kütüphaneye eklendi.");

      if (r.id) {
        setUrl("");

        setTimeout(() => {
          if (onDone) onDone();
        }, 800);
      }
    } catch (e) {
      setErr(e.message || "MeTube bağlantısı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-page">
      <div className="page-head">
        <h1>MeTube ile indir</h1>
      </div>

      <div className="import-card glass">
        <label className="f-block">
          <span className="f-label">Video, müzik veya playlist linki</span>

          <input
            className="f-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube / video / müzik linki yapıştır"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitMetube();
            }}
          />
        </label>

        {err && <div className="error-box">{err}</div>}
        {msg && <div className="ok-box">{msg}</div>}

        <button
          type="button"
          className="btn btn-grad metube-main-btn"
          onClick={submitMetube}
          disabled={busy || !cleanUrl}
        >
          {busy ? "İndiriliyor..." : "MeTube ile indir"}
        </button>
      </div>
    </div>
  );
}
