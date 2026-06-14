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

  const isDirect = /\.(mp3|m4a|wav|flac|ogg|aac)(\?.*)?$/i.test(url.trim());

  async function submit() {
    setErr(""); setMsg(null); setBusy(true);
    try {
      const r = await api.importLink({ url, title, artist, license_confirmed: confirmed, visibility: "family" });
      setMsg(r.notice || "Şarkı koleksiyona eklendi ✓");
      setUrl(""); setTitle(""); setArtist(""); setConfirmed(false);
      setTimeout(onDone, 1200);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="import-page">
      <div className="page-head"><h1>Linkten ekle</h1></div>
      <div className="import-card glass">
        <label className="f-block">
          <span className="f-label">YouTube, Spotify veya yasal ses dosyası linki</span>
          <input className="f-input" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/... · https://open.spotify.com/... · https://.../sarki.mp3" />
        </label>

        <div className="import-note">
          YouTube/Spotify linkleri yalnızca <strong>bağlantı kartı</strong> olarak eklenir — ses dosyası indirilmez.
          Sadece doğrudan ses dosyası (.mp3/.m4a/.flac/.wav) linkleri offline kullanılabilir.
        </div>

        <div className="field-row2">
          <label className="f-block"><span className="f-label">Başlık (isteğe bağlı)</span>
            <input className="f-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Şarkı adı" /></label>
          <label className="f-block"><span className="f-label">Sanatçı (isteğe bağlı)</span>
            <input className="f-input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Sanatçı" /></label>
        </div>

        {isDirect && (
          <label className="confirm-box">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>Bu içeriği indirme/yükleme hakkına sahibim (kendi kaydım, public domain ya da Creative Commons).</span>
          </label>
        )}

        {err && <div className="error-box">{err}</div>}
        {msg && <div className="ok-box">{msg}</div>}

        <button className="btn btn-grad btn-block" onClick={submit}
          disabled={busy || !url.trim() || (isDirect && !confirmed)}>
          {busy ? "Ekleniyor..." : "Koleksiyona ekle"}
        </button>
      </div>
    </div>
  );
}
