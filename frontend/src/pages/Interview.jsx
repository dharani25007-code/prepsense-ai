// Interview.jsx — PrepSense AI v2
// F1: Interviewer Persona Engine  — persona picker on setup screen
// F2: Cognitive Load Detector     — keystroke event tracking on textarea
// F4: Pressure Simulator          — "Apply Pressure" button + defense modal
// F6: Panel Interview Simulator   — panel mode, panelist avatars, multi-agent reactions

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { interviewAPI } from "../utils/api";

const QUESTION_TIME = 120;

const ROLES = [
  "Software Engineer","Frontend Developer","Backend Developer","Full Stack Developer",
  "Data Scientist","Machine Learning Engineer","DevOps Engineer",
  "Product Manager","UX Designer","Data Analyst","Mobile Developer","QA Engineer"
];

// ── F1: Persona cards ─────────────────────────────────────────────────────────
const PERSONA_DATA = {
  standard:             { name:"Standard",           emoji:"🎤", color:"#00c9a7", desc:"Professional & balanced" },
  silent_skeptic:       { name:"Silent Skeptic",     emoji:"🧊", color:"#3b82f6", desc:"Terse. Makes you prove everything." },
  aggressive_challenger:{ name:"Aggressive Challenger",emoji:"🔥",color:"#ff4d6d", desc:"Pushes hard. Challenges every answer." },
  friendly_distractor:  { name:"Friendly Distractor",emoji:"🤝", color:"#ffb627", desc:"Warm & chatty. Tests your focus." },
  speed_gunner:         { name:"Speed Gunner",       emoji:"⚡", color:"#b49dfc", desc:"Rapid-fire. 10 words max." }
};

// ── Timer ring ────────────────────────────────────────────────────────────────
function TimerRing({ seconds, total }) {
  const r = 26, circ = 2 * Math.PI * r, pct = seconds / total;
  const color = pct > 0.5 ? "#10d98a" : pct > 0.25 ? "#ffb627" : "#ff4d6d";
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return (
    <div style={{ position:"relative", width:68, height:68, flexShrink:0 }}>
      <svg width={68} height={68} viewBox="0 0 68 68">
        <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5}/>
        <circle cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 34 34)" style={{transition:"stroke-dasharray 1s linear, stroke 0.3s"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:14,color}}>{m}:{s.toString().padStart(2,"0")}</div>
      </div>
    </div>
  );
}

// ── F2: Cognitive Load indicator ──────────────────────────────────────────────
function CogLoadBadge({ stressScore }) {
  if (!stressScore && stressScore !== 0) return null;
  const color = stressScore > 65 ? "#ff4d6d" : stressScore > 35 ? "#ffb627" : "#10d98a";
  const label = stressScore > 65 ? "High stress" : stressScore > 35 ? "Moderate" : "Calm";
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:"var(--r-full)",
      background:`${color}15`,border:`1px solid ${color}30`}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:color,
        animation:stressScore>35?"pulse 1.2s ease-in-out infinite":"none"}}/>
      <span style={{fontSize:11,color,fontWeight:600}}>Cognitive load: {label}</span>
    </div>
  );
}

// ── Confidence picker ─────────────────────────────────────────────────────────
function ConfidencePicker({ value, onChange }) {
  const labels = ["","Not sure","Slightly sure","Fairly sure","Confident","Very confident"];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{fontSize:12,fontWeight:600,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.06em"}}>
        Confidence in this answer?
      </div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        {[1,2,3,4,5].map(star=>(
          <button key={star} onClick={()=>onChange(star)}
            style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",
              fontSize:22,color:star<=value?"#ffb627":"var(--bg-3)",
              transition:"color 0.15s,transform 0.1s",transform:star<=value?"scale(1.15)":"scale(1)"}}>★</button>
        ))}
        {value>0&&<span style={{fontSize:12,color:"var(--gold)",fontWeight:600,marginLeft:4}}>{labels[value]}</span>}
      </div>
    </div>
  );
}

