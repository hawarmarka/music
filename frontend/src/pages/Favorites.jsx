import { useState, useEffect } from "react";
import { api } from "../lib/api";
import SongCard from "../components/SongCard";

export default function Favorites() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => api.favorites().then(setSongs).finally(() => setLoading(false));
  useEffect(load, []);
  return (
    <div>
      <div className="page-head"><h1>Favoriler</h1></div>
      {loading ? <div className="loading">Yükleniyor...</div>
        : songs.length === 0 ? <div className="empty"><div className="empty-ic">♥</div><h3>Henüz favorin yok</h3><p>Şarkı kartlarındaki kalbe dokun.</p></div>
        : <div className="grid">{songs.map((s) => <SongCard key={s.id} song={s} list={songs} onChanged={load} />)}</div>}
    </div>
  );
}
