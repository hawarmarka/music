import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Family({ user }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true); setErr("");
    Promise.all([
      api.members().then(setMembers),
      user.role === "admin" ? api.invites().then(setInvites) : Promise.resolve([]),
    ]).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function makeInvite() {
    try { const r = await api.createInvite({ role: "member" }); setNewCode(r.code); load(); }
    catch (e) { setErr(e.message); }
  }
  async function changeRole(m, role) {
    try { await api.updateMember(m.id, { role }); load(); }
    catch (e) { setErr(e.message); }
  }
  async function toggleUpload(m) {
    try { await api.updateMember(m.id, { can_add_to_shared: !m.can_add_to_shared }); load(); }
    catch (e) { setErr(e.message); }
  }
  async function remove(m) {
    if (!confirm(`${m.display_name} aileden çıkarılsın mı?`)) return;
    try { await api.removeMember(m.id); load(); }
    catch (e) { setErr(e.message); }
  }
  const inviteUrl = newCode ? `${location.origin}/?code=${encodeURIComponent(newCode)}` : "";

  return (
    <div>
      <div className="page-head"><h1>Aile</h1>{user.role === "admin" && <button className="btn btn-grad" onClick={makeInvite}>+ Davet oluştur</button>}</div>

      {err && <div className="error-box" style={{ marginBottom: "1rem" }}>{err}</div>}
      {newCode && (
        <div className="ok-box" style={{ marginBottom: "1.5rem" }}>
          Davet kodu: <strong>{newCode}</strong><br />
          Davet linki: <button className="copy-link" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>{inviteUrl}</button>
        </div>
      )}

      {loading ? <div className="loading">Yükleniyor...</div> : (
        <>
          <div className="member-grid">
            {members.map((m) => (
              <div key={m.id} className="member-card glass">
                <div className="member-av" style={{ background: m.avatar_color }}>{m.display_name[0].toUpperCase()}</div>
                <strong>{m.display_name}</strong>
                <span>{m.role === "admin" ? "Yönetici" : "Üye"} · {m.song_count} şarkı</span>
                <small>{m.can_add_to_shared ? "Yükleme izni açık" : "Yükleme izni kapalı"}</small>
                {user.role === "admin" && m.id !== user.id && (
                  <div className="member-actions">
                    <button onClick={() => changeRole(m, m.role === "admin" ? "member" : "admin")}>{m.role === "admin" ? "Üye yap" : "Admin yap"}</button>
                    <button onClick={() => toggleUpload(m)}>{m.can_add_to_shared ? "Yüklemeyi kapat" : "Yüklemeyi aç"}</button>
                    <button className="danger" onClick={() => remove(m)}>Çıkar</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {user.role === "admin" && invites.length > 0 && (
            <section className="row">
              <div className="row-head"><h2>Davet kodları</h2></div>
              <div className="invite-list">
                {invites.map((i) => (
                  <div key={i.id} className="invite-row glass">
                    <code>{i.code}</code>
                    <span>{i.used ? "kullanıldı" : "aktif"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
