// Dashboard.jsx — PrepSense AI
// Novelty 1: Interview Readiness Index animated ring
// Novelty 5: Confidence Calibration panel

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardAPI } from "../utils/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── Novelty 1: IRI animated ring ─────────────────────────────────────────────
function ReadinessRing({ score, level }) {
  const r      = 52;
  const circum = 2 * Math.PI * r;
  const fill   = (score / 100) * circum;
  const color  = level === "Ready" ? "#10d98a" : level === "Intermediate" ? "#ffb627" : "#ff6b35";
  const label  = level === "Ready" ? "Interview Ready!" : level === "Intermediate" ? "Getting There" : "Keep Practising";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
      <div style={{ position:"relative" }}>
        <svg width={130} height={130} viewBox="0 0 130 130">
          <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}/>
          <circle cx={65} cy={65} r={r} fill="none"
            stroke={color} strokeWidth={10}
            strokeDasharray={`${fill} ${circum}`}
            strokeLinecap="round"
            transform="rotate(-90 65 65)"
            style={{ transition:"stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
          <text x={65} y={58} textAnchor="middle" fontSize={28} fontWeight={800}
            fontFamily="Sora,sans-serif" fill={color}>{score}</text>
          <text x={65} y={76} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.35)">/ 100</text>
        </svg>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:14, color, marginBottom:4 }}>{level}</div>
        <div style={{ fontSize:12, color:"var(--text-3)" }}>{label}</div>
      </div>
    </div>
  );
}

function IriBar({ label, value, color, icon }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:13 }}>{icon}</span>
          <span style={{ fontSize:13, color:"var(--text-2)", fontWeight:500 }}>{label}</span>
        </div>
        <span style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:13, color }}>{value}</span>
      </div>
      <div className="progress-bar" style={{ height:7 }}>
        <div className="progress-fill" style={{ width:`${value}%`, background:color }}/>
      </div>
    </div>
  );
}