// ── F4: Pressure modal ────────────────────────────────────────────────────────
function PressureModal({ rebuttal, onSubmitDefense, onClose }) {
  const [defense, setDefense] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div className="card" style={{maxWidth:560,width:"100%",borderColor:"rgba(255,77,109,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:24}}>🔥</span>
          <div>
            <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:15,color:"var(--red)"}}>
              Pressure Applied
            </div>
            <div style={{fontSize:12,color:"var(--text-3)"}}>Defend your answer</div>
          </div>
        </div>
        <div style={{background:"var(--red-soft)",border:"1px solid rgba(255,77,109,0.2)",
          borderRadius:"var(--r)",padding:"12px 16px",marginBottom:16,
          fontSize:14,color:"var(--text)",lineHeight:1.7,fontStyle:"italic"}}>
          "{rebuttal.rebuttal}"
          {rebuttal.sub_question&&<div style={{marginTop:8,fontWeight:600,fontStyle:"normal"}}>
            Also: {rebuttal.sub_question}
          </div>}
        </div>
        <textarea className="form-textarea" style={{minHeight:120}}
          placeholder="Defend your position, provide a concrete example, or acknowledge and correct..."
          value={defense} onChange={e=>setDefense(e.target.value)}/>
        <div style={{display:"flex",gap:10,marginTop:12,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Skip</button>
          <button className="btn btn-primary btn-sm" disabled={!defense.trim()||submitting}
            onClick={async()=>{setSubmitting(true);await onSubmitDefense(defense);setSubmitting(false);}}>
            {submitting?"Evaluating…":"Submit Defense →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── F4: Pressure result display ───────────────────────────────────────────────
function PressureResult({ result }) {
  if (!result) return null;
  const score = result.pressure_recovery_score;
  const color = score>=70?"#10d98a":score>=40?"#ffb627":"#ff4d6d";
  return (
    <div style={{background:"var(--bg-2)",border:`1px solid ${color}30`,borderRadius:"var(--r)",
      padding:"12px 16px",marginTop:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:20,color}}>{score}</div>
        <div>
          <div style={{fontSize:12,fontWeight:600,color}}>Pressure Recovery Score</div>
          <div style={{fontSize:11,color:"var(--text-3)"}}>How well you handled the challenge</div>
        </div>
      </div>
      <p style={{fontSize:13,color:"var(--text-2)",lineHeight:1.6}}>{result.recovery_feedback}</p>
    </div>
  );
}

// ── F6: Panel reaction bubble ─────────────────────────────────────────────────
function PanelReaction({ reaction }) {
  if (!reaction?.reaction_text) return null;
  return (
    <div className="fade-in" style={{background:"var(--bg-2)",border:"1px solid var(--border-2)",
      borderRadius:"var(--r)",padding:"12px 16px",marginTop:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontSize:18}}>{reaction.reactor_emoji}</span>
        <span style={{fontSize:13,fontWeight:600,color:"var(--text-2)"}}>{reaction.reactor_name} reacts:</span>
      </div>
      <p style={{fontSize:13.5,color:"var(--text)",lineHeight:1.65,marginBottom:reaction.follow_up_question?10:0}}>
        {reaction.reaction_text}
      </p>
      {reaction.follow_up_question&&(
        <div style={{background:"var(--violet-soft)",border:"1px solid rgba(124,92,191,0.2)",
          borderRadius:"var(--r-sm)",padding:"8px 12px",fontSize:13,color:"var(--text)"}}>
          <span style={{color:"#b49dfc",fontWeight:600}}>Follow-up: </span>
          {reaction.follow_up_question}
        </div>
      )}
    </div>
  );
}

// ── Evaluation panel ──────────────────────────────────────────────────────────
function EvalPanel({ ev, cogLoad, pressureResult }) {
  const {score,feedback,strengths,weaknesses,correctness_score,keyword_score,clarity_score,
    ideal_answer,teacher_explanation,structured_resources} = ev;
  const [showTeacher,setShowTeacher] = useState(false);
  const color = score>=75?"#10d98a":score>=50?"#00c9a7":score>=30?"#ffb627":"#ff4d6d";
  const label = score>=75?"Excellent!":score>=50?"Good answer":score>=30?"Needs work":"Keep going";

  return (
    <div className="card card-glow fade-in" style={{marginTop:20,borderColor:`${color}33`}}>
      <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:20}}>
        <div style={{width:72,height:72,borderRadius:"50%",border:`3px solid ${color}`,
          background:`${color}12`,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <div style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:22,color,lineHeight:1}}>{score}</div>
          <div style={{fontSize:9,color:`${color}99`,textTransform:"uppercase"}}>/100</div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:17,color,marginBottom:6}}>{label}</div>
          <p style={{fontSize:13.5,color:"var(--text-2)",lineHeight:1.6}}>{feedback}</p>
          {/* F2: cognitive load */}
          {cogLoad&&cogLoad.stress_score!==undefined&&(
            <div style={{marginTop:8,display:"flex",gap:10,flexWrap:"wrap"}}>
              <CogLoadBadge stressScore={cogLoad.stress_score}/>
              {cogLoad.avg_wpm>0&&<span style={{fontSize:11,color:"var(--text-3)"}}>
                {cogLoad.avg_wpm} WPM · {cogLoad.pause_count} pauses
              </span>}
            </div>
          )}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[
          {label:"Correctness",val:correctness_score,max:40,color:"var(--flame)"},
          {label:"Keywords",   val:keyword_score,    max:30,color:"var(--teal)"},
          {label:"Clarity",    val:clarity_score,    max:30,color:"var(--violet)"}
        ].map(s=>(
          <div key={s.label} style={{background:"var(--bg-2)",borderRadius:10,padding:12,
            textAlign:"center",border:"1px solid var(--border)"}}>
            <div style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:20,color:s.color}}>{s.val??"—"}</div>
            <div style={{fontSize:10,color:"var(--text-3)",marginTop:3,textTransform:"uppercase"}}>{s.label}/{s.max}</div>
          </div>
        ))}
      </div>

      {(strengths?.length>0||weaknesses?.length>0)&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {strengths?.length>0&&(
            <div style={{background:"var(--green-soft)",border:"1px solid rgba(16,217,138,0.15)",borderRadius:10,padding:12}}>
              <div style={{fontSize:10,color:"var(--green)",fontWeight:700,textTransform:"uppercase",marginBottom:8}}>✓ Strengths</div>
              {strengths.map((s,i)=><div key={i} style={{fontSize:12.5,color:"var(--text-2)",marginBottom:4,paddingLeft:8,borderLeft:"2px solid var(--green)"}}>{s}</div>)}
            </div>
          )}
          {weaknesses?.length>0&&(
            <div style={{background:"var(--red-soft)",border:"1px solid rgba(255,77,109,0.15)",borderRadius:10,padding:12}}>
              <div style={{fontSize:10,color:"var(--red)",fontWeight:700,textTransform:"uppercase",marginBottom:8}}>✗ To improve</div>
              {weaknesses.map((w,i)=><div key={i} style={{fontSize:12.5,color:"var(--text-2)",marginBottom:4,paddingLeft:8,borderLeft:"2px solid var(--red)"}}>{w}</div>)}
            </div>
          )}
        </div>
      )}

      {/* F4: pressure recovery */}
      {pressureResult&&<PressureResult result={pressureResult}/>}

      {(teacher_explanation||ideal_answer)&&(
        <div style={{borderTop:"1px solid var(--border)",paddingTop:16}}>
          <button className="btn btn-ghost btn-sm" style={{width:"100%",justifyContent:"space-between",color:"var(--flame)"}}
            onClick={()=>setShowTeacher(!showTeacher)}>
            <span style={{display:"flex",alignItems:"center",gap:8}}><span>👨‍🏫</span>AI Teacher's Insights</span>
            <span>{showTeacher?"▲":"▼"}</span>
          </button>
          {showTeacher&&(
            <div className="fade-in" style={{marginTop:12,display:"flex",flexDirection:"column",gap:14}}>
              {teacher_explanation&&(
                <div style={{background:"var(--bg-2)",padding:14,borderRadius:"var(--r)",border:"1px solid var(--border-2)"}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"var(--flame)",marginBottom:6}}>Teacher's Breakdown</div>
                  <p style={{fontSize:13,lineHeight:1.65,color:"var(--text-2)"}}>{teacher_explanation}</p>
                </div>
              )}
              {ideal_answer&&(
                <div style={{background:"var(--green-soft)",padding:14,borderRadius:"var(--r)",border:"1px solid rgba(16,217,138,0.15)"}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"var(--green)",marginBottom:6}}>Model Answer</div>
                  <p style={{fontSize:13,lineHeight:1.65,color:"var(--text-2)",fontStyle:"italic"}}>"{ideal_answer}"</p>
                </div>
              )}
              {structured_resources?.length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"var(--text-3)",marginBottom:8}}>📚 Study Resources</div>
                  {structured_resources.map((r,i)=>(
                    <a key={i} href={r.url} target="_blank" rel="noreferrer"
                      style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",marginBottom:6,
                        background:"var(--flame-soft)",borderRadius:8,textDecoration:"none",border:"1px solid rgba(255,107,53,0.15)"}}>
                      <span>🔗</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--flame)"}}>{r.title}</div>
                        <div style={{fontSize:11,color:"var(--text-3)"}}>{r.description}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── F1+F6: Setup screen ───────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [form, setForm] = useState({role:"Software Engineer",level:"mid",category:"mixed",persona:"standard",mode:"solo"});
  const [loading, setLoading] = useState(false);
  const levels = [{v:"junior",label:"Junior",sub:"0–2 yrs"},{v:"mid",label:"Mid-level",sub:"2–5 yrs"},{v:"senior",label:"Senior",sub:"5+ yrs"}];
  const categories = [{v:"technical",label:"Technical",icon:"💻"},{v:"hr",label:"HR / Soft",icon:"🤝"},{v:"mixed",label:"Mixed",icon:"⚡"}];

  return (
    <div className="fade-in" style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:48,marginBottom:10}}>🎯</div>
        <h1 className="page-title" style={{justifyContent:"center",marginBottom:6}}>
          Set Up Your <span>Interview</span>
        </h1>
        <p className="page-sub">Choose your role, level, interview type, and who will be interviewing you.</p>
      </div>

      <div className="card" style={{display:"flex",flexDirection:"column",gap:24}}>
        {/* Role */}
        <div className="form-group">
          <label className="form-label">Target role</label>
          <select className="form-select" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
            {ROLES.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Level */}
        <div>
          <div className="form-label" style={{marginBottom:10}}>Experience level</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {levels.map(l=>(
              <button key={l.v} onClick={()=>setForm(f=>({...f,level:l.v}))}
                style={{padding:"13px 10px",borderRadius:"var(--r)",
                  border:`1.5px solid ${form.level===l.v?"var(--flame)":"var(--border-2)"}`,
                  background:form.level===l.v?"var(--flame-soft)":"var(--bg-2)",
                  color:"var(--text)",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:13,
                  color:form.level===l.v?"var(--flame)":"var(--text)"}}>{l.label}</div>
                <div style={{fontSize:11,color:"var(--text-3)",marginTop:3}}>{l.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <div className="form-label" style={{marginBottom:10}}>Interview type</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {categories.map(c=>(
              <button key={c.v} onClick={()=>setForm(f=>({...f,category:c.v}))}
                style={{padding:"13px 10px",borderRadius:"var(--r)",
                  border:`1.5px solid ${form.category===c.v?"var(--flame)":"var(--border-2)"}`,
                  background:form.category===c.v?"var(--flame-soft)":"var(--bg-2)",
                  color:"var(--text)",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize:20,marginBottom:4}}>{c.icon}</div>
                <div style={{fontFamily:"Sora,sans-serif",fontWeight:600,fontSize:12,
                  color:form.category===c.v?"var(--flame)":"var(--text)"}}>{c.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Mode — Solo or Panel */}
        <div>
          <div className="form-label" style={{marginBottom:10}}>Interview mode</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {v:"solo",  label:"Solo",  icon:"🎙", desc:"One-on-one with the AI"},
              {v:"panel", label:"Panel", icon:"👥", desc:"3 AI panelists — Hiring Manager, Tech Lead, Peer"}
            ].map(m=>(
              <button key={m.v} onClick={()=>setForm(f=>({...f,mode:m.v}))}
                style={{padding:"14px 12px",borderRadius:"var(--r)",
                  border:`1.5px solid ${form.mode===m.v?"var(--teal)":"var(--border-2)"}`,
                  background:form.mode===m.v?"var(--teal-soft)":"var(--bg-2)",
                  color:"var(--text)",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize:22,marginBottom:4}}>{m.icon}</div>
                <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:13,
                  color:form.mode===m.v?"var(--teal)":"var(--text)"}}>{m.label}</div>
                <div style={{fontSize:11,color:"var(--text-3)",marginTop:3}}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* F1: Persona picker (only in solo mode) */}
        {form.mode==="solo"&&(
          <div>
            <div className="form-label" style={{marginBottom:4}}>Interviewer persona</div>
            <div style={{fontSize:12,color:"var(--text-3)",marginBottom:10}}>
              Who is sitting across from you today?
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.entries(PERSONA_DATA).map(([key,p])=>(
                <button key={key} onClick={()=>setForm(f=>({...f,persona:key}))}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",
                    borderRadius:"var(--r)",textAlign:"left",cursor:"pointer",
                    border:`1.5px solid ${form.persona===key?p.color:"var(--border-2)"}`,
                    background:form.persona===key?`${p.color}12`:"var(--bg-2)",
                    transition:"all 0.15s"}}>
                  <span style={{fontSize:24,flexShrink:0}}>{p.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:13,
                      color:form.persona===key?p.color:"var(--text)"}}>{p.name}</div>
                    <div style={{fontSize:11,color:"var(--text-3)",marginTop:2}}>{p.desc}</div>
                  </div>
                  {form.persona===key&&<span style={{fontSize:16,color:p.color}}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-lg" style={{width:"100%"}} disabled={loading}
          onClick={async()=>{setLoading(true);await onStart(form);setLoading(false);}}>
          {loading?<><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> Starting…</>:"🎯 Start Interview"}
        </button>
      </div>
    </div>
  );
}

// ── Main Interview component ──────────────────────────────────────────────────
export default function Interview() {
  const navigate = useNavigate();
  const [phase,       setPhase]       = useState("setup");
  const [interviewId, setInterviewId] = useState(null);
  const [interviewMode, setInterviewMode] = useState("solo");
  const [persona,     setPersona]     = useState("standard");
  const [question,    setQuestion]    = useState(null);
  const [answer,      setAnswer]      = useState("");
  const [confidence,  setConfidence]  = useState(0);
  const [progress,    setProgress]    = useState({current:1,total:8});
  const [evaluation,  setEvaluation]  = useState(null);
  const [cogLoad,     setCogLoad]     = useState(null);
  const [isFollowup,  setIsFollowup]  = useState(false);
  const [panelReaction, setPanelReaction] = useState(null);
  const [panelNote,   setPanelNote]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(QUESTION_TIME);
  // F4: pressure state
  const [pressureMode, setPressureMode]   = useState(false);
  const [pressureRebuttal, setPressureRebuttal] = useState(null);
  const [pressureResult,   setPressureResult]   = useState(null);
  const [loadingPressure,  setLoadingPressure]  = useState(false);
  const [lastAnswerId,     setLastAnswerId]      = useState(null);

  // F2: keystroke tracking
  const keystrokeEvents = useRef([]);
  const lastKeyTime     = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  const startTimer = useCallback(() => {
    setTimeLeft(QUESTION_TIME);
    startRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(
      ()=>setTimeLeft(t=>t<=1?(clearInterval(timerRef.current),0):t-1), 1000
    );
  }, []);

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  // F2: track keystrokes on textarea
  const handleKeyDown = useCallback((e) => {
    const now = Date.now();
    if (lastKeyTime.current && (now - lastKeyTime.current) > 2000) {
      keystrokeEvents.current.push({type:"pause", duration_ms: now - lastKeyTime.current, timestamp: now});
    }
    if (e.key === "Backspace") {
      keystrokeEvents.current.push({type:"backspace", duration_ms:0, timestamp:now});
    } else if (e.key.length === 1) {
      keystrokeEvents.current.push({type:"key", duration_ms:0, timestamp:now});
    }
    lastKeyTime.current = now;
  }, []);

  const resetKeystrokeTracking = () => {
    keystrokeEvents.current = [];
    lastKeyTime.current = null;
  };

  const handleStart = async ({role, level, category, persona, mode}) => {
    const res = await interviewAPI.start(role, level, category, persona, mode);
    setInterviewId(res.interview_id);
    setQuestion(res.question);
    setInterviewMode(res.mode);
    setPersona(res.persona || "standard");
    setPanelNote(res.panelist_note || "");
    setProgress({current:1, total:8});
    setPhase("active");
    startTimer();
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    const elapsed = Math.round((Date.now()-(startRef.current||Date.now()))/1000);
    try {
      const res = await interviewAPI.submitAnswer(
        interviewId, question.id, answer.trim(), elapsed, confidence, keystrokeEvents.current
      );
      setEvaluation(res.evaluation);
      setCogLoad(res.cognitive_load);
      setIsFollowup(res.is_followup ?? false);
      setPanelReaction(res.panel_reaction || null);
      setPanelNote(res.panelist_note || "");
      setPressureResult(null);

      if (res.interview_complete) {
        setTimeout(()=>navigate(`/report/${interviewId}`), 4000);
      } else if (res.next_question) {
        setTimeout(()=>{
          setQuestion(res.next_question);
          setProgress(res.progress ?? progress);
          setAnswer(""); setConfidence(0);
          setEvaluation(null); setCogLoad(null);
          setPanelReaction(null); setPressureResult(null);
          setPressureRebuttal(null); setPressureMode(false);
          setSubmitting(false);
          resetKeystrokeTracking();
          startTimer();
        }, 4000);
      }
    } catch(err) {
      alert("Error: "+err.message);
      setSubmitting(false);
    }
  };

  // F4: apply pressure mid-question
  const handleApplyPressure = async (pressureType) => {
    if (!answer.trim()) { alert("Write at least a partial answer first."); return; }
    setLoadingPressure(true);
    try {
      const res = await interviewAPI.applyPressure(interviewId, question.text, answer, pressureType);
      setPressureRebuttal(res.rebuttal);
      setPressureMode(true);
    } catch(err) {
      alert("Error: "+err.message);
    } finally { setLoadingPressure(false); }
  };

  const handleDefenseSubmit = async (defense) => {
    try {
      const res = await interviewAPI.submitPressureResponse(
        interviewId, question.text, answer, pressureRebuttal.rebuttal, defense, lastAnswerId
      );
      setPressureResult(res.pressure_result);
      setPressureMode(false);
    } catch(err) {
      alert("Error: "+err.message);
    }
  };

  if (phase === "setup") return <SetupScreen onStart={handleStart}/>;

  const p     = PERSONA_DATA[persona] || PERSONA_DATA.standard;
  const qType = question?.type || "technical";
  const diff  = question?.difficulty || 5;
  const diffColor = diff<=3?"#10d98a":diff<=6?"#ffb627":"#ff4d6d";
  const diffLabel = diff<=3?"Easy":diff<=6?"Medium":"Hard";

  return (
    <div className="fade-in" style={{maxWidth:740,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 className="page-title" style={{marginBottom:6}}>Live <span>Interview</span></h1>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span className="badge badge-violet">Q {progress.current} of {progress.total}</span>
            <span className="badge" style={{background:`${diffColor}15`,color:diffColor,border:`1px solid ${diffColor}30`}}>{diffLabel}</span>
            {isFollowup&&<span className="badge badge-amber">⚡ Follow-up</span>}
            <span className="badge badge-teal" style={{textTransform:"capitalize"}}>{qType}</span>
            {/* F1: persona badge */}
            <span className="badge" style={{background:`${p.color}12`,color:p.color,border:`1px solid ${p.color}25`}}>
              {p.emoji} {p.name}
            </span>
            {/* F6: panel badge */}
            {interviewMode==="panel"&&question?.asked_by&&(
              <span className="badge badge-violet">👥 {question.asked_by}</span>
            )}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <TimerRing seconds={timeLeft} total={QUESTION_TIME}/>
          <button className="btn btn-ghost btn-sm"
            onClick={async()=>{if(!window.confirm("End interview early?"))return;clearInterval(timerRef.current);await interviewAPI.end(interviewId);navigate(`/report/${interviewId}`);}}>
            End early
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{marginBottom:20,height:5}}>
        <div className="progress-fill" style={{width:`${((progress.current-1)/progress.total)*100}%`}}/>
      </div>

      {/* F6: panel note */}
      {panelNote&&(
        <div style={{background:"var(--violet-soft)",border:"1px solid rgba(124,92,191,0.2)",
          borderRadius:"var(--r)",padding:"8px 14px",marginBottom:14,
          fontSize:12.5,color:"var(--text-2)",display:"flex",gap:8,alignItems:"flex-start"}}>
          <span>💡</span><span><strong style={{color:"#b49dfc"}}>Why this question:</strong> {panelNote}</span>
        </div>
      )}

      {/* Follow-up banner */}
      {isFollowup&&(
        <div style={{background:"var(--amber-soft)",border:"1px solid rgba(245,158,11,0.25)",
          borderRadius:"var(--r)",padding:"10px 16px",marginBottom:14,
          display:"flex",gap:10,alignItems:"center"}}>
          <span>💬</span>
          <p style={{fontSize:13,color:"var(--text-2)",lineHeight:1.5}}>
            Your previous answer needed more detail. Give a specific example.
          </p>
        </div>
      )}

      {/* Question card */}
      {question&&(
        <div className="card card-glow" style={{marginBottom:16}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:42,height:42,borderRadius:"var(--r-sm)",
              background:"var(--flame-soft)",border:"1px solid rgba(255,107,53,0.2)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
              {interviewMode==="panel"?"👥":qType==="hr"?"🤝":qType==="followup"?"⚡":"💻"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.06em",color:"var(--text-3)",marginBottom:8}}>
                {interviewMode==="panel"&&question.asked_by?`${question.asked_by} asks`
                  :qType==="followup"?"Follow-up":qType==="hr"?"HR / Behavioural":"Technical"}
              </div>
              <p style={{fontSize:16,lineHeight:1.75,fontWeight:500}}>{question.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Answer area */}
      {!evaluation&&(
        <div className="card" style={{marginBottom:14}}>
          <label className="form-label" style={{display:"block",marginBottom:10}}>
            Your answer
            <span style={{color:"var(--text-3)",fontWeight:400,marginLeft:8}}>— be specific and detailed</span>
          </label>
          <textarea className="form-textarea" style={{minHeight:160}}
            placeholder="Type your answer here…"
            value={answer} onChange={e=>setAnswer(e.target.value)}
            onKeyDown={handleKeyDown} disabled={submitting}/>

          {/* F4: Pressure buttons */}
          <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)",
            display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:"var(--text-3)",fontWeight:600,marginRight:4}}>
              🔥 Apply pressure:
            </span>
            {[
              {type:"challenge",   label:"Challenge me"},
              {type:"skeptical",   label:"Be skeptical"},
              {type:"rapid_fire",  label:"Rapid fire"}
            ].map(pt=>(
              <button key={pt.type} className="btn btn-ghost btn-sm"
                disabled={loadingPressure||!answer.trim()}
                style={{fontSize:12,color:"var(--red)",borderColor:"rgba(255,77,109,0.3)"}}
                onClick={()=>handleApplyPressure(pt.type)}>
                {loadingPressure?"…":pt.label}
              </button>
            ))}
          </div>

          <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)"}}>
            <ConfidencePicker value={confidence} onChange={setConfidence}/>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14}}>
            <span style={{fontSize:12,color:"var(--text-3)"}}>
              {answer.split(/\s+/).filter(Boolean).length} words
              {answer.split(/\s+/).filter(Boolean).length<30&&answer.length>0&&(
                <span style={{color:"var(--amber)",marginLeft:6}}>— try to write more</span>
              )}
            </span>
            <button className="btn btn-primary" onClick={handleSubmit}
              disabled={!answer.trim()||submitting}>
              {submitting?<><span className="spinner" style={{width:16,height:16,borderWidth:2}}/>Evaluating…</>:"Submit Answer →"}
            </button>
          </div>
        </div>
      )}

      {/* Evaluation */}
      {evaluation&&(
        <>
          <EvalPanel ev={evaluation} cogLoad={cogLoad} pressureResult={pressureResult}/>
          {/* F6: Panel reaction */}
          {panelReaction&&<PanelReaction reaction={panelReaction}/>}
          <div style={{textAlign:"center",marginTop:18,color:"var(--text-3)",fontSize:13}}>
            {submitting?"⏳ Loading next question…":"✅ Moving on in a moment…"}
          </div>
        </>
      )}

      {/* F4: Pressure modal */}
      {pressureMode&&pressureRebuttal&&(
        <PressureModal
          rebuttal={pressureRebuttal}
          onSubmitDefense={handleDefenseSubmit}
          onClose={()=>setPressureMode(false)}
        />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
