import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Requests() {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);

    api
      .requests()
      .then((data) => {
        setList(data || []);
      })
      .catch(() => {
        setList([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!text.trim()) return;

    await api.createRequest({ text: text.trim() });
    setText("");
    load();
  }

  async function fulfill(id) {
    await api.fulfillRequest(id);
    load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Aileden istekler</h1>
      </div>

      <div className="req-add glass">
        <input
          className="f-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Eklenmesini istediğin şarkıyı yaz..."
          onKeyDown={(e) => e.key === "Enter" && add()}
        />

        <button type="button" className="btn btn-grad" onClick={add}>
          İste
        </button>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : list.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">♪</div>
          <h3>İstek yok</h3>
          <p>İlk şarkı isteğini yaz.</p>
        </div>
      ) : (
        <div className="req-list">
          {list.map((r) => (
            <div
              key={r.id}
              className={`req-row glass ${r.status === "fulfilled" ? "done" : ""}`}
            >
              <div>
                <strong>{r.text}</strong>
                <span>{r.requester_name}</span>
              </div>

              {r.status === "open" ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => fulfill(r.id)}
                >
                  Ekledim
                </button>
              ) : (
                <span className="req-done">Tamamlandı</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
