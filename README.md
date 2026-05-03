# PrepSense AI — Adaptive Interview Coach

> A full-stack AI-powered interview coaching platform. Every question adapts to your performance in real time, follow-ups probe vague answers, and a detailed report with teacher-level explanations is generated at the end.

---

## ✨ 5 Novelty Features

| # | Feature | Where it lives |
|---|---------|---------------|
| 1 | **Interview Readiness Index (IRI)** — composite score (accuracy 40% + consistency 30% + improvement trend 30%), shown as an animated ring on the dashboard | `analytics.py` → `Dashboard.jsx` |
| 2 | **Teacher Explanation Mode** — every evaluated answer includes a senior-tutor-style breakdown: why you were right/wrong, common pitfalls, advanced nuances | `ai_engine.py` → `Interview.jsx` → `Report.jsx` |
| 3 | **Smart Follow-Up Questions** — if your answer is too short or vague, the AI generates a targeted probe instead of moving on | `ai_engine.py` → `app.py` → `Interview.jsx` |
| 4 | **Structured Resource Cards** — each answer comes with 2–3 verified study links (MDN, GeeksForGeeks, LeetCode, YouTube) rendered as clickable cards | `ai_engine.py` → `Report.jsx` |
| 5 | **Confidence Tracker** — rate your confidence (1–5 stars) before submitting each answer; dashboard and report show whether you're overconfident, underconfident, or well-calibrated | `database.py` → `app.py` → `Interview.jsx` → `Dashboard.jsx` → `Report.jsx` |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, React Router v6, Recharts, Framer Motion |
| Backend | Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-CORS |
| Database | SQLite (auto-created on first run) |
| AI | Groq — `llama-3.3-70b-versatile` |

---

## Project Structure

```
prepsense-ai/
├── backend/
│   ├── app.py              # All Flask routes + adaptive engine logic
│   ├── ai_engine.py        # Groq API: question gen, evaluation, follow-ups, confidence insight
│   ├── analytics.py        # IRI computation + confidence calibration stats
│   ├── database.py         # SQLAlchemy models: User, Interview, Question, Answer
│   ├── requirements.txt
│   └── instance/           # SQLite DB created here on first run
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx     # Global JWT auth state
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx       # IRI ring + confidence calibration panel
    │   │   ├── Interview.jsx       # Live interview: timer, follow-up badge, confidence stars
    │   │   ├── Report.jsx          # Full report: teacher mode, resource cards, confidence insight
    │   │   └── History.jsx
    │   ├── components/
    │   │   └── Sidebar.jsx
    │   ├── utils/
    │   │   └── api.js              # Centralised fetch client (uses package.json proxy)
    │   ├── styles/
    │   │   └── global.css          # Full design system with CSS variables
    │   ├── App.jsx
    │   └── index.jsx
    └── package.json
```

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm
- Free [Groq API key](https://console.groq.com)

---

## Local Setup

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1       # Windows
# source .venv/bin/activate         # macOS / Linux
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET_KEY=any_long_random_string_here
```

> ⚠️ The app exits immediately if `JWT_SECRET_KEY` is missing — no silent fallback.

Start backend:

```powershell
python app.py
```

Runs at `http://127.0.0.1:5000`

---

### 2. Frontend

Open a **new terminal**:

```powershell
cd frontend
npm install
npm start
```

Runs at `http://localhost:3000`

> The `proxy` field in `package.json` routes all `/api/*` calls to `http://localhost:5000` — no extra config needed.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ✗ | Register new user |
| POST | `/api/auth/login` | ✗ | Login, returns JWT |
| GET  | `/api/auth/me` | ✓ | Get current user |
| GET  | `/api/dashboard` | ✓ | Stats, IRI, confidence calibration, history |
| POST | `/api/interviews/start` | ✓ | Start session, returns first question |
| POST | `/api/interviews/<id>/answer` | ✓ | Submit answer (with confidence_rating), returns evaluation + next question |
| POST | `/api/interviews/<id>/confidence` | ✓ | Update confidence rating for an answer |
| POST | `/api/interviews/<id>/end` | ✓ | End early, returns report |
| GET  | `/api/interviews/<id>/report` | ✓ | Full report for a session |

### Answer payload (POST `/api/interviews/<id>/answer`)

```json
{
  "question_id": 1,
  "answer": "Your answer text here",
  "time_taken": 45,
  "confidence_rating": 4
}
```

---

## How the Adaptive Engine Works

```
Start session  →  role + level + category chosen
       ↓
AI generates first question (difficulty 5 / 10)
       ↓
User submits answer + confidence rating (1–5 ★)
       ↓
AI evaluates  →  score 0–100
       ↙                    ↘
score ≥ 75             score < 40
difficulty + 1         difficulty − 1
       ↓
needs_followup = true?
  Yes → AI generates targeted follow-up probe  (Novelty 3)
  No  → continue
       ↓
8 questions reached?
  Yes → mark completed → generate final report
  No  → generate next adaptive question
```

---

## Configuration

| Variable | File | Default | Notes |
|----------|------|---------|-------|
| `GROQ_API_KEY` | `backend/.env` | — | **Required** |
| `JWT_SECRET_KEY` | `backend/.env` | — | **Required** — app exits if missing |
| `GROQ_MODEL` | `backend/ai_engine.py` | `llama-3.3-70b-versatile` | Swap to `llama-3.1-8b-instant` for faster responses |
| `MAX_QUESTIONS` | `backend/app.py` | `8` | Questions per session |
| `QUESTION_TIME` | `frontend/src/pages/Interview.jsx` | `120` (seconds) | Per-question timer |

---

## Git

```powershell
git add .
git commit -m "feat: PrepSense AI — all 5 novelty features complete"
git push origin main
```

---

## License

MIT — free to use, modify, and distribute.
