import { useEffect, useState } from "react";
import { BookOpen, Star, ArrowLeft } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";

export default function Learn() {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [topic, setTopic] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("todos"); // todos | favoritos

  const load = async () => {
    const [a, f] = await Promise.all([api.get("/articles"), api.get("/favorites")]);
    setArticles(a.data);
    setFavorites(f.data.map((x) => x.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const topics = ["Todos", ...Array.from(new Set(articles.map((a) => a.topic)))];

  const openArticle = async (id) => {
    const { data } = await api.get(`/articles/${id}`);
    setSelected(data);
  };

  const toggleFav = async (id) => {
    if (favorites.includes(id)) {
      await api.delete(`/favorites/${id}`);
      setFavorites(favorites.filter((f) => f !== id));
    } else {
      await api.post("/favorites", { article_id: id });
      setFavorites([...favorites, id]);
    }
  };

  if (loading) return <Spinner />;

  if (selected) {
    return (
      <div className="page-grid">
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ width: "fit-content" }}>
          <ArrowLeft size={15} /> Volver
        </button>
        <Card>
          <div className="flex between center">
            <span className="chip teal">{selected.topic}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleFav(selected.id)}>
              <Star size={15} fill={favorites.includes(selected.id) ? "#0edfdc" : "none"} color="#0edfdc" />
              {favorites.includes(selected.id) ? "Guardado" : "Guardar"}
            </button>
          </div>
          <h2 style={{ margin: "14px 0 6px", fontSize: 22 }}>{selected.title}</h2>
          <p className="muted" style={{ marginTop: 0 }}>{selected.summary}</p>
          <p style={{ lineHeight: 1.75, marginTop: 16, maxWidth: "72ch" }}>{selected.content}</p>
        </Card>
      </div>
    );
  }

  const visible = articles
    .filter((a) => topic === "Todos" || a.topic === topic)
    .filter((a) => (tab === "favoritos" ? favorites.includes(a.id) : true));

  return (
    <div className="page-grid">
      <div>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Educación financiera</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Artículos breves publicados por el equipo de la plataforma, basados en material del BCRA, la CNV y la OCDE.
        </p>
      </div>

      <div className="section-tabs">
        <div className={`tab ${tab === "todos" ? "active" : ""}`} onClick={() => setTab("todos")}>Todos los artículos</div>
        <div className={`tab ${tab === "favoritos" ? "active" : ""}`} onClick={() => setTab("favoritos")}>Mis favoritos</div>
      </div>

      {tab === "todos" && (
        <div className="section-tabs">
          {topics.map((t) => (
            <div key={t} className={`tab ${topic === t ? "active" : ""}`} onClick={() => setTopic(t)}>{t}</div>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <Empty icon={tab === "favoritos" ? Star : BookOpen}
          title={tab === "favoritos" ? "No guardaste artículos" : "No hay artículos"}
          hint={tab === "favoritos" ? "Tocá la estrella en un artículo para guardarlo." : ""} />
      ) : (
        <div className="grid-2">
          {visible.map((a) => (
            <div className="card" key={a.id} style={{ background: "var(--panel-2)", cursor: "pointer" }} onClick={() => openArticle(a.id)}>
              <div className="flex between center">
                <span className="chip teal">{a.topic}</span>
                <button className="btn btn-ghost btn-sm" style={{ padding: 6 }}
                  onClick={(e) => { e.stopPropagation(); toggleFav(a.id); }}>
                  <Star size={15} fill={favorites.includes(a.id) ? "#0edfdc" : "none"} color="#0edfdc" />
                </button>
              </div>
              <h3 style={{ margin: "12px 0 6px", fontSize: 16 }}>{a.title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>{a.summary}</p>
              <div className="mt" style={{ color: "var(--azure-200)", fontSize: 12.5, fontWeight: 600 }}>Leer artículo</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
