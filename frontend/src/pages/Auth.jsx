import { useState, useEffect } from "react";
import { api, setToken } from "../lib/api";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register | create
  const [form, setForm] = useState({
    email: "", password: "", display_name: "", family_name: "", invite_code: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // URL'de ?code= veya #register?code= varsa davet moduna geç
  useEffect(() => {
    const hashQuery = location.hash.includes("?") ? location.hash.split("?")[1] : "";
    const code = new URLSearchParams(location.search).get("code") || new URLSearchParams(hashQuery).get("code");
    if (code) { setForm((f) => ({ ...f, invite_code: code })); setMode("register"); }
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    setErr(""); setBusy(true);
    try {
      let res;
      if (mode === "login") res = await api.login({ email: form.email, password: form.password });
      else if (mode === "register") res = await api.register({
        email: form.email, password: form.password,
        display_name: form.display_name, invite_code: form.invite_code,
      });
      else res = await api.createFamily({
        email: form.email, password: form.password,
        display_name: form.display_name, family_name: form.family_name,
      });
      setToken(res.token);
      onAuth(res.user);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <div className="auth-side">
        <div className="auth-logo"><span className="brand-word">HawarMusic</span></div>
        <h1 className="auth-h1">Tüm aile<br />aynı müzik evinde.</h1>
        <p className="auth-p">Kendi müziklerini yükle, playlist oluştur, offline dinle. Ailene özel, güvenli ve modern müzik arşivi.</p>
        <div className="wave" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}
        </div>
        <p className="auth-byline">HawarMusic by HawarSoftware</p>
      </div>

      <div className="auth-panel glass">
        <div className="auth-tabs">
          <button className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Giriş</button>
          <button className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Davetle katıl</button>
          <button className={mode === "create" ? "on" : ""} onClick={() => setMode("create")}>Aile kur</button>
        </div>

        {mode === "create" && (
          <label className="f-block"><span className="f-label">Aile adı</span>
            <input className="f-input" value={form.family_name} onChange={set("family_name")} placeholder="ör. Hawar Ailesi" /></label>
        )}
        {(mode === "register" || mode === "create") && (
          <label className="f-block"><span className="f-label">Görünen ad</span>
            <input className="f-input" value={form.display_name} onChange={set("display_name")} placeholder="ör. Ahmet" /></label>
        )}
        {mode === "register" && (
          <label className="f-block"><span className="f-label">Davet kodu</span>
            <input className="f-input" value={form.invite_code} onChange={set("invite_code")} placeholder="Yöneticiden aldığın kod" /></label>
        )}
        <label className="f-block"><span className="f-label">E-posta</span>
          <input className="f-input" type="email" value={form.email} onChange={set("email")} placeholder="ornek@mail.com" autoComplete="email" /></label>
        <label className="f-block"><span className="f-label">Şifre</span>
          <input className="f-input" type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && submit()} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>

        {err && <div className="error-box" style={{ marginBottom: "1rem" }}>{err}</div>}

        <button className="btn btn-grad btn-block" onClick={submit} disabled={busy}>
          {busy ? "..." : mode === "login" ? "Giriş yap" : mode === "register" ? "Aileye katıl" : "Aileyi kur"}
        </button>

        {mode === "login" && (
          <p className="auth-foot">İlk kez mi? <button className="auth-link" onClick={() => setMode("create")}>Aile kur</button> ya da <button className="auth-link" onClick={() => setMode("register")}>davetle katıl</button>.</p>
        )}
      </div>
    </div>
  );
}
