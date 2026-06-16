import { useEffect, useState } from "react";
import { api } from "../lib/api";

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      className={`settings-toggle ${checked ? "on" : ""}`}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      aria-label="Ayar değiştir"
    >
      <span />
    </button>
  );
}

export default function Settings({ user }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const isAdmin = user?.role === "admin";

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const data = await api.settings();
      setSettings(data);
    } catch (e) {
      setErr(e.message || "Ayarlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function save() {
    if (!isAdmin || !settings) return;

    setSaving(true);
    setSaved(false);
    setErr("");

    try {
      await api.updateSettings({
        max_file_mb: Number(settings.max_file_mb || 0),
        allow_member_upload: Boolean(settings.allow_member_upload),
      });

      setSaved(true);

      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setErr(e.message || "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="home-loading glass">
        <div className="loading-wave">⚙</div>
        <strong>Ayarlar yükleniyor...</strong>
        <span>Sistem ayarları hazırlanıyor.</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="empty settings-empty glass">
        <div className="empty-ic">⚙</div>
        <h3>Ayarlar alınamadı</h3>
        <p>{err || "Lütfen tekrar dene."}</p>

        <button type="button" className="btn btn-grad" onClick={load}>
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-head settings-head">
        <div>
          <p className="hero-eyebrow">Ayarlar</p>
          <h1>Sistem ayarları</h1>
          <span className="settings-sub">
            Hesap, yükleme izni ve dosya sınırlarını buradan yönet.
          </span>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-grad"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        )}
      </div>

      {(err || saved) && (
        <div className="settings-messages">
          {err && <div className="error-box">{err}</div>}
          {saved && <div className="ok-box">Kaydedildi ✓</div>}
        </div>
      )}

      <section className="settings-profile glass">
        <div className="settings-avatar">
          {(user?.display_name || user?.username || "?").slice(0, 1).toUpperCase()}
        </div>

        <div>
          <strong>{user?.display_name || user?.username || "Kullanıcı"}</strong>
          <span>{user?.email || "E-posta yok"}</span>
          <i>{isAdmin ? "Yönetici" : "Üye"}</i>
        </div>
      </section>

      <section className="settings-grid">
        <div className="settings-card-new glass">
          <div className="settings-card-icon">⬆</div>

          <div className="settings-card-body">
            <strong>Maksimum dosya boyutu</strong>
            <p>Yüklenebilecek tek dosya sınırı. Önerilen değer: 50 MB.</p>

            <div className="settings-input-row">
              <input
                className="f-input"
                type="number"
                min="1"
                max="500"
                value={settings.max_file_mb}
                disabled={!isAdmin}
                onChange={(e) =>
                  update("max_file_mb", parseInt(e.target.value, 10) || 0)
                }
              />

              <span>MB</span>
            </div>
          </div>
        </div>

        <div className="settings-card-new glass">
          <div className="settings-card-icon">👥</div>

          <div className="settings-card-body">
            <strong>Üye yüklemesine izin ver</strong>
            <p>Kapalıysa sadece yöneticiler şarkı yükleyebilir.</p>

            <div className="settings-switch-row">
              <span>
                {settings.allow_member_upload ? "Açık" : "Kapalı"}
              </span>

              <Toggle
                checked={settings.allow_member_upload}
                disabled={!isAdmin}
                onChange={(value) => update("allow_member_upload", value)}
              />
            </div>
          </div>
        </div>

        <div className="settings-card-new glass">
          <div className="settings-card-icon">🔒</div>

          <div className="settings-card-body">
            <strong>Yetki durumu</strong>
            <p>
              {isAdmin
                ? "Bu hesap yönetici yetkisine sahip. Sistem ayarlarını değiştirebilir."
                : "Bu hesap üye yetkisine sahip. Sistem ayarlarını sadece görüntüleyebilir."}
            </p>

            <div className="settings-role-pill">
              {isAdmin ? "Yönetici" : "Üye"}
            </div>
          </div>
        </div>
      </section>

      {!isAdmin && (
        <div className="settings-note glass">
          Bu ayarları sadece yönetici değiştirebilir. Değişiklik gerekiyorsa aile yöneticisine söyle.
        </div>
      )}
    </div>
  );
}
