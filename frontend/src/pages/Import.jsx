import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

const STEPS = [
  "Link kontrol ediliyor",
  "Ses indiriliyor",
  "MP3'e çevriliyor",
  "Kütüphaneye ekleniyor",
  "Tamamlandı",
];

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function detectSource(value) {
  const v = value.toLowerCase();

  if (v.includes("youtube.com") || v.includes("youtu.be")) return "YouTube";
  if (v.includes("tiktok.com")) return "TikTok";
  if (v.includes("instagram.com")) return "Instagram";
  if (v.includes("soundcloud.com")) return "SoundCloud";
  if (v.includes("spotify.com")) return "Spotify";

  return "Bağlantı";
}

export default function Import({ onDone }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [step, setStep] = useState(-1);
  const [history, setHistory] = useState([]);

  const timersRef = useRef([]);

  const cleanUrl = url.trim();
  const sourceName = cleanUrl ? detectSource(cleanUrl) : "Bağlantı";

  function clearTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }

  function startFakeProgress() {
    clearTimers();
    setStep(0);

    const timings = [900, 2200, 4200, 6500];

    timings.forEach((time, index) => {
      const t = setTimeout(() => {
        setStep(index + 1);
      }, time);

      timersRef.current.push(t);
    });
  }

  useEffect(() => {
    return () => clearTimers();
  }, []);

  async function submitDownload() {
    setErr("");
    setMsg("");

    if (!cleanUrl) {
      setErr("Lütfen bir link gir.");
      return;
    }

    if (!isValidUrl(cleanUrl)) {
      setErr("Geçerli bir link gir. Link http:// veya https:// ile başlamalı.");
      return;
    }

    setBusy(true);
    startFakeProgress();

    try {
      const r = await api.metubeImport({
        url: cleanUrl,
        title: "",
        artist: "",
        license_confirmed: true,
        visibility: "family",
      });

      clearTimers();
      setStep(4);

      const finalMsg = r.notice || "Şarkı indirildi ve kütüphaneye eklendi.";
      setMsg(finalMsg);

      setHistory((prev) => [
        {
          id: Date.now(),
          url: cleanUrl,
          source: sourceName,
          title: r.title || "Kütüphaneye eklendi",
          status: "Tamamlandı",
        },
        ...prev.slice(0, 4),
      ]);

      if (r.id) {
        setUrl("");

        setTimeout(() => {
          onDone?.();
        }, 900);
      }
    } catch (e) {
      clearTimers();
      setStep(-1);
      setErr(e.message || "İndirme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  function pasteExample(type) {
    if (busy) return;

    if (type === "youtube") {
      setUrl("https://www.youtube.com/watch?v=");
      return;
    }

    setUrl("https://");
  }

  return (
    <div className="import-page">
      <div className="page-head import-head">
        <div>
          <p className="hero-eyebrow">Linkten indir</p>
          <h1>Müzik bağlantısı ekle</h1>
          <span className="import-sub">
            Video veya müzik linkini yapıştır, sistem indirip kütüphaneye eklesin.
          </span>
        </div>
      </div>

      <section className="import-hero glass">
        <div className="import-hero-icon">↓</div>

        <div>
          <strong>Bağlantıdan şarkı indir</strong>
          <span>
            Sadece indirme/yükleme hakkın olan içerikleri ekle.
          </span>
        </div>
      </section>

      <section className="import-card glass">
        <label className="import-label">
          <span>Video, müzik veya playlist linki</span>

          <div className="import-input-wrap">
            <i>{sourceName}</i>

            <input
              className="import-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube / video / müzik linki yapıştır"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitDownload();
              }}
            />
          </div>
        </label>

        <div className="import-quick-actions">
          <button type="button" className="btn btn-ghost" onClick={() => pasteExample("youtube")}>
            YouTube linki
          </button>

          <button type="button" className="btn btn-ghost" onClick={() => pasteExample("blank")}>
            Boş link alanı
          </button>
        </div>

        {(busy || step >= 0) && (
          <div className="import-steps">
            {STEPS.map((item, index) => (
              <div
                key={item}
                className={[
                  "import-step",
                  step === index ? "active" : "",
                  step > index ? "done" : "",
                ].join(" ")}
              >
                <span>{step > index ? "✓" : index + 1}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        )}

        {err && <div className="error-box">{err}</div>}
        {msg && <div className="ok-box">{msg}</div>}

        <button
          type="button"
          className="btn btn-grad import-main-btn"
          onClick={submitDownload}
          disabled={busy || !cleanUrl}
        >
          {busy ? "İndiriliyor..." : "İndir ve kütüphaneye ekle"}
        </button>
      </section>

      {history.length > 0 && (
        <section className="import-history glass">
          <div className="import-history-head">
            <strong>Son işlemler</strong>
            <span>{history.length} kayıt</span>
          </div>

          <div className="import-history-list">
            {history.map((h) => (
              <div key={h.id} className="import-history-row">
                <div>
                  <strong>{h.title}</strong>
                  <span>{h.source} · {h.status}</span>
                </div>

                <i>✓</i>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
