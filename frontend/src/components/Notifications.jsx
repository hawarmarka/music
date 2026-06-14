import { useEffect, useState } from "react";
import { api } from "../lib/api";

const LABELS = {
  "song.upload": "Yeni şarkı yüklendi",
  "song.import_meta": "Link koleksiyona eklendi",
  "song.import_file": "Dosya linkten içe aktarıldı",
  "song.delete": "Şarkı silindi",
  "family.create": "Aile oluşturuldu",
  "user.join": "Yeni üye katıldı",
  "invite.create": "Davet oluşturuldu",
  "member.update": "Üye güncellendi",
  "member.remove": "Üye çıkarıldı",
  "comment.add": "Yeni yorum geldi",
};

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const load = () => api.notifications().then(setItems).catch(() => []);
  useEffect(() => { load(); const t = setInterval(load, 45000); return () => clearInterval(t); }, []);

  return (
    <div className="notif-wrap">
      <button className="notif-btn" onClick={() => setOpen(!open)} title="Bildirimler">🔔{items.length > 0 && <i>{Math.min(items.length, 9)}</i>}</button>
      {open && (
        <div className="notif-panel glass" onMouseLeave={() => setOpen(false)}>
          <div className="notif-head"><strong>Bildirimler</strong><button onClick={load}>Yenile</button></div>
          {items.length === 0 ? <p className="mini-empty">Bildirim yok.</p> : items.slice(0, 12).map((n, i) => (
            <div key={i} className="notif-row">
              <span>{LABELS[n.action] || n.action}</span>
              <small>{n.detail || "—"} · {n.user || "Sistem"}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
