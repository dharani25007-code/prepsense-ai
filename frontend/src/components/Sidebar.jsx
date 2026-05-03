// Sidebar.jsx — PrepSense AI v2
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { path:"/dashboard",  label:"Dashboard",     icon:"▦" },
  { path:"/interview",  label:"New Interview", icon:"◎" },
  { path:"/career-arc", label:"Career Arc",    icon:"🔭" },
  { path:"/history",    label:"History",       icon:"≡" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const initials = user?.name
    ? user.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() : "?";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎯</div>
        <div className="sidebar-logo-text">Prep<em>Sense</em></div>
      </div>
      <div className="nav-section">Menu</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item=>(
          <button key={item.path}
            className={`nav-item ${location.pathname.startsWith(item.path)?"active":""}`}
            onClick={()=>navigate(item.path)}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name||"User"}</div>
            <div className="user-email">{user?.email||""}</div>
          </div>
        </div>
        <button className="nav-item" onClick={()=>{logout();navigate("/login");}}>
          <span className="nav-icon">⎋</span>Log out
        </button>
      </div>
    </aside>
  );
}