// ── Novelty 5: Confidence calibration panel ───────────────────────────────────
function ConfidencePanel({ stats }) {
  if (!stats?.has_data) return null;
  const { avg_confidence, avg_score, calibration_gap } = stats;
  const isOver  = calibration_gap > 10;
  const isUnder = calibration_gap < -10;
  const color   = isOver ? "var(--amber)" : isUnder ? "var(--violet)" : "var(--green)";
  const icon    = isOver ? "⚠️" : isUnder ? "💡" : "✅";
  const title   = isOver ? "Overconfident" : isUnder ? "Underconfident" : "Well-Calibrated";
  const desc    = isOver
    ? "Your confidence is higher than your actual scores. Focus on solid fundamentals before assuming mastery."
    : isUnder
    ? "You're doing better than you think! Trust your knowledge and aim to elaborate more in answers."
    : "Your confidence matches your performance well. Keep it up!";

  return (
    <div className="card" style={{ borderLeft:`3px solid ${color}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <div>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:14, color }}>Confidence Calibration</div>
          <div style={{ fontSize:12, color:"var(--text-3)" }}>{title}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        <div style={{ textAlign:"center", padding:"10px", background:"var(--bg-2)", borderRadius:"var(--r-sm)" }}>
          <div style={{ fontSize:22, fontFamily:"Sora,sans-serif", fontWeight:800, color:"var(--gold)" }}>{avg_confidence}%</div>
          <div style={{ fontSize:11, color:"var(--text-3)" }}>Avg confidence</div>
        </div>
        <div style={{ textAlign:"center", padding:"10px", background:"var(--bg-2)", borderRadius:"var(--r-sm)" }}>
          <div style={{ fontSize:22, fontFamily:"Sora,sans-serif", fontWeight:800, color:"var(--teal)" }}>{avg_score}%</div>
          <div style={{ fontSize:11, color:"var(--text-3)" }}>Avg actual score</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>{desc}</p>
    </div>
  );
}

function ScoreBadge({ score }) {
  const cls = score >= 75 ? "badge-green" : score >= 50 ? "badge-amber" : "badge-red";
  return <span className={`badge ${cls}`}>{score}</span>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--bg-2)", border:"1px solid var(--border-2)", borderRadius:10, padding:"10px 14px", fontSize:13 }}>
      <div style={{ color:"var(--text-3)", marginBottom:4 }}>{label}</div>
      <div style={{ color:"var(--flame)", fontWeight:700, fontSize:16 }}>{payload[0].value}</div>
    </div>
  );
};

export default function Dashboard() {
  const { user }              = useAuth();
  const navigate              = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner"/><span>Loading dashboard…</span></div>;

  const { stats = {}, readiness = {}, history = [], confidence_stats } = data || {};
  const chartData = [...history].reverse().map((iv, i) => ({ name:`#${i+1}`, score:iv.avg_score }));

  const statCards = [
    { label:"Avg Score",   value:stats.avg_score ?? 0,        icon:"◎", variant:"flame",  color:"var(--flame)" },
    { label:"Interviews",  value:stats.total_interviews ?? 0, icon:"▦", variant:"violet", color:"#b49dfc" },
    { label:"Questions",   value:stats.total_questions ?? 0,  icon:"≡", variant:"teal",   color:"var(--teal)" },
    { label:"Improvement", value:(stats.improvement_rate ?? 0)+" pts", icon:"↑", variant:"gold", color:"var(--gold)" },
  ];

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
        <div>
          <h1 className="page-title">{greeting}, <span>{firstName}!</span></h1>
          <p className="page-sub">Here's how your interview preparation is going.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/interview")}>+ New Interview</button>
      </div>

      {error && <div className="alert-error" style={{ marginBottom:20 }}>⚠ {error}</div>}

      <div className="grid-4 stagger" style={{ marginBottom:24 }}>
        {statCards.map(s => (
          <div key={s.label} className={`stat-card ${s.variant}`}>
            <div className="stat-icon" style={{ background:`${s.color}18` }}>
              <span style={{ fontSize:18, color:s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score trend + IRI ring */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, marginBottom:24 }}>
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Score Trend</h2>
            {chartData.length > 0 && <span className="badge badge-flame">{chartData.length} sessions</span>}
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff6b35" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#ff6b35" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"/>
                <XAxis dataKey="name" tick={{ fill:"#5a6080", fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{ fill:"#5a6080", fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="score" stroke="#ff6b35" strokeWidth={2.5}
                  fill="url(#scoreGrad)" dot={{ fill:"#ff6b35", r:4, strokeWidth:2, stroke:"var(--bg-1)" }}
                  activeDot={{ r:6, fill:"#ffb627" }}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:220, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
              <div style={{ fontSize:48 }}>📊</div>
              <p style={{ color:"var(--text-2)", fontSize:14 }}>No interviews yet — start your first one!</p>
              <button className="btn btn-outline-flame" onClick={() => navigate("/interview")}>Start Interview →</button>
            </div>
          )}
        </div>

        {/* Novelty 1: IRI */}
        <div className="card card-glow" style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <h2 style={{ fontSize:15, fontWeight:700, marginBottom:20, alignSelf:"flex-start" }}>Readiness Index</h2>
          <ReadinessRing score={readiness.score ?? 0} level={readiness.level ?? "Beginner"}/>
          <div style={{ width:"100%", marginTop:24, display:"flex", flexDirection:"column", gap:14 }}>
            <IriBar label="Accuracy"    value={readiness.breakdown?.accuracy    ?? 0} color="var(--flame)" icon="◎"/>
            <IriBar label="Consistency" value={readiness.breakdown?.consistency ?? 0} color="var(--teal)"  icon="≈"/>
            <IriBar label="Improvement" value={readiness.breakdown?.improvement ?? 0} color="var(--gold)"  icon="↑"/>
          </div>
        </div>
      </div>

      {/* Novelty 5: Confidence calibration */}
      {confidence_stats?.has_data && (
        <div style={{ marginBottom:24 }}>
          <ConfidencePanel stats={confidence_stats}/>
        </div>
      )}

      {/* History table */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:700 }}>Recent Sessions</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/history")}>View all →</button>
        </div>
        {history.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--text-2)", fontSize:14 }}>
            No sessions yet. Complete your first interview to see results here.
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
              <thead>
                <tr>
                  {["Role","Level","Category","Questions","Score","Date",""].map(h => (
                    <th key={h} style={{ padding:"8px 14px", textAlign:"left", color:"var(--text-3)", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((iv, idx) => (
                  <tr key={iv.id} style={{ borderBottom:"1px solid var(--border)" }}>
                    <td style={{ padding:"14px 14px", fontWeight:500 }}>{iv.role}</td>
                    <td style={{ padding:"14px 14px" }}><span className="badge badge-violet" style={{ textTransform:"capitalize" }}>{iv.level}</span></td>
                    <td style={{ padding:"14px 14px" }}><span className="badge badge-teal" style={{ textTransform:"capitalize" }}>{iv.category || "mixed"}</span></td>
                    <td style={{ padding:"14px 14px", color:"var(--text-2)" }}>{iv.question_count}</td>
                    <td style={{ padding:"14px 14px" }}><ScoreBadge score={iv.avg_score}/></td>
                    <td style={{ padding:"14px 14px", color:"var(--text-3)", fontSize:13 }}>
                      {new Date(iv.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </td>
                    <td style={{ padding:"14px 14px" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/report/${iv.id}`)}>Report →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
