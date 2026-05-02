// History.jsx — PrepSense AI
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI } from "../utils/api";

export default function History() {
  const navigate              = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    dashboardAPI.get().then(d => setHistory(d.history || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner"/><span>Loading history…</span></div>;

  const filtered = filter === "all" ? history : history.filter(iv => iv.level === filter);
  const levels   = ["all", ...Array.from(new Set(history.map(iv => iv.level)))];

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
        <div>
          <h1 className="page-title">Interview <span>History</span></h1>
          <p className="page-sub">{history.length} completed session{history.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/interview")}>+ New Interview</button>
      </div>

      {levels.length > 1 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {levels.map(l => (
            <button key={l} onClick={() => setFilter(l)}
              style={{
                padding:"6px 16px", borderRadius:"var(--r-full)", fontSize:12, fontWeight:600,
                border:`1px solid ${filter===l?"var(--flame)":"var(--border-2)"}`,
                background:filter===l?"var(--flame-soft)":"transparent",
                color:filter===l?"var(--flame)":"var(--text-2)", cursor:"pointer",
                textTransform:"capitalize", transition:"all 0.15s"
              }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:"center", padding:"60px 24px" }}>
          <div style={{ fontSize:56, marginBottom:14 }}>📋</div>
          <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>No interviews yet</h2>
          <p style={{ color:"var(--text-2)", marginBottom:24, fontSize:14 }}>Start practising to build your history and track progress.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/interview")}>🎯 Start your first interview</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.map((iv, idx) => {
            const score = iv.avg_score;
            const color = score >= 75 ? "#10d98a" : score >= 50 ? "#00c9a7" : score >= 30 ? "#ffb627" : "#ff4d6d";
            return (
              <div key={iv.id} className="card card-sm"
                style={{ display:"flex", alignItems:"center", gap:16, animation:`fadeIn 0.3s ease ${idx*0.04}s both`, cursor:"pointer" }}
                onClick={() => navigate(`/report/${iv.id}`)}>
                <div style={{ width:54, height:54, borderRadius:"50%", border:`2.5px solid ${color}`, background:`${color}10`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:15, color }}>{score}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>{iv.role}</div>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
                    <span className="badge badge-violet" style={{ textTransform:"capitalize" }}>{iv.level}</span>
                    <span className="badge badge-teal"   style={{ textTransform:"capitalize" }}>{iv.category || "mixed"}</span>
                    <span className="badge badge-flame">{iv.question_count} questions</span>
                    <span style={{ fontSize:12, color:"var(--text-3)" }}>
                      {new Date(iv.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </span>
                  </div>
                </div>
                <div style={{ color:"var(--text-3)", fontSize:18, flexShrink:0 }}>›</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
