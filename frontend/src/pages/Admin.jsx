import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Admin() {
  const [dash, setDash] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.dashboard().catch(() => null), api.logs().catch(() => [])])
      .then(([d, l]) => { setDash(d); setLogs(l); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (!dash) return <div className="empty"><p>Yönetici verisi alınamadı.</p></div>;

  return (
    <div>
      <div className="page-head"><h1>Admin paneli</h1></div>
      <div className="stat-grid">
        <div className="stat glass"><span>Toplam şarkı</span><strong>{dash.total_songs}</strong></div>
        <div className="stat glass"><span>Aile üyesi</span><strong>{dash.total_users}</strong></div>
        <div className="stat glass"><span>Depolama</span><strong>{dash.storage_mb} MB</strong></div>
      </div>

      <div className="admin-cols">
        <section className="row">
          <div className="row-head"><h2>En çok dinlenenler</h2></div>
          <div className="mini-list glass">
            {dash.top_played.length === 0 ? <p className="mini-empty">Veri yok</p> :
              dash.top_played.map((s, i) => (
                <div key={i} className="mini-row"><span>{i + 1}. {s.title}</span><i>{s.play_count} ▶</i></div>
              ))}
          </div>
        </section>
        <section className="row">
          <div className="row-head"><h2>Son yüklenenler</h2></div>
          <div className="mini-list glass">
            {dash.recent_uploads.length === 0 ? <p className="mini-empty">Veri yok</p> :
              dash.recent_uploads.map((s, i) => (
                <div key={i} className="mini-row"><span>{s.title}</span><i>{s.uploader}</i></div>
              ))}
          </div>
        </section>
      </div>

      <section className="row">
        <div className="row-head"><h2>Sistem logları</h2></div>
        <div className="log-list glass">
          {logs.slice(0, 30).map((l, i) => (
            <div key={i} className="log-row">
              <span className="log-action">{l.action}</span>
              <span className="log-detail">{l.detail}</span>
              <span className="log-user">{l.user || "—"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
