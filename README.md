<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f1117,50:6366f1,100:0f1117&height=220&section=header&text=PrepSense%20AI&fontSize=55&fontColor=ffffff&fontAlignY=40&desc=Adaptive%20AI%20Interview%20Coach%20%7C%20Every%20Question%20Learns%20From%20You&descAlignY=60&descSize=17&animation=fadeIn"/>
</div>

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&pause=900&color=6366F1&center=true&vCenter=true&width=750&lines=🎯+Adaptive+Questions+That+Respond+to+Your+Performance;🧠+Teacher-Level+AI+Explanations+for+Every+Answer;📊+Interview+Readiness+Index+%28IRI%29+Dashboard;🔍+Smart+Follow-Up+Probes+on+Vague+Answers;⭐+Confidence+Tracker+%2B+Calibration+Analysis;📚+Verified+Study+Resource+Cards+per+Question)](https://git.io/typing-svg)

<br/>

![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-FF6B00?style=for-the-badge)
![JWT](https://img.shields.io/badge/JWT-Auth-d63aff?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-6366f1?style=for-the-badge)

</div>

---

## 📌 Overview

**PrepSense AI** is a full-stack AI-powered interview coaching platform. Every question adapts to your performance in real time — follow-ups probe vague answers, difficulty scales dynamically, and a detailed report with teacher-level explanations is generated at the end of each session.

> Built with React 18 + Flask + Groq (`llama-3.3-70b-versatile`) — zero paid APIs, 100% local database.

---

## ⭐ 5 New Features

<div align="center">

<table>
  <tr>
    <td width="50%">
      <h3 align="center">📊 Interview Readiness Index (IRI)</h3>
      <p>Composite score combining <strong>accuracy (40%)</strong> + <strong>consistency (30%)</strong> + <strong>improvement trend (30%)</strong> — displayed as an animated ring on the dashboard.</p>
      <p><code>analytics.py</code> → <code>Dashboard.jsx</code></p>
    </td>
    <td width="50%">
      <h3 align="center">🧠 Teacher Explanation Mode</h3>
      <p>Every evaluated answer includes a senior-tutor-style breakdown: why you were right/wrong, common pitfalls, advanced nuances — not just a score.</p>
      <p><code>ai_engine.py</code> → <code>Interview.jsx</code> → <code>Report.jsx</code></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3 align="center">🔍 Smart Follow-Up Questions</h3>
      <p>If your answer is too short or vague, the AI generates a <strong>targeted probe</strong> instead of moving on — just like a real interviewer would.</p>
      <p><code>ai_engine.py</code> → <code>app.py</code> → <code>Interview.jsx</code></p>
    </td>
    <td width="50%">
      <h3 align="center">📚 Structured Resource Cards</h3>
      <p>Each answer comes with <strong>2–3 verified study links</strong> (MDN, GeeksForGeeks, LeetCode, YouTube) rendered as clickable cards in the report.</p>
      <p><code>ai_engine.py</code> → <code>Report.jsx</code></p>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <h3 align="center">⭐ Confidence Tracker</h3>
      <p align="center">Rate your confidence (1–5 stars) before submitting each answer. Dashboard and report reveal whether you're <strong>overconfident, underconfident, or well-calibrated</strong> — one of the most underrated skills in interviews.</p>
      <p align="center"><code>database.py</code> → <code>app.py</code> → <code>Interview.jsx</code> → <code>Dashboard.jsx</code> → <code>Report.jsx</code></p>
    </td>
  </tr>
</table>

</div>

---

## 🏗️ Architecture

```
React Frontend (port 3000)
    │
    ├── AuthContext.jsx     — JWT global state
    ├── Dashboard.jsx       — IRI ring + confidence calibration panel
    ├── Interview.jsx       — Live interview: timer, follow-up badge, confidence stars
    ├── Report.jsx          — Teacher mode, resource cards, confidence insight
    └── History.jsx         — Past sessions
          │
          │  /api/* (proxied via package.json)
          ▼
Flask Backend (port 5000)
    │
    ├── app.py              — All routes + adaptive engine orchestration
    ├── ai_engine.py        — Groq: question gen, evaluation, follow-ups, confidence insight
    ├── analytics.py        — IRI computation + confidence calibration stats
    └── database.py         — SQLAlchemy models: User, Interview, Question, Answer
          │
          ▼
    SQLite (auto-created)
```

### Adaptive Engine Flow

```
Start session → role + level + category chosen
      ↓
AI generates first question (difficulty 5/10)
      ↓
User submits answer + confidence rating (1–5 ★)
      ↓
AI evaluates → score 0–100
      ↙                    ↘
score ≥ 75             score < 40
difficulty + 1         difficulty − 1
      ↓
needs_followup = true?
  Yes → AI generates targeted follow-up probe   ← Novelty #3
  No  → continue
      ↓
8 questions reached?
  Yes → mark complete → generate full report
  No  → generate next adaptive question
```

---

## 🗂️ Project Structure

```
prepsense-ai/
├── backend/
│   ├── app.py              # All Flask routes + adaptive engine logic
│   ├── ai_engine.py        # Groq API: question gen, evaluation, follow-ups
│   ├── analytics.py        # IRI computation + confidence calibration stats
│   ├── database.py         # SQLAlchemy models: User, Interview, Question, Answer
│   ├── requirements.txt
│   └── instance/           # SQLite DB auto-created here on first run
└── frontend/
    ├── public/index.html
    └── src/
        ├── context/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Interview.jsx
        │   ├── Report.jsx
        │   └── History.jsx
        ├── components/
        │   └── Sidebar.jsx
        ├── utils/
        │   └── api.js              # Centralised fetch client
        ├── styles/
        │   └── global.css          # CSS variables design system
        ├── App.jsx
        └── index.jsx
```

---

## 🚀 Getting Started

### Prerequisites

- Python **3.9+**
- Node.js **18+** + npm
- Free [Groq API key](https://console.groq.com)

---

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET_KEY=any_long_random_string_here
```

> ⚠️ The app exits immediately if `JWT_SECRET_KEY` is missing — no silent fallback.

```bash
python app.py
# Runs at http://127.0.0.1:5000
```

---

### 2. Frontend Setup

Open a **new terminal**:

```bash
cd frontend
npm install
npm start
# Runs at http://localhost:3000
```

> The `proxy` field in `package.json` routes all `/api/*` calls to `http://localhost:5000` automatically — no extra config needed.

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ✗ | Register new user |
| POST | `/api/auth/login` | ✗ | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/dashboard` | ✓ | Stats, IRI, confidence calibration, history |
| POST | `/api/interviews/start` | ✓ | Start session, returns first question |
| POST | `/api/interviews/<id>/answer` | ✓ | Submit answer + confidence, returns evaluation + next question |
| POST | `/api/interviews/<id>/confidence` | ✓ | Update confidence rating for an answer |
| POST | `/api/interviews/<id>/end` | ✓ | End early, returns report |
| GET | `/api/interviews/<id>/report` | ✓ | Full report for a session |

### Answer Payload

```json
{
  "question_id": 1,
  "answer": "Your answer text here",
  "time_taken": 45,
  "confidence_rating": 4
}
```

---

## ⚙️ Configuration

| Variable | File | Default | Notes |
|---|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | — | **Required** |
| `JWT_SECRET_KEY` | `backend/.env` | — | **Required** — app exits if missing |
| `GROQ_MODEL` | `backend/ai_engine.py` | `llama-3.3-70b-versatile` | Swap to `llama-3.1-8b-instant` for faster responses |
| `MAX_QUESTIONS` | `backend/app.py` | `8` | Questions per session |
| `QUESTION_TIME` | `frontend/src/pages/Interview.jsx` | `120` (seconds) | Per-question timer |

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18 · React Router v6 · Recharts · Framer Motion |
| Backend | Flask · Flask-JWT-Extended · Flask-SQLAlchemy · Flask-CORS |
| Database | SQLite (auto-created on first run) |
| AI | Groq — `llama-3.3-70b-versatile` |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:0f1117&height=130&section=footer&text=Prepare%20Smarter.%20Interview%20Better.&fontSize=18&fontColor=ffffff&fontAlignY=65&animation=fadeIn"/>

**Built by [Dharanidharan M](https://github.com/dharani25007-code) · Coimbatore, India 🇮🇳**
</div>