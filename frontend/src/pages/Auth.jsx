import { useState, useEffect } from "react";
import { api, setToken } from "../lib/api";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [signupType, setSignupType] = useState("create"); // create | invite

  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    family_name: "",
    invite_code: "",
  });

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hashQuery = location.hash.includes("?") ? location.hash.split("?")[1] : "";
    const code =
      new URLSearchParams(location.search).get("code") ||
      new URLSearchParams(hashQuery).get("code");

    if (code) {
      setForm((f) => ({ ...f, invite_code: code }));
      setSignupType("invite");
      setMode("register");
    }
  }, []);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  async function submit() {
    setErr("");

    if (!form.email || !form.password) {
      setErr("E-posta ve şifre zorunludur.");
      return;
    }

    if (mode === "register") {
      if (!form.display_name) {
        setErr("Görünen ad zorunludur.");
        return;
      }

      if (signupType === "create" && !form.family_name) {
        setErr("Aile adı zorunludur.");
        return;
      }

      if (signupType === "invite" && !form.invite_code) {
        setErr("Davet kodu zorunludur.");
        return;
      }
    }

    setBusy(true);

    try {
      let res;

      if (mode === "login") {
        res = await api.login({
          email: form.email,
          password: form.password,
        });
      } else if (signupType === "invite") {
        res = await api.register({
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          invite_code: form.invite_code,
        });
      } else {
        res = await api.createFamily({
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          family_name: form.family_name,
        });
      }

      setToken(res.token);
      onAuth(res.user);
    } catch (e) {
      setErr(e.message || "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  function switchToLogin() {
    setErr("");
    setMode("login");
  }

  function switchToRegister() {
    setErr("");
    setMode("register");
  }

  const isRegister = mode === "register";

  return (
    <main className={`hm-auth-page ${isRegister ? "signup-active" : ""}`}>
      <section className="hm-auth-card">
        <div className="hm-auth-form-side">
          <div className="hm-auth-mobile-logo">
            <span>♪</span>
            <strong>HawarMusic</strong>
          </div>

          <h1>{isRegister ? "Kayıt Ol" : "Giriş Yap"}</h1>

          <div className="hm-socials" aria-hidden="true">
            <button type="button">f</button>
            <button type="button">G</button>
            <button type="button">in</button>
          </div>

          <p className="hm-auth-muted">
            {isRegister
              ? "Hesabını oluştur ve müzik arşivine başla"
              : "Hesabına giriş yaparak devam et"}
          </p>

          {isRegister && (
            <div className="hm-auth-switches">
              <button
                type="button"
                className={signupType === "create" ? "active" : ""}
                onClick={() => setSignupType("create")}
              >
                Yeni aile kur
              </button>

              <button
                type="button"
                className={signupType === "invite" ? "active" : ""}
                onClick={() => setSignupType("invite")}
              >
                Davetle katıl
              </button>
            </div>
          )}

          <div className="hm-auth-fields">
            {isRegister && signupType === "create" && (
              <input
                value={form.family_name}
                onChange={set("family_name")}
                placeholder="Aile adı"
                autoComplete="organization"
              />
            )}

            {isRegister && (
              <input
                value={form.display_name}
                onChange={set("display_name")}
                placeholder="Görünen ad"
                autoComplete="name"
              />
            )}

            {isRegister && signupType === "invite" && (
              <input
                value={form.invite_code}
                onChange={set("invite_code")}
                placeholder="Davet kodu"
              />
            )}

            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="Email Address"
              autoComplete="email"
            />

            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="Password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>

          {!isRegister && (
            <button type="button" className="hm-forgot">
              Forgot your password?
            </button>
          )}

          {err && <div className="hm-auth-error">{err}</div>}

          <button
            type="button"
            className="hm-main-auth-btn"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Bekle..." : isRegister ? "SIGN UP" : "SIGN IN"}
          </button>
        </div>

        <div className="hm-auth-purple-side">
          <div className="hm-auth-purple-content">
            <div className="hm-purple-logo">♪</div>

            <h2>{isRegister ? "Welcome Back!" : "Hey There!"}</h2>

            <p>
              {isRegister
                ? "Zaten hesabın varsa giriş yaparak kaldığın yerden devam et."
                : "Yeni hesabını oluştur ve kendi müzik yolculuğuna bugün başla."}
            </p>

            <button
              type="button"
              className="hm-outline-auth-btn"
              onClick={isRegister ? switchToLogin : switchToRegister}
            >
              {isRegister ? "SIGN IN" : "SIGN UP"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
