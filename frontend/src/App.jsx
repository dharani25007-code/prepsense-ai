// src/App.jsx — PrepSense AI
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar   from "./components/Sidebar";
import Login     from "./pages/Login";
import Register  from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import Report    from "./pages/Report";
import History   from "./pages/History";
import "./styles/global.css";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg)" }}>
      <div className="spinner" style={{ width:40, height:40, borderWidth:3 }}/>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar/>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="/dashboard" element={<Protected><AppLayout><Dashboard/></AppLayout></Protected>}/>
          <Route path="/interview" element={<Protected><AppLayout><Interview/></AppLayout></Protected>}/>
          <Route path="/report/:id" element={<Protected><AppLayout><Report/></AppLayout></Protected>}/>
          <Route path="/history"  element={<Protected><AppLayout><History/></AppLayout></Protected>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
