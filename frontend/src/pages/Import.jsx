import { useState } from "react";
import { api } from "../lib/api";

export default function Import({ onDone }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState("");

  const cleanUrl = url.trim();

  const isDirectAudio = /\.(mp3|m4a|wav|flac|ogg|aac)(\?.*)?$/i.test(cleanUrl);

  async function submitNormal() {
    setErr("");
    setMsg(null);
    setBusy(true);

    try {
      const r = await api.importLink({
        url: cleanUrl,
        title,
        artist,
        license_confirmed: confirmed,
        visibility: "family",
      });

      setMsg(r.notice || "Şarkı koleksiyona eklendi.");
      setUrl("");
      setTitle("");
      setArtist("");
      setConfirmed(false);

      setTimeout(() => {
        if (onDone) onDone();
      }, 900);
    } catch (e) {
      setErr(e.message || "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMetube() {
    setErr("");
    setMsg(null);

    if (!confirmed) {
      setErr("Önce indirme/yükleme hakkına sahip olduğunu onayla.");
      return;
    }

    setBusy(true);

    try {
      const r = await api.metubeImport({
        url: cleanUrl,
        title,
        artist,
        license_confirmed: confirmed,
        visibility: "family",
      });

      setMsg(r.notice || "MeTube işlemi başlatıldı.");

      if (r.id) {
        setUrl("");
        setTitle("");
        setArtist("");
        setConfirmed(false);

        setTimeout(() => {
          if (onDone) onDone();
        }, 900);
      }
    } catch (e) {
      setErr(e.message || "MeTube işlemi başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-page">
      <div className="page-head">
        <h1>Linkten ekle</h1>
      </div>

      <div className="import-card glass">
        <label className="f-block">
          <span className="f-label">Video, müzik veya doğrudan ses linki</span>

          <input
            className="f-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube / SoundCloud / Vimeo / MP3 linki"
          />
        </label>

        <div className="import-note">
          <strong>MeTube ile indir</strong> dersen link MeTube’a gönderilir,
          MP3 olarak indirilir ve dosya otomatik HawarMusic kütüphanesine eklenir.
        </div>

        <div className="field-row2">
          <label className="f-block">
            <span className="f-label">Başlık</span>

            <input
              className="f-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Şarkı adı"
            />
          </label>

          <label className="f-block">
            <span className="f-label">Sanatçı</span>

            <input
              className="f-input"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Sanatçı"
            />
          </label>
        </div>

        <label className="confirm-box">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />

          <span>
            Bu içeriği indirme/yükleme hakkına sahibim.
          </span>
        </label>

        {err && <div className="error-box">{err}</div>}
        {msg && <div className="ok-box">{msg}</div>}

        <div className="hero-cta">
          <button
            type="button"
            className="btn btn-grad"
            onClick={submitMetube}
            disabled={busy || !cleanUrl}
          >
            {busy ? "İndiriliyor..." : "MeTube ile indir"}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={submitNormal}
            disabled={busy || !cleanUrl || (isDirectAudio && !confirmed)}
          >
            Sadece bağlantı ekle
          </button>
        </div>
      </div>
    </div>
  );
}
