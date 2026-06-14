import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Settings({ user }) {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.settings().then(setS); }, []);
  if (!s) return <div className="loading">Yükleniyor...</div>;
  const isAdmin = user.role === "admin";

  async function save() {
    await api.updateSettings({ max_file_mb: s.max_file_mb, allow_member_upload: s.allow_member_upload });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="page-head"><h1>Ayarlar</h1></div>
      <div className="settings-card glass">
        <div className="set-row">
          <div><strong>Hesap</strong><p>{user.display_name} · {user.email || "—"} · {isAdmin ? "Yönetici" : "Üye"}</p></div>
        </div>
        <div className="set-row">
          <div><strong>Maksimum dosya boyutu</strong><p>Yüklenebilecek tek dosya sınırı (MB)</p></div>
          <input className="f-input set-num" type="number" value={s.max_file_mb} disabled={!isAdmin}
            onChange={(e) => setS({ ...s, max_file_mb: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="set-row">
          <div><strong>Üye yüklemesine izin ver</strong><p>Kapalıysa sadece yönetici yükleyebilir</p></div>
          <input type="checkbox" checked={s.allow_member_upload} disabled={!isAdmin}
            onChange={(e) => setS({ ...s, allow_member_upload: e.target.checked })} />
        </div>
        {isAdmin && (
          <div className="set-actions">
            {saved && <span className="ok-box">Kaydedildi ✓</span>}
            <button className="btn btn-grad" onClick={save}>Kaydet</button>
          </div>
        )}
      </div>
    </div>
  );
}
