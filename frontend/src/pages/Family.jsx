import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function initials(name) {
  return String(name || "?").slice(0, 1).toUpperCase();
}

export default function Family({ user }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const isAdmin = user?.role === "admin";

  const inviteUrl = newCode
    ? `${location.origin}/?code=${encodeURIComponent(newCode)}`
    : "";

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const membersReq = api.members().catch(() => []);
      const invitesReq = isAdmin ? api.invites().catch(() => []) : Promise.resolve([]);

      const [m, i] = await Promise.all([membersReq, invitesReq]);

      setMembers(Array.isArray(m) ? m : []);
      setInvites(Array.isArray(i) ? i : []);
    } catch (e) {
      setErr(e.message || "Aile bilgileri alınamadı.");
      setMembers([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [isAdmin]);

  const stats = useMemo(() => {
    return {
      total: members.length,
      admins: members.filter((m) => m.role === "admin").length,
      uploadOpen: members.filter((m) => m.can_add_to_shared).length,
      activeInvites: invites.filter((i) => !i.used).length,
    };
  }, [members, invites]);

  async function makeInvite() {
    setErr("");
    setMsg("");
    setCopied(false);

    try {
      const r = await api.createInvite({ role: "member" });

      setNewCode(r.code || "");
      setMsg("Davet kodu oluşturuldu ✓");

      await load();

      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setErr(e.message || "Davet oluşturulamadı.");
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard?.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function changeRole(m, role) {
    setBusyId(m.id);
    setErr("");
    setMsg("");

    try {
      await api.updateMember(m.id, { role });
      setMsg("Üye rolü güncellendi ✓");
      await load();
      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setErr(e.message || "Rol güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleUpload(m) {
    setBusyId(m.id);
    setErr("");
    setMsg("");

    try {
      await api.updateMember(m.id, {
        can_add_to_shared: !m.can_add_to_shared,
      });

      setMsg("Yükleme izni güncellendi ✓");
      await load();
      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setErr(e.message || "Yükleme izni güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m) {
    if (!confirm(`${m.display_name} aileden çıkarılsın mı?`)) return;

    setBusyId(m.id);
    setErr("");
    setMsg("");

    try {
      await api.removeMember(m.id);
      setMsg("Üye aileden çıkarıldı ✓");
      await load();
      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setErr(e.message || "Üye çıkarılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="family-page">
      <div className="page-head family-head">
        <div>
          <p className="hero-eyebrow">Aile</p>
          <h1>Aile yönetimi</h1>
          <span className="family-sub">
            {members.length} aile üyesi · {stats.admins} yönetici
          </span>
        </div>

        {isAdmin && (
          <button type="button" className="btn btn-grad" onClick={makeInvite}>
            + Davet oluştur
          </button>
        )}
      </div>

      {(err || msg) && (
        <div className="family-messages">
          {err && <div className="error-box">{err}</div>}
          {msg && <div className="ok-box">{msg}</div>}
        </div>
      )}

      {newCode && (
        <section className="family-invite-box glass">
          <div className="family-invite-icon">+</div>

          <div className="family-invite-content">
            <strong>Yeni davet kodu oluşturuldu</strong>

            <span>
              Bu linki aile üyesine gönder. Kayıt olurken otomatik davet kodu ile katılabilir.
            </span>

            <div className="family-code-row">
              <code>{newCode}</code>

              <button type="button" className="btn btn-ghost btn-sm" onClick={copyInvite}>
                {copied ? "Kopyalandı ✓" : "Linki kopyala"}
              </button>
            </div>

            <button type="button" className="family-copy-link" onClick={copyInvite}>
              {inviteUrl}
            </button>
          </div>
        </section>
      )}

      <section className="family-stats">
        <div className="family-stat glass">
          <span>Toplam üye</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="family-stat glass">
          <span>Yönetici</span>
          <strong>{stats.admins}</strong>
        </div>

        <div className="family-stat glass">
          <span>Yükleme izni açık</span>
          <strong>{stats.uploadOpen}</strong>
        </div>

        <div className="family-stat glass">
          <span>Aktif davet</span>
          <strong>{stats.activeInvites}</strong>
        </div>
      </section>

      {loading ? (
        <div className="home-loading glass">
          <div className="loading-wave">👥</div>
          <strong>Aile bilgileri yükleniyor...</strong>
          <span>Üyeler hazırlanıyor.</span>
        </div>
      ) : (
        <>
          {members.length === 0 ? (
            <div className="empty family-empty glass">
              <div className="empty-ic">👥</div>
              <h3>Aile üyesi yok</h3>
              <p>Davet kodu oluşturarak aile üyelerini ekleyebilirsin.</p>
            </div>
          ) : (
            <section className="family-member-list">
              {members.map((m) => {
                const isSelf = m.id === user?.id;
                const isBusy = busyId === m.id;

                return (
                  <div key={m.id} className="family-member-row glass">
                    <div className="family-member-main">
                      <div
                        className="family-avatar"
                        style={{ background: m.avatar_color }}
                      >
                        {initials(m.display_name)}
                      </div>

                      <div className="family-member-info">
                        <strong>{m.display_name}</strong>

                        <span>
                          {m.role === "admin" ? "Yönetici" : "Üye"} ·{" "}
                          {m.song_count || 0} şarkı
                        </span>

                        <i>
                          {m.can_add_to_shared
                            ? "Yükleme izni açık"
                            : "Yükleme izni kapalı"}
                        </i>
                      </div>
                    </div>

                    <div className="family-badges">
                      <span className={m.role === "admin" ? "role admin" : "role"}>
                        {m.role === "admin" ? "Admin" : "Üye"}
                      </span>

                      <span className={m.can_add_to_shared ? "perm on" : "perm"}>
                        {m.can_add_to_shared ? "Yükleyebilir" : "Yükleyemez"}
                      </span>
                    </div>

                    {isAdmin && !isSelf && (
                      <div className="family-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={isBusy}
                          onClick={() =>
                            changeRole(m, m.role === "admin" ? "member" : "admin")
                          }
                        >
                          {m.role === "admin" ? "Üye yap" : "Admin yap"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={isBusy}
                          onClick={() => toggleUpload(m)}
                        >
                          {m.can_add_to_shared ? "Yüklemeyi kapat" : "Yüklemeyi aç"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={isBusy}
                          onClick={() => remove(m)}
                        >
                          Çıkar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {isAdmin && invites.length > 0 && (
            <section className="family-invites glass">
              <div className="family-section-head">
                <h2>Davet kodları</h2>
                <span>{invites.length} kod</span>
              </div>

              <div className="family-invite-list">
                {invites.map((i) => (
                  <div
                    key={i.id}
                    className={`family-invite-row ${i.used ? "used" : ""}`}
                  >
                    <code>{i.code}</code>

                    <span>{i.used ? "Kullanıldı" : "Aktif"}</span>
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
