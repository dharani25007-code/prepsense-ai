// CareerArc.jsx — F5: Career Arc Predictor (fixed null safety)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { careerAPI } from "../utils/api";

function ReadinessBar({ value, color }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"var(--r-full)", height:8, overflow:"hidden" }}>
      <div style={{ width:`${value}%`, height:"100%", background:color, borderRadius:"var(--r-full)",
        transition:"width 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
    </div>
  );
}

function ReadyRoleCard({ role }) {
  const color = role.confidence >= 75 ? "#10d98a" : role.confidence >= 50 ? "#ffb627" : "#ff6b35";
  return (
    <div style={{ background:"var(--bg-2)", border:`1px solid ${color}30`, borderRadius:"var(--r-lg)",
      padding:18, transition:"transform 0.15s" }}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="none"}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:14, color }}>{role.role}</div>
        <div style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:20, color }}>{role.confidence}%</div>
      </div>
      <ReadinessBar value={role.confidence} color={color}/>
      <p style={{ fontSize:12.5, color:"var(--text-3)", marginTop:10, lineHeight:1.5 }}>{role.reason}</p>
    </div>
  );
}

function ApproachingCard({ role }) {
  return (
    <div style={{ background:"var(--bg-2)", border:"1px solid rgba(255,182,39,0.2)",
      borderRadius:"var(--r-lg)", padding:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:14, color:"var(--gold)" }}>{role.role}</div>
        <span className="badge badge-amber">~{role.eta_weeks}w away</span>
      </div>
      <p style={{ fontSize:12.5, color:"var(--text-2)", lineHeight:1.5 }}>{role.gap}</p>
    </div>
  );
}

function ArchetypeCard({ archetype }) {
  if (!archetype?.name) return null;
  return (
    <div style={{ background:"var(--bg-2)", border:"1px solid rgba(124,92,191,0.25)",
      borderRadius:"var(--r-lg)", padding:24, borderLeft:"3px solid var(--violet)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{ width:48, height:48, borderRadius:"50%", background:"var(--violet-soft)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🎭</div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
            color:"var(--text-3)", letterSpacing:"0.06em", marginBottom:4 }}>Your Interviewee Archetype</div>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:18, color:"#b49dfc" }}>
            {archetype.name}
          </div>
        </div>
      </div>
      <p style={{ fontSize:14, color:"var(--text-2)", lineHeight:1.7, marginBottom:16 }}>
        {archetype.description}
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ background:"var(--green-soft)", borderRadius:"var(--r)", padding:"10px 14px",
          border:"1px solid rgba(16,217,138,0.15)" }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
            color:"var(--green)", marginBottom:6 }}>⚡ Superpower</div>
          <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.5 }}>{archetype.superpower}</p>
        </div>
        <div style={{ background:"var(--red-soft)", borderRadius:"var(--r)", padding:"10px 14px",
          border:"1px solid rgba(255,77,109,0.15)" }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
            color:"var(--red)", marginBottom:6 }}>🎯 Blind Spot</div>
          <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.5 }}>{archetype.blind_spot}</p>
        </div>
      </div>
    </div>
  );
}

function SurpriseCard({ rec }) {
  if (!rec?.role) return null;
  return (
    <div style={{ background:"linear-gradient(135deg, rgba(255,107,53,0.08), rgba(124,92,191,0.08))",
      border:"1px solid rgba(255,107,53,0.2)", borderRadius:"var(--r-lg)", padding:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <span style={{ fontSize:24 }}>✨</span>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
            color:"var(--text-3)", letterSpacing:"0.06em" }}>Surprise Recommendation</div>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:16, color:"var(--flame)" }}>
            {rec.role}
          </div>
        </div>
      </div>
      <p style={{ fontSize:13.5, color:"var(--text-2)", lineHeight:1.65 }}>{rec.reason}</p>
    </div>
  );
}

function OverallRing({ score }) {
  const safeScore = score ?? 0;
  const r = 44, circ = 2 * Math.PI * r, fill = (safeScore / 100) * circ;
  const color = safeScore >= 70 ? "#10d98a" : safeScore >= 45 ? "#ffb627" : "#ff6b35";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9}/>
        <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition:"stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)" }}/>
        <text x={55} y={50} textAnchor="middle" fontSize={26} fontWeight={800}
          fontFamily="Sora,sans-serif" fill={color}>{safeScore}</text>
        <text x={55} y={66} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.3)">/ 100</text>
      </svg>
      <div style={{ fontSize:13, fontWeight:700, color, fontFamily:"Sora,sans-serif" }}>
        Overall Readiness
      </div>
    </div>
  );
}

