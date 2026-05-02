// Report.jsx — PrepSense AI
// Novelty 2: Teacher explanation mode per Q&A
// Novelty 4: Structured resource cards
// Novelty 5: Confidence insight block + per-question confidence stars

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { interviewAPI } from "../utils/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

function ScoreRing({ score }) {
  const r    = 56;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? "#10d98a" : score >= 50 ? "#00c9a7" : score >= 30 ? "#ffb627" : "#ff4d6d";
  const grade = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 30 ? "Fair" : "Keep Going";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
      <div style={{ position:"relative" }}>
        <svg width={136} height={136} viewBox="0 0 136 136">
          <circle cx={68} cy={68} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={11}/>
          <circle cx={68} cy={68} r={r} fill="none" stroke={color} strokeWidth={11}
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 68 68)"
            style={{ transition:"stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:28, color, lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.04em" }}>score</div>
        </div>
      </div>
      <span className="badge badge-green" style={{ fontSize:12, padding:"5px 12px" }}>{grade}</span>
    </div>
  );
}

function TipCard({ tip, index }) {
  const colors = ["var(--flame)","var(--teal)","var(--violet)","var(--gold)"];
  const c = colors[index % colors.length];
  return (
    <div style={{ background:"var(--bg-2)", border:`1px solid var(--border)`, borderRadius:"var(--r-lg)", padding:18, borderLeft:`3px solid ${c}`, transition:"transform 0.15s" }}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="none"}>
      <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:14, marginBottom:6 }}>{tip.title}</div>
      <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.65, marginBottom:10 }}>{tip.description}</div>
      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:c }}>
        <span>📚</span> {tip.resource}
      </div>
    </div>
  );
}

