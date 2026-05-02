# PrepSense AI — Adaptive Interview Coach

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![React](https://img.shields.io/badge/react-18.2-61DAFB.svg)
![Flask](https://img.shields.io/badge/flask-3.0.2-black.svg)
![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA%203.3-orange.svg)

> **PrepSense AI** is a full-stack AI-powered interview coaching platform. Every question adapts to your performance in real time, follow-ups probe vague answers automatically, and a detailed report with teacher-level explanations and curated study resources is generated at the end of every session.

---

## ✨ 5 Novelty Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Interview Readiness Index (IRI)** | Composite score combining accuracy (40%), consistency (30%), and improvement trend (30%) — not a plain average. Shown as an animated SVG ring on the dashboard. |
| 2 | **Teacher Explanation Mode** | Every evaluated answer includes a senior-tutor-style breakdown — why you were right or wrong, common pitfalls, advanced nuances, and a model answer. |
| 3 | **Smart Follow-Up Questions** | If your answer is too short or vague, the AI generates a targeted follow-up probe instead of moving on — exactly like a real interviewer would. |
| 4 | **Structured Resource Cards** | Each answer comes with 2–3 verified study links (MDN, GeeksForGeeks, LeetCode, YouTube) rendered as clickable cards inside the report. |
| 5 | **Confidence Tracker** | Rate your confidence (1–5 stars) before submitting each answer. Dashboard and report analyse whether you are overconfident, underconfident, or well-calibrated. |

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, React Router v6, Recharts, Framer Motion |
| Backend | Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-CORS |
| Database | SQLite (auto-created on first run) |
| AI Provider | Groq — `llama-3.3-70b-versatile` |

---

## 📁 Project Structure

```
prepsense-ai/
├── backend/
│   ├── app.py              # All Flask routes + adaptive engine logic
│   ├── ai_engine.py        # Groq API: question gen, evaluation, follow-ups, confidence insight
│   ├── analytics.py        # IRI computation + confidence calibration stats
│   ├── database.py         # SQLAlchemy models: User, Interview, Question, Answer
│   ├── requirements.txt    # Python dependencies
│   └── instance/           # SQLite DB auto-created here on first run
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

## ⚙️ Prerequisites

- Python 3.9+
- Node.js 18+
- npm
- Free [Groq API key](https://console.groq.com)

---

## 🚀 Local Setup

### 1. Clone the repository

```powershell
git clone https://github.com/YOUR_USERNAME/prepsense-ai.git
cd prepsense-ai
```

### 2. Backend setup

```powershell
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET_KEY=any_long_random_string_here
```

> ⚠️ Never commit `.env` to Git. It is already listed in `.gitignore`.
> Get your Groq API key free at [console.groq.com](https://console.groq.com).
> Generate a secure JWT secret: `python -c "import secrets; print(secrets.token_hex(32))"`

Start the backend:

```powershell
python app.py
```

Backend runs at: `http://127.0.0.1:5000`

### 3. Frontend setup

Open a **new terminal**:

```powershell
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

> The `proxy` field in `package.json` automatically routes all `/api/*` calls to `http://localhost:5000`. No extra configuration needed.

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ✗ | Register new user |
| POST | `/api/auth/login` | ✗ | Login, returns JWT token |
| GET  | `/api/auth/me` | ✓ | Get current user profile |
| GET  | `/api/dashboard` | ✓ | Stats, IRI, confidence calibration, history |
| POST | `/api/interviews/start` | ✓ | Start session, returns first question |
| POST | `/api/interviews/<id>/answer` | ✓ | Submit answer + confidence rating |
| POST | `/api/interviews/<id>/confidence` | ✓ | Update confidence rating for an answer |
| POST | `/api/interviews/<id>/end` | ✓ | End early, returns report |
| GET  | `/api/interviews/<id>/report` | ✓ | Fetch full report for a session |

### Answer submission payload

```json
{
  "question_id": 1,
  "answer": "Your answer text here",
  "time_taken": 45,
  "confidence_rating": 4
}
```

---

## 🧠 How the Adaptive Engine Works

```
Start session  →  choose role + level + category
       ↓
AI generates first question (difficulty 5/10)
       ↓
User submits answer + confidence rating (1–5 ★)
       ↓
AI evaluates → score 0–100
       ↙                     ↘
score ≥ 75              score < 40
difficulty + 1          difficulty − 1
       ↓
needs_followup = true?  (answer < 40 words or vague)
  Yes → AI generates targeted follow-up probe   [Novelty 3]
  No  → continue
       ↓
8 questions reached?
  Yes → mark completed → generate final report
  No  → generate next adaptive question
```

---

## 🔧 Configuration

| Variable | File | Notes |
|----------|------|-------|
| `GROQ_API_KEY` | `backend/.env` | **Required** — get free at console.groq.com |
| `JWT_SECRET_KEY` | `backend/.env` | **Required** — any long random string |
| `GROQ_MODEL` | `backend/ai_engine.py` | Default: `llama-3.3-70b-versatile`. Swap to `llama-3.1-8b-instant` for speed |
| `MAX_QUESTIONS` | `backend/app.py` | Default: `8` questions per session |
| `QUESTION_TIME` | `frontend/src/pages/Interview.jsx` | Default: `120` seconds per question |

---

## 🐙 Pushing to GitHub

### First time — create a new repo

```powershell
# Run this from the project root folder (prepsense-ai/)
git init
git add .
git commit -m "feat: initial PrepSense AI release with 5 novelty features"

# Go to github.com → New repository → name it prepsense-ai → Create
# Then come back and run:
git remote add origin https://github.com/YOUR_USERNAME/prepsense-ai.git
git branch -M main
git push -u origin main
```

### After making any changes

```powershell
git add .
git commit -m "describe what you changed"
git push origin main
```

### Useful git commands

```powershell
git status                          # See which files changed
git log --oneline                   # See commit history
git diff                            # See exact line changes
git checkout -b feature/new-thing   # Create a new branch
git push origin feature/new-thing   # Push that branch
```

### What gets committed vs ignored

| File / Folder | Committed? | Reason |
|---------------|------------|--------|
| All `.py` files | ✅ Yes | Source code |
| All `.jsx` / `.js` / `.css` files | ✅ Yes | Source code |
| `requirements.txt`, `package.json` | ✅ Yes | Dependency lists |
| `README.md`, `LICENSE`, `.gitignore` | ✅ Yes | Project files |
| `backend/.env` | ❌ No | Contains secret keys |
| `backend/instance/` | ❌ No | Local database |
| `frontend/node_modules/` | ❌ No | Installed packages (too large) |
| `backend/.venv/` | ❌ No | Virtual environment |

---

## 🛡️ Security Notes

- `.env` is in `.gitignore` — your API keys will never be committed to GitHub
- JWT tokens expire after 24 hours (configurable in `app.py`)
- Passwords are hashed using `werkzeug.security` (bcrypt-based) — never stored in plain text
- CORS is restricted to `http://localhost:3000` — update `app.py` before deploying to production

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for full details.

---

## 🙏 Built With

- [Groq](https://groq.com) — ultra-fast LLaMA 3.3 inference
- [Flask](https://flask.palletsprojects.com) — Python web framework
- [React](https://react.dev) — frontend UI library
- [Recharts](https://recharts.org) — chart components
- [SQLite](https://sqlite.org) — lightweight embedded database