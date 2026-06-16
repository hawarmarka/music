import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const FILTERS = [
  { key: "all", label: "Hepsi" },
  { key: "open", label: "Açık" },
  { key: "fulfilled", label: "Tamamlandı" },
];

export default function Requests({ go }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const data = await api.requests();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "İstekler alınamadı.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const h = (e) => setQ(e.detail || "");

    window.addEventListener("hm-search", h);

    return () => window.removeEventListener("hm-search", h);
  }, []);

  const stats = useMemo(() => {
    return {
      total: list.length,
      open: list.filter((r) => r.status === "open").length,
      done: list.filter((r) => r.status === "fulfilled").length,
    };
  }, [list]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return list.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;

      if (search) {
        const haystack = [
          r.text,
          r.requester_name,
          r.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [list, q, filter]);

  async function add() {
    const clean = text.trim();

    if (!clean) {
      setErr("Lütfen istek yaz.");
      return;
    }

    setBusy(true);
    setErr("");
    setMsg("");

    try {
      await api.createRequest({ text: clean });

      setText("");
      setMsg("İstek eklendi ✓");

      await load();

      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setErr(e.message || "İstek eklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function fulfill(id) {
    setErr("");
    setMsg("");

    try {
      await api.fulfillRequest(id);

      setMsg("İstek tamamlandı ✓");

      await load();

      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setErr(e.message || "İstek tamamlanamadı.");
    }
  }

  return (
    <div className="requests-page">
      <div className="page-head requests-head">
        <div>
          <p className="hero-eyebrow">Aile istekleri</p>

          <h1>Şarkı istekleri</h1>

          <span className="requests-sub">
            {filtered.length} istek gösteriliyor · {stats.open} açık istek
          </span>
        </div>

        {go && (
          <div className="requests-head-actions">
            <button type="button" className="btn btn-ghost" onClick={() => go("library")}>
              Kütüphane
            </button>

            <button type="button" className="btn btn-grad" onClick={() => go("import")}>
              Linkten ekle
            </button>
          </div>
        )}
      </div>

      <section className="requests-create glass">
        <div className="requests-create-icon">♪</div>

        <div className="requests-create-body">
          <strong>Yeni şarkı isteği</strong>
          <span>Aileden eklenmesini istediğin şarkıyı buraya yaz.</span>

          <div className="requests-create-form">
            <input
              className="f-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Örn: sanatçı adı - şarkı adı"
              disabled={busy}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />

            <button
              type="button"
              className="btn btn-grad"
              onClick={add}
              disabled={busy || !text.trim()}
            >
              {busy ? "Ekleniyor..." : "İste"}
            </button>
          </div>
        </div>
      </section>

      {(err || msg) && (
        <div className="requests-messages">
          {err && <div className="error-box">{err}</div>}
          {msg && <div className="ok-box">{msg}</div>}
        </div>
      )}

      <section className="requests-toolbar glass">
        <div className="requests-search">
          <span>⌕</span>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsteklerde ara..."
          />
        </div>

        <div className="requests-filters">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.key}
              className={filter === f.key ? "chip on" : "chip"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="requests-stats">
        <div className="requests-stat glass">
          <span>Toplam</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="requests-stat glass">
          <span>Açık</span>
          <strong>{stats.open}</strong>
        </div>

        <div className="requests-stat glass">
          <span>Tamamlandı</span>
          <strong>{stats.done}</strong>
        </div>
      </section>

      {loading ? (
        <div className="home-loading glass">
          <div className="loading-wave">♪</div>
          <strong>İstekler yükleniyor...</strong>
          <span>Aile istekleri hazırlanıyor.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty requests-empty glass">
          <div className="empty-ic">♪</div>

          <h3>İstek yok</h3>

          <p>
            İlk şarkı isteğini yaz veya filtreyi değiştir.
          </p>

          {(q || filter !== "all") && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setQ("");
                setFilter("all");
              }}
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      ) : (
        <div className="requests-list">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`requests-row glass ${
                r.status === "fulfilled" ? "done" : ""
              }`}
            >
              <div className="requests-row-main">
                <div className="requests-row-icon">
                  {r.status === "fulfilled" ? "✓" : "♪"}
                </div>

                <div>
                  <strong title={r.text}>{r.text}</strong>

                  <span>
                    {r.requester_name || "Aile üyesi"} ·{" "}
                    {r.status === "fulfilled" ? "Tamamlandı" : "Açık istek"}
                  </span>
                </div>
              </div>

              <div className="requests-row-actions">
                {r.status === "open" ? (
                  <>
                    {go && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => go("import")}
                      >
                        Linkten ekle
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-grad btn-sm"
                      onClick={() => fulfill(r.id)}
                    >
                      Ekledim
                    </button>
                  </>
                ) : (
                  <span className="requests-done">Tamamlandı</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