// Novelty 5: Confidence insight block for the report
function ConfidenceInsight({ insight }) {
  if (!insight) return null;
  const { calibration_type, insight: text, tip } = insight;
  const color = calibration_type === "overconfident" ? "var(--amber)" : calibration_type === "underconfident" ? "var(--violet)" : "var(--green)";
  const icon  = calibration_type === "overconfident" ? "⚠️" : calibration_type === "underconfident" ? "💡" : "✅";
  const title = calibration_type === "overconfident" ? "Overconfident" : calibration_type === "underconfident" ? "Underconfident" : "Well-Calibrated";
  return (
    <div className="card" style={{ marginBottom:22, borderLeft:`3px solid ${color}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <div>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:15, color }}>Confidence Calibration — {title}</div>
        </div>
      </div>
      <p style={{ fontSize:13.5, color:"var(--text-2)", lineHeight:1.7, marginBottom:12 }}>{text}</p>
      {tip && (
        <div style={{ background:"var(--bg-2)", borderRadius:"var(--r)", padding:"10px 14px", fontSize:13, color:"var(--text-2)", borderLeft:`2px solid ${color}` }}>
          💬 <strong style={{ color }}>Tip:</strong> {tip}
        </div>
      )}
    </div>
  );
}

// ── Q&A item with Novelty 2, 4, 5 ─────────────────────────────────────────────
function QAItem({ item, index }) {
  const [open, setOpen] = useState(false);
  const color = item.score >= 75 ? "#10d98a" : item.score >= 50 ? "#00c9a7" : item.score >= 30 ? "#ffb627" : "#ff4d6d";

  const confidenceStars = item.confidence_rating
    ? "★".repeat(item.confidence_rating) + "☆".repeat(5 - item.confidence_rating)
    : null;

  return (
    <div style={{ background:"var(--bg-2)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", marginBottom:10, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", cursor:"pointer", userSelect:"none" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ width:42, height:42, borderRadius:"50%", border:`2.5px solid ${color}`, background:`${color}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:14, color }}>{item.score}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:500, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            Q{index+1}: {item.question}
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <span className={`badge badge-${item.type === "hr" ? "teal" : item.type === "followup" ? "amber" : "blue"}`} style={{ textTransform:"capitalize", fontSize:10 }}>
              {item.type}
            </span>
            {/* Novelty 5: confidence stars in row */}
            {confidenceStars && (
              <span style={{ fontSize:12, color:"var(--gold)", letterSpacing:1 }} title={`Self-confidence: ${item.confidence_rating}/5`}>
                {confidenceStars}
              </span>
            )}
            {item.time_taken > 0 && (
              <span style={{ fontSize:11, color:"var(--text-3)" }}>{item.time_taken}s</span>
            )}
          </div>
        </div>
        <span style={{ color:"var(--text-3)", fontSize:14, transition:"transform 0.2s", transform:open?"rotate(180deg)":"none" }}>▼</span>
      </div>

      {open && (
        <div style={{ padding:"0 18px 18px", borderTop:"1px solid var(--border)" }} className="fade-in">
          <div style={{ paddingTop:14 }}>
            {/* Answer */}
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--text-3)", marginBottom:8 }}>Your answer</div>
            <p style={{ fontSize:13.5, lineHeight:1.7, color:"var(--text-2)", marginBottom:14, background:"var(--bg-3)", borderRadius:"var(--r)", padding:"12px 14px" }}>{item.answer}</p>

            {item.feedback && (
              <div style={{ background:"var(--violet-soft)", border:"1px solid rgba(124,92,191,0.2)", borderRadius:"var(--r)", padding:"12px 14px", fontSize:13, color:"var(--text-2)", lineHeight:1.65, marginBottom:16 }}>
                <span style={{ color:"#b49dfc", fontWeight:600 }}>🤖 AI feedback: </span>{item.feedback}
              </div>
            )}

            {/* Your answer vs ideal */}
            {item.ideal_answer && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-3)", marginBottom:8 }}>Your Answer</div>
                  <p style={{ fontSize:13, lineHeight:1.6, color:"var(--text-2)", background:"var(--bg-3)", padding:12, borderRadius:"var(--r)", border:"1px solid var(--border)" }}>{item.answer}</p>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--green)", marginBottom:8 }}>Ideal Answer</div>
                  <p style={{ fontSize:13, lineHeight:1.6, color:"var(--text-2)", background:"var(--green-soft)", padding:12, borderRadius:"var(--r)", border:"1px solid rgba(16,217,138,0.15)", fontStyle:"italic" }}>{item.ideal_answer}</p>
                </div>
              </div>
            )}

            {/* Novelty 2: Teacher explanation */}
            {item.teacher_explanation && (
              <div style={{ background:"var(--bg-2)", border:"1px solid var(--flame-soft)", borderRadius:"var(--r)", padding:14, marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", color:"var(--flame)", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                  <span>👨‍🏫</span> Teacher's Breakdown
                </div>
                <p style={{ fontSize:13.5, lineHeight:1.7, color:"var(--text-2)" }}>{item.teacher_explanation}</p>
              </div>
            )}

            {/* Novelty 4: Structured resource cards */}
            {item.detailed_resources?.length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-3)", marginBottom:10 }}>📚 Recommended Study Resources</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:10 }}>
                  {item.detailed_resources.map((res,i) => (
                    <a key={i} href={res.url} target="_blank" rel="noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"var(--bg-3)", borderRadius:10, textDecoration:"none", border:"1px solid var(--border)", transition:"background 0.2s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--flame-soft)"}
                      onMouseLeave={e=>e.currentTarget.style.background="var(--bg-3)"}>
                      <span style={{ fontSize:18 }}>🔗</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{res.title}</div>
                        <div style={{ fontSize:11, color:"var(--text-3)" }}>{res.description}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--bg-2)", border:"1px solid var(--border-2)", borderRadius:10, padding:"10px 14px", fontSize:13 }}>
      <div style={{ color:"var(--text-3)", marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:16, color:"var(--flame)" }}>{payload[0].value}</div>
    </div>
  );
};

export default function Report() {
  const { id }                = useParams();
  const navigate              = useNavigate();
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    interviewAPI.getReport(id)
      .then(r => setReport(r.report))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loader"><div className="spinner"/><span>Loading your report…</span></div>;
  if (error || !report) return (
    <div style={{ textAlign:"center", padding:"60px 0" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>😕</div>
      <p style={{ color:"var(--red)", marginBottom:20 }}>{error || "Report not found."}</p>
      <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>← Dashboard</button>
    </div>
  );

  const barData  = report.scores_over_time?.map((s,i) => ({ name:`Q${i+1}`, score:s })) ?? [];
  const barColor = s => s >= 75 ? "#10d98a" : s >= 50 ? "#00c9a7" : s >= 30 ? "#ffb627" : "#ff4d6d";
  const bestScore = Math.max(...(report.scores_over_time ?? [0]));

  return (
    <div className="fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:30, flexWrap:"wrap", gap:16 }}>
        <div>
          <h1 className="page-title">Interview <span>Report</span></h1>
          <p className="page-sub">{report.role} · {report.level} · {new Date(report.created_at).toLocaleDateString("en-US",{dateStyle:"medium"})}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>← Dashboard</button>
      </div>

      {/* Top 3 panels */}
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", gap:18, marginBottom:22, alignItems:"start" }}>
        <div className="card card-glow" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <ScoreRing score={report.avg_score}/>
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { label:"Questions", value:report.total_questions },
              { label:"Best",      value:bestScore, color:"var(--green)" },
            ].map(s => (
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
                <span style={{ color:"var(--text-3)" }}>{s.label}</span>
                <span style={{ fontFamily:"Sora,sans-serif", fontWeight:700, color:s.color||"var(--text)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--green)", marginBottom:14 }}>✓ Strengths</div>
          {report.strengths?.length > 0
            ? report.strengths.map((s,i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", fontSize:13.5, marginBottom:10 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", marginTop:6, flexShrink:0 }}/>
                  {s}
                </div>
              ))
            : <p style={{ fontSize:13, color:"var(--text-3)" }}>Do more interviews to see your strengths.</p>}
        </div>

        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--red)", marginBottom:14 }}>✗ Areas to improve</div>
          {report.weaknesses?.length > 0
            ? report.weaknesses.map((w,i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", fontSize:13.5, marginBottom:10 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--red)", marginTop:6, flexShrink:0 }}/>
                  {w}
                </div>
              ))
            : <p style={{ fontSize:13, color:"var(--text-3)" }}>No major weaknesses — great job!</p>}
        </div>
      </div>

      {/* Score bar chart */}
      <div className="card" style={{ marginBottom:22 }}>
        <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Score per question</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ left:-20 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"/>
            <XAxis dataKey="name" tick={{ fill:"#5a6080", fontSize:11 }} axisLine={false} tickLine={false}/>
            <YAxis domain={[0,100]} tick={{ fill:"#5a6080", fontSize:11 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Bar dataKey="score" radius={[6,6,0,0]}>
              {barData.map((e,i) => <Cell key={i} fill={barColor(e.score)}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Novelty 5: Confidence insight */}
      <ConfidenceInsight insight={report.confidence_insight}/>

      {/* Learning tips */}
      {report.learning_tips?.length > 0 && (
        <div className="card" style={{ marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>📚 Personalised Learning Plan</h2>
            <span className="badge badge-flame">{report.learning_tips.length} tips</span>
          </div>
          <div className="grid-2">
            {report.learning_tips.map((tip,i) => <TipCard key={i} tip={tip} index={i}/>)}
          </div>
        </div>
      )}

      {/* Q&A breakdown */}
      <div className="card" style={{ marginBottom:32 }}>
        <h2 style={{ fontSize:16, fontWeight:700, marginBottom:18 }}>
          Q&A Breakdown <span style={{ fontSize:13, color:"var(--text-3)", fontWeight:400 }}>— tap to expand</span>
        </h2>
        {report.qa_pairs?.map((item,i) => <QAItem key={i} item={item} index={i}/>)}
      </div>

      <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
        <button className="btn btn-primary btn-lg" onClick={() => navigate("/interview")}>🎯 Practice Again</button>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate("/history")}>View All Sessions</button>
      </div>
    </div>
  );
}
