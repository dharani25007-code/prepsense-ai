// Register.jsx — PrepSense AI
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register }          = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ name:"", email:"", password:"", confirm:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError("Please fill in all fields."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎯</div>
          <div className="auth-logo-name">Prep<em>Sense</em></div>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start your AI-powered interview prep today</p>

        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginBottom:24 }}>
          {["AI feedback","Adaptive Q's","Readiness score","Confidence tracker"].map(f => (
            <span key={f} className="badge badge-flame">{f}</span>
          ))}
        </div>

        {error && <div className="alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14, marginTop:12 }}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" name="name" placeholder="Jane Smith"
              value={form.name} onChange={handleChange}/>
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" name="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange}/>
          </div>
          <div className="grid-2" style={{ gap:12 }}>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password" placeholder="Min. 6 chars"
                value={form.password} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm</label>
              <input className="form-input" type="password" name="confirm" placeholder="Repeat"
                value={form.confirm} onChange={handleChange}/>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width:"100%", marginTop:4 }}>
            {loading ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> Creating…</> : "Get started free →"}
          </button>
        </form>

        <div className="divider-text" style={{ marginTop:28 }}>Already have an account?</div>
        <p style={{ textAlign:"center", fontSize:14 }}>
          <Link to="/login" style={{ color:"var(--flame)", textDecoration:"none", fontWeight:600 }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
