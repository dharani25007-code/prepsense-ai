// Login.jsx — PrepSense AI
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ email:"", password:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎯</div>
          <div className="auth-logo-name">Prep<em>Sense</em></div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Continue your interview journey</p>

        {error && <div className="alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16, marginTop:20 }}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" name="email"
              placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email"/>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password"
              placeholder="••••••••" value={form.password} onChange={handleChange} autoComplete="current-password"/>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width:"100%", marginTop:4 }}>
            {loading ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> Signing in…</> : "Sign in →"}
          </button>
        </form>

        <div className="divider-text" style={{ marginTop:28 }}>New here?</div>
        <p style={{ textAlign:"center", fontSize:14 }}>
          <Link to="/register" style={{ color:"var(--flame)", textDecoration:"none", fontWeight:600 }}>
            Create a free account →
          </Link>
        </p>
      </div>
    </div>
  );
}
