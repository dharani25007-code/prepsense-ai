// Interview.jsx — PrepSense AI
// Novelty 3: Smart follow-up badge + explanation
// Novelty 5: Confidence star rating before submitting each answer

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { interviewAPI } from "../utils/api";

const QUESTION_TIME = 120;

const ROLES = [
  "Software Engineer","Frontend Developer","Backend Developer","Full Stack Developer",
  "Data Scientist","Machine Learning Engineer","DevOps Engineer",
  "Product Manager","UX Designer","Data Analyst","Mobile Developer","QA Engineer"
];

// ── Timer ring ────────────────────────────────────────────────────────────────
function TimerRing({ seconds, total }) {
  const r    = 26;
  const circ = 2 * Math.PI * r;
  const pct  = seconds / total;
  const color = pct > 0.5 ? "#10d98a" : pct > 0.25 ? "#ffb627" : "#ff4d6d";
  const m    = Math.floor(seconds / 60);
  const s    = seconds % 60;
  return (
    <div style={{ position:"relative", width:68, height:68, flexShrink:0 }}>
      <svg width={68} height={68} viewBox="0 0 68 68">
        <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5}/>
        <circle cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 34 34)"
          style={{ transition:"stroke-dasharray 1s linear, stroke 0.3s" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:14, color, lineHeight:1 }}>
          {m}:{s.toString().padStart(2,"0")}
        </div>
      </div>
    </div>
  );
}