// ── Not enough data screen ────────────────────────────────────────────────────
function NotEnoughData({ sessionsNeeded, navigate }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Career <span>Arc</span></h1>
        <p className="page-sub">AI-predicted readiness across roles — based on your actual performance.</p>
      </div>
      <div className="card" style={{ textAlign:"center", padding:"60px 24px" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🔭</div>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:10 }}>Not enough data yet</h2>
        <p style={{ color:"var(--text-2)", fontSize:14, lineHeight:1.7,
          maxWidth:400, margin:"0 auto 28px" }}>
          Complete at least <strong style={{ color:"var(--flame)" }}>
            {sessionsNeeded ?? 2} more interview session{(sessionsNeeded ?? 2) !== 1 ? "s" : ""}
          </strong> across different roles or levels to unlock your personalised Career Arc prediction.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/interview")}>
            🎯 Start an Interview
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CareerArc() {
  const navigate = useNavigate();
  const [arc,           setArc]           = useState(null);
  const [sessionsNeeded, setSessionsNeeded] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [notEnough,     setNotEnough]     = useState(false);

  useEffect(() => {
    careerAPI.getArc()
      .then(r => {
        if (r?.arc) {
          setArc(r.arc);
        } else {
          // Shouldn't happen but guard anyway
          setNotEnough(true);
        }
      })
      .catch(e => {
        // Backend returns 202 with sessions_needed when not enough data
        // api.js throws on non-ok — parse the message
        setNotEnough(true);
        const match = e.message?.match(/(\d+)/);
        if (match) setSessionsNeeded(parseInt(match[1]));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-loader">
      <div className="spinner"/>
      <span>Analysing your career trajectory…</span>
    </div>
  );

  if (notEnough || !arc) return <NotEnoughData sessionsNeeded={sessionsNeeded} navigate={navigate}/>;

  // Safe accessors with fallbacks
  const overallReadiness   = arc.overall_readiness   ?? 0;
  const readyRoles         = arc.ready_roles          ?? [];
  const approachingRoles   = arc.approaching_roles    ?? [];
  const needsPrepRoles     = arc.needs_prep_roles     ?? [];
  const surpriseRec        = arc.surprise_recommendation ?? {};
  const archetype          = arc.interviewee_archetype   ?? {};

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
        <div>
          <h1 className="page-title">Career <span>Arc</span></h1>
          <p className="page-sub">AI-predicted readiness across roles — based on your actual performance patterns.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/interview")}>+ New Session</button>
      </div>

      {/* Top: overall ring + archetype */}
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:20, marginBottom:22 }}>
        <div className="card card-glow" style={{ display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center" }}>
          <OverallRing score={overallReadiness}/>
        </div>
        <ArchetypeCard archetype={archetype}/>
      </div>

      {/* Ready roles */}
      {readyRoles.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <span style={{ fontSize:20 }}>✅</span>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Ready Now</h2>
            <span className="badge badge-green">{readyRoles.length} roles</span>
          </div>
          <div className="grid-2">
            {readyRoles.map((r, i) => <ReadyRoleCard key={i} role={r}/>)}
          </div>
        </div>
      )}

      {/* Approaching */}
      {approachingRoles.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <span style={{ fontSize:20 }}>📈</span>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Approaching</h2>
            <span className="badge badge-amber">{approachingRoles.length} roles</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {approachingRoles.map((r, i) => <ApproachingCard key={i} role={r}/>)}
          </div>
        </div>
      )}

      {/* Needs prep */}
      {needsPrepRoles.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <span style={{ fontSize:20 }}>🛠</span>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Needs More Prep</h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {needsPrepRoles.map((r, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"12px 16px",
                background:"var(--bg-2)", borderRadius:"var(--r)",
                border:"1px solid rgba(255,77,109,0.15)" }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{r.role}</div>
                <div style={{ fontSize:12.5, color:"var(--red)", maxWidth:300, textAlign:"right" }}>{r.blocker}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Surprise recommendation */}
      {surpriseRec?.role && (
        <div style={{ marginBottom:20 }}>
          <SurpriseCard rec={surpriseRec}/>
        </div>
      )}

      <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
        <button className="btn btn-primary btn-lg" onClick={() => navigate("/interview")}>
          🎯 Practice Again
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
      </div>
    </div>
  );
}