// ── Novelty 5: Confidence star picker ────────────────────────────────────────
function ConfidencePicker({ value, onChange }) {
  const labels = ["", "Not sure", "Slightly sure", "Fairly sure", "Confident", "Very confident"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ fontSize:12, fontWeight:600, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>
        How confident are you in this answer?
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        {[1,2,3,4,5].map(star => (
          <button key={star} onClick={() => onChange(star)}
            style={{
              background:"none", border:"none", cursor:"pointer", padding:"2px 4px",
              fontSize:22, color: star <= value ? "#ffb627" : "var(--bg-3)",
              transition:"color 0.15s, transform 0.1s",
              transform: star <= value ? "scale(1.15)" : "scale(1)"
            }}>
            ★
          </button>
        ))}
        {value > 0 && (
          <span style={{ fontSize:12, color:"var(--gold)", fontWeight:600, marginLeft:4 }}>
            {labels[value]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Evaluation panel ──────────────────────────────────────────────────────────
function EvalPanel({ ev }) {
  const { score, feedback, strengths, weaknesses, correctness_score, keyword_score, clarity_score,
          ideal_answer, teacher_explanation, structured_resources } = ev;
  const [showTeacher, setShowTeacher] = useState(false);
  const color = score >= 75 ? "#10d98a" : score >= 50 ? "#00c9a7" : score >= 30 ? "#ffb627" : "#ff4d6d";
  const label = score >= 75 ? "Excellent!" : score >= 50 ? "Good answer" : score >= 30 ? "Needs work" : "Keep going";

  return (
    <div className="card card-glow fade-in" style={{ marginTop:20, borderColor:`${color}33` }}>
      <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:20 }}>
        <div style={{
          width:72, height:72, borderRadius:"50%",
          border:`3px solid ${color}`, background:`${color}12`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0
        }}>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:22, color, lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:9, color:`${color}99`, textTransform:"uppercase", letterSpacing:"0.05em" }}>/100</div>
        </div>
        <div>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:17, color, marginBottom:6 }}>{label}</div>
          <p style={{ fontSize:13.5, color:"var(--text-2)", lineHeight:1.6 }}>{feedback}</p>
        </div>
      </div>

      {/* Sub-scores */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"Correctness", val:correctness_score, max:40, color:"var(--flame)" },
          { label:"Keywords",    val:keyword_score,     max:30, color:"var(--teal)" },
          { label:"Clarity",     val:clarity_score,     max:30, color:"var(--violet)" },
        ].map(s => (
          <div key={s.label} style={{ background:"var(--bg-2)", borderRadius:10, padding:12, textAlign:"center", border:"1px solid var(--border)" }}>
            <div style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:20, color:s.color }}>{s.val ?? "—"}</div>
            <div style={{ fontSize:10, color:"var(--text-3)", marginTop:3, textTransform:"uppercase", letterSpacing:"0.04em" }}>{s.label} / {s.max}</div>
          </div>
        ))}
      </div>

      {/* Strengths / Weaknesses */}
      {(strengths?.length > 0 || weaknesses?.length > 0) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {strengths?.length > 0 && (
            <div style={{ background:"var(--green-soft)", border:"1px solid rgba(16,217,138,0.15)", borderRadius:10, padding:12 }}>
              <div style={{ fontSize:10, color:"var(--green)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>✓ Strengths</div>
              {strengths.map((s,i) => <div key={i} style={{ fontSize:12.5, color:"var(--text-2)", marginBottom:4, paddingLeft:8, borderLeft:"2px solid var(--green)" }}>{s}</div>)}
            </div>
          )}
          {weaknesses?.length > 0 && (
            <div style={{ background:"var(--red-soft)", border:"1px solid rgba(255,77,109,0.15)", borderRadius:10, padding:12 }}>
              <div style={{ fontSize:10, color:"var(--red)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>✗ To improve</div>
              {weaknesses.map((w,i) => <div key={i} style={{ fontSize:12.5, color:"var(--text-2)", marginBottom:4, paddingLeft:8, borderLeft:"2px solid var(--red)" }}>{w}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Novelty 2: AI Teacher Insights */}
      {(teacher_explanation || ideal_answer) && (
        <div style={{ borderTop:"1px solid var(--border)", paddingTop:16 }}>
          <button className="btn btn-ghost btn-sm" style={{ width:"100%", justifyContent:"space-between", color:"var(--flame)" }}
            onClick={() => setShowTeacher(!showTeacher)}>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>👨‍🏫</span> AI Teacher's Insights
            </span>
            <span>{showTeacher ? "▲" : "▼"}</span>
          </button>

          {showTeacher && (
            <div className="fade-in" style={{ marginTop:12, display:"flex", flexDirection:"column", gap:14 }}>
              {teacher_explanation && (
                <div style={{ background:"var(--bg-2)", padding:14, borderRadius:"var(--r)", border:"1px solid var(--border-2)" }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--flame)", marginBottom:6 }}>Teacher's Breakdown</div>
                  <p style={{ fontSize:13, lineHeight:1.65, color:"var(--text-2)" }}>{teacher_explanation}</p>
                </div>
              )}
              {ideal_answer && (
                <div style={{ background:"var(--green-soft)", padding:14, borderRadius:"var(--r)", border:"1px solid rgba(16,217,138,0.15)" }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--green)", marginBottom:6 }}>Model Answer</div>
                  <p style={{ fontSize:13, lineHeight:1.65, color:"var(--text-2)", fontStyle:"italic" }}>"{ideal_answer}"</p>
                </div>
              )}
              {/* Novelty 4: Structured Resource Cards */}
              {structured_resources?.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-3)", marginBottom:8 }}>📚 Recommended Study</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {structured_resources.map((res, i) => (
                      <a key={i} href={res.url} target="_blank" rel="noreferrer"
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"var(--flame-soft)", borderRadius:8, textDecoration:"none", border:"1px solid rgba(255,107,53,0.15)" }}>
                        <span style={{ fontSize:16 }}>🔗</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:"var(--flame)" }}>{res.title}</div>
                          <div style={{ fontSize:11, color:"var(--text-3)" }}>{res.description}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Setup screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [form, setForm]       = useState({ role:"Software Engineer", level:"mid", category:"mixed" });
  const [loading, setLoading] = useState(false);

  const levels     = [{ v:"junior", label:"Junior", sub:"0–2 yrs" }, { v:"mid", label:"Mid-level", sub:"2–5 yrs" }, { v:"senior", label:"Senior", sub:"5+ yrs" }];
  const categories = [{ v:"technical", label:"Technical", icon:"💻" }, { v:"hr", label:"HR / Soft", icon:"🤝" }, { v:"mixed", label:"Mixed", icon:"⚡" }];

  return (
    <div className="fade-in" style={{ maxWidth:560, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontSize:52, marginBottom:12 }}>🎯</div>
        <h1 className="page-title" style={{ justifyContent:"center", marginBottom:8 }}>
          Set Up Your <span>Interview</span>
        </h1>
        <p className="page-sub">The AI adapts every question to your level in real time.</p>
      </div>

      <div className="card">
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          {/* Role — Novelty 5: Role × Level × Category Matrix */}
          <div className="form-group">
            <label className="form-label">Target role</label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({...f, role:e.target.value}))}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <div className="form-label" style={{ marginBottom:10 }}>Experience level</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {levels.map(l => (
                <button key={l.v}
                  style={{
                    padding:"13px 10px", borderRadius:"var(--r)", border:`1.5px solid ${form.level===l.v?"var(--flame)":"var(--border-2)"}`,
                    background:form.level===l.v?"var(--flame-soft)":"var(--bg-2)",
                    color:"var(--text)", cursor:"pointer", textAlign:"center", transition:"all 0.15s"
                  }}
                  onClick={() => setForm(f => ({...f, level:l.v}))}>
                  <div style={{ fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:13, color:form.level===l.v?"var(--flame)":"var(--text)" }}>{l.label}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3 }}>{l.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="form-label" style={{ marginBottom:10 }}>Interview type</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {categories.map(c => (
                <button key={c.v}
                  style={{
                    padding:"13px 10px", borderRadius:"var(--r)", border:`1.5px solid ${form.category===c.v?"var(--flame)":"var(--border-2)"}`,
                    background:form.category===c.v?"var(--flame-soft)":"var(--bg-2)",
                    color:"var(--text)", cursor:"pointer", textAlign:"center", transition:"all 0.15s"
                  }}
                  onClick={() => setForm(f => ({...f, category:c.v}))}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{c.icon}</div>
                  <div style={{ fontFamily:"Sora,sans-serif", fontWeight:600, fontSize:12, color:form.category===c.v?"var(--flame)":"var(--text)" }}>{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background:"var(--flame-soft)", border:"1px solid rgba(255,107,53,0.2)", borderRadius:"var(--r)", padding:"12px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:16, flexShrink:0 }}>🤖</span>
            <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>
              AI generates <strong style={{ color:"var(--text)" }}>8 questions</strong>, adapts difficulty after each answer, asks follow-ups when you're vague, and tracks your confidence vs actual performance.
            </p>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width:"100%" }}
            disabled={loading}
            onClick={async () => { setLoading(true); await onStart(form); setLoading(false); }}>
            {loading ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> Starting…</> : "🎯 Start Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live Interview ────────────────────────────────────────────────────────────
export default function Interview() {
  const navigate = useNavigate();
  const [phase, setPhase]               = useState("setup");
  const [interviewId, setInterviewId]   = useState(null);
  const [question, setQuestion]         = useState(null);
  const [answer, setAnswer]             = useState("");
  const [confidence, setConfidence]     = useState(0);   // Novelty 5
  const [progress, setProgress]         = useState({ current:1, total:8 });
  const [evaluation, setEvaluation]     = useState(null);
  const [isFollowup, setIsFollowup]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [timeLeft, setTimeLeft]         = useState(QUESTION_TIME);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  const startTimer = useCallback(() => {
    setTimeLeft(QUESTION_TIME);
    startRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setTimeLeft(t => t <= 1 ? (clearInterval(timerRef.current), 0) : t - 1),
      1000
    );
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleStart = async ({ role, level, category }) => {
    const res = await interviewAPI.start(role, level, category);
    setInterviewId(res.interview_id);
    setQuestion(res.question);
    setProgress({ current:1, total:8 });
    setPhase("active");
    startTimer();
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    const elapsed = Math.round((Date.now() - (startRef.current || Date.now())) / 1000);

    try {
      // Novelty 5: pass confidence rating with every answer
      const res = await interviewAPI.submitAnswer(
        interviewId, question.id, answer.trim(), elapsed, confidence
      );
      setEvaluation(res.evaluation);
      setIsFollowup(res.is_followup ?? false);

      if (res.interview_complete) {
        setTimeout(() => navigate(`/report/${interviewId}`), 3500);
      } else if (res.next_question) {
        setTimeout(() => {
          setQuestion(res.next_question);
          setProgress(res.progress ?? progress);
          setAnswer("");
          setConfidence(0);   // reset stars for next question
          setEvaluation(null);
          setSubmitting(false);
          startTimer();
        }, 3500);
      }
    } catch (err) {
      alert("Error: " + err.message);
      setSubmitting(false);
    }
  };

  if (phase === "setup") return <SetupScreen onStart={handleStart}/>;

  const qType     = question?.type || "technical";
  const diff      = question?.difficulty || 5;
  const diffColor = diff <= 3 ? "#10d98a" : diff <= 6 ? "#ffb627" : "#ff4d6d";
  const diffLabel = diff <= 3 ? "Easy" : diff <= 6 ? "Medium" : "Hard";

  return (
    <div className="fade-in" style={{ maxWidth:720, margin:"0 auto" }}>
      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom:6 }}>Live <span>Interview</span></h1>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span className="badge badge-violet">Q {progress.current} of {progress.total}</span>
            <span className="badge" style={{ background:`${diffColor}15`, color:diffColor, border:`1px solid ${diffColor}30` }}>{diffLabel}</span>
            {/* Novelty 3: Smart follow-up badge */}
            {isFollowup && (
              <span className="badge badge-amber" title="Your previous answer was too vague — the AI is probing deeper">
                ⚡ Follow-up probe
              </span>
            )}
            <span className="badge badge-teal" style={{ textTransform:"capitalize" }}>{qType}</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <TimerRing seconds={timeLeft} total={QUESTION_TIME}/>
          <button className="btn btn-ghost btn-sm"
            onClick={async () => {
              if (!window.confirm("End interview early?")) return;
              clearInterval(timerRef.current);
              await interviewAPI.end(interviewId);
              navigate(`/report/${interviewId}`);
            }}>
            End early
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom:24, height:5 }}>
        <div className="progress-fill" style={{ width:`${((progress.current-1)/progress.total)*100}%` }}/>
      </div>

      {/* Novelty 3: Follow-up explanation banner */}
      {isFollowup && (
        <div style={{ background:"var(--amber-soft)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"var(--r)", padding:"10px 16px", marginBottom:16, display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:18 }}>💬</span>
          <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.5 }}>
            Your previous answer needed more detail. This is a targeted follow-up — be specific and give a concrete example.
          </p>
        </div>
      )}

      {/* Question card */}
      {question && (
        <div className="card card-glow" style={{ marginBottom:20 }}>
          <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
            <div style={{ width:42, height:42, borderRadius:"var(--r-sm)", background:"var(--flame-soft)", border:"1px solid rgba(255,107,53,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
              {qType === "hr" ? "🤝" : qType === "followup" ? "⚡" : "💻"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-3)", marginBottom:8 }}>
                {qType === "followup" ? "Follow-up question" : qType === "hr" ? "HR / Behavioural" : "Technical question"}
              </div>
              <p style={{ fontSize:16, lineHeight:1.75, fontWeight:500 }}>{question.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Answer area */}
      {!evaluation && (
        <div className="card" style={{ marginBottom:16 }}>
          <label className="form-label" style={{ display:"block", marginBottom:10 }}>
            Your answer
            <span style={{ color:"var(--text-3)", fontWeight:400, marginLeft:8 }}>— be specific and detailed</span>
          </label>
          <textarea className="form-textarea" style={{ minHeight:160 }}
            placeholder="Type your answer here…"
            value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitting}/>

          {/* Novelty 5: Confidence picker */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid var(--border)" }}>
            <ConfidencePicker value={confidence} onChange={setConfidence}/>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14 }}>
            <span style={{ fontSize:12, color:"var(--text-3)" }}>
              {answer.split(/\s+/).filter(Boolean).length} words
              {answer.split(/\s+/).filter(Boolean).length < 30 && answer.length > 0 && (
                <span style={{ color:"var(--amber)", marginLeft:6 }}>— try to write more</span>
              )}
            </span>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!answer.trim() || submitting}>
              {submitting ? <><span className="spinner" style={{width:16,height:16,borderWidth:2}}/> Evaluating…</> : "Submit Answer →"}
            </button>
          </div>
        </div>
      )}

      {evaluation && (
        <>
          <EvalPanel ev={evaluation}/>
          <div style={{ textAlign:"center", marginTop:18, color:"var(--text-3)", fontSize:13 }}>
            {submitting ? "⏳ Loading next question…" : "✅ Moving on in a moment…"}
          </div>
        </>
      )}
    </div>
  );
}
