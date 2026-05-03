"""
PrepSense AI v2 — Flask Backend
All routes including 5 new patentable features:
  F1: Persona Engine    — persona param on /start
  F2: Cognitive Load    — keystroke_events on /answer
  F4: Pressure Sim      — /interviews/<id>/pressure endpoint
  F5: Career Arc        — /career-arc endpoint
  F6: Panel Simulator   — mode=panel on /start, panel round-robin
"""

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import os, json, sys
from database import db, User, Interview, Question, Answer
from ai_engine import AIEngine, PERSONAS, PANEL_PERSONAS
from analytics import AnalyticsEngine

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])
app.config["SQLALCHEMY_DATABASE_URI"]       = "sqlite:///prepsense_v2.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"]                = os.environ.get("JWT_SECRET_KEY", "")
app.config["JWT_ACCESS_TOKEN_EXPIRES"]      = timedelta(hours=24)

if not app.config["JWT_SECRET_KEY"]:
    print("ERROR: JWT_SECRET_KEY not set.", file=sys.stderr); sys.exit(1)

db.init_app(app)
jwt       = JWTManager(app)
ai        = AIEngine()
analytics = AnalyticsEngine()

with app.app_context():
    db.create_all()

MAX_QUESTIONS = 8


# ─── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    name, email, password = data.get("name","").strip(), data.get("email","").strip().lower(), data.get("password","")
    if not all([name, email, password]): return jsonify({"error":"All fields required"}), 400
    if len(password) < 6: return jsonify({"error":"Password min 6 chars"}), 400
    if User.query.filter_by(email=email).first(): return jsonify({"error":"Email taken"}), 409
    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user); db.session.commit()
    return jsonify({"token": create_access_token(identity=str(user.id)), "user": user.to_dict()}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get("email","").strip().lower()).first()
    if not user or not user.check_password(data.get("password","")): return jsonify({"error":"Invalid credentials"}), 401
    return jsonify({"token": create_access_token(identity=str(user.id)), "user": user.to_dict()})

@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    user = User.query.get(get_jwt_identity())
    return jsonify(user.to_dict()) if user else (jsonify({"error":"Not found"}), 404)


# ─── Personas & Panel info (for frontend setup screen) ────────────────────────

@app.route("/api/personas", methods=["GET"])
def get_personas():
    return jsonify({k: {
        "name": v["name"], "emoji": v["emoji"],
        "description": v["description"],
        "interrupt_rate": v["interrupt_rate"]
    } for k, v in PERSONAS.items()})

@app.route("/api/panel-personas", methods=["GET"])
def get_panel_personas():
    return jsonify({k: {
        "name": v["name"], "emoji": v["emoji"], "focus": v["focus"]
    } for k, v in PANEL_PERSONAS.items()})


# ─── Dashboard ─────────────────────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard():
    uid = get_jwt_identity()
    interviews = Interview.query.filter_by(user_id=uid, status="completed").order_by(Interview.created_at.desc()).all()
    conf_stats = analytics.compute_confidence_stats(interviews)
    return jsonify({
        "stats":            analytics.compute_stats(interviews),
        "readiness":        analytics.compute_readiness_index(interviews),
        "confidence_stats": conf_stats,
        "history":          [iv.to_summary() for iv in interviews[:10]]
    })


# ─── F5: Career Arc Predictor ──────────────────────────────────────────────────

@app.route("/api/career-arc", methods=["GET"])
@jwt_required()
def career_arc():
    uid  = get_jwt_identity()
    user = User.query.get(uid)
    interviews = Interview.query.filter_by(user_id=uid, status="completed").all()
    if len(interviews) < 2:
        return jsonify({"error":"Complete at least 2 interviews to unlock Career Arc.", "sessions_needed": max(0, 2 - len(interviews))}), 202
    arc = ai.generate_career_arc(user.name, interviews)
    # Persist arc on user
    user.career_arc_data = json.dumps(arc)
    db.session.commit()
    return jsonify({"arc": arc, "based_on_sessions": len(interviews)})


# ─── Interview Start ───────────────────────────────────────────────────────────

@app.route("/api/interviews/start", methods=["POST"])
@jwt_required()
def start_interview():
    uid  = get_jwt_identity()
    data = request.get_json()
    role     = data.get("role", "Software Engineer")
    level    = data.get("level", "mid")
    category = data.get("category", "mixed")
    # F1: persona
    persona  = data.get("persona", "standard")
    if persona not in PERSONAS: persona = "standard"
    # F6: mode (solo|panel), panel_personas list
    mode            = data.get("mode", "solo")
    panel_persona_keys = data.get("panel_personas", ["hiring_manager","tech_lead","peer_engineer"])

    interview = Interview(
        user_id=uid, role=role, level=level, category=category,
        status="active", current_difficulty=5,
        persona=persona, persona_config=json.dumps(PERSONAS[persona]),
        mode=mode,
        panel_personas=json.dumps(panel_persona_keys if mode=="panel" else []),
        panel_turn_index=0
    )
    db.session.add(interview); db.session.commit()

    try:
        if mode == "panel":
            panelist_key = panel_persona_keys[0]
            q_data = ai.generate_panel_question(
                role, level, category, panelist_key, [], [], 5
            )
            q_data["asked_by"] = q_data.get("asked_by", PANEL_PERSONAS[panelist_key]["name"])
        else:
            q_data = ai.generate_first_question(role, level, category, persona)
            q_data["asked_by"] = ""
    except Exception as e:
        db.session.delete(interview); db.session.commit()
        return jsonify({"error": f"AI error: {e}"}), 502

    question = Question(
        interview_id=interview.id, text=q_data["text"],
        type=q_data["type"], difficulty=q_data["difficulty"],
        expected_keywords=",".join(q_data.get("keywords",[])),
        order=1, asked_by=q_data.get("asked_by","")
    )
    db.session.add(question); db.session.commit()

    resp = {"interview_id": interview.id, "question": question.to_dict(), "mode": mode, "persona": persona}
    if mode == "panel":
        resp["panelist_note"] = q_data.get("panelist_note","")
    return jsonify(resp), 201


# ─── Answer Submission ─────────────────────────────────────────────────────────

@app.route("/api/interviews/<int:interview_id>/answer", methods=["POST"])
@jwt_required()
def submit_answer(interview_id):
    uid = get_jwt_identity()
    interview = Interview.query.filter_by(id=interview_id, user_id=uid).first_or_404()
    if interview.status != "active": return jsonify({"error":"Interview not active"}), 400

    data            = request.get_json()
    question_id     = data.get("question_id")
    answer_text     = data.get("answer","").strip()
    time_taken      = data.get("time_taken", 0)
    confidence_rating = int(data.get("confidence_rating", 0))
    # F2: keystroke events from frontend
    keystroke_events = data.get("keystroke_events", [])

    question = Question.query.filter_by(id=question_id, interview_id=interview_id).first_or_404()
    if not answer_text: return jsonify({"error":"Answer cannot be empty"}), 400

    # F2: compute cognitive load
    cog_load = ai.compute_cognitive_load(
        keystroke_events,
        len(answer_text.split()),
        max(time_taken, 1)
    )

    # Evaluate answer
    try:
        evaluation = ai.evaluate_answer(
            question=question.text, answer=answer_text,
            expected_keywords=question.expected_keywords.split(",") if question.expected_keywords else [],
            question_type=question.type, difficulty=question.difficulty
        )
    except Exception as e:
        return jsonify({"error": f"AI eval error: {e}"}), 502

    answer = Answer(
        question_id=question.id, interview_id=interview.id,
        text=answer_text, score=evaluation["score"],
        feedback=evaluation["feedback"],
        strengths=",".join(evaluation.get("strengths",[])),
        weaknesses=",".join(evaluation.get("weaknesses",[])),
        improvements=evaluation.get("improvements",""),
        ideal_answer=evaluation.get("ideal_answer",""),
        teacher_explanation=evaluation.get("teacher_explanation",""),
        detailed_resources=json.dumps(evaluation.get("structured_resources",[])),
        resources=",".join([r.get("url","") for r in evaluation.get("structured_resources",[])]),
        confidence_rating=confidence_rating, time_taken=time_taken,
        cognitive_load=json.dumps(cog_load)
    )
    db.session.add(answer)

    # Adaptive difficulty
    score = evaluation["score"]
    if score >= 75: interview.current_difficulty = min(10, interview.current_difficulty + 1)
    elif score < 40: interview.current_difficulty = max(1, interview.current_difficulty - 1)

    question_count = Question.query.filter_by(interview_id=interview_id).count()

    # F6: panel reaction from another panelist
    panel_reaction = None
    if interview.mode == "panel":
        panel_keys = json.loads(interview.panel_personas or "[]")
        if len(panel_keys) > 1:
            asking_key = next((k for k in panel_keys
                               if PANEL_PERSONAS.get(k,{}).get("name","") == question.asked_by), panel_keys[0])
            try:
                panel_reaction = ai.generate_panel_reaction(
                    panel_keys, question.text, answer_text, score, asking_key
                )
            except Exception:
                panel_reaction = None

        # Update panel transcript
        transcript = json.loads(interview.panel_transcript or "[]")
        transcript.append({
            "panelist": question.asked_by,
            "question": question.text,
            "answer":   answer_text,
            "score":    score
        })
        interview.panel_transcript = json.dumps(transcript)

    db.session.commit()

    # Check smart follow-up
    if evaluation.get("needs_followup") and question_count < MAX_QUESTIONS:
        try:
            followup = ai.generate_followup(question.text, answer_text, interview.role, interview.persona)
        except Exception:
            followup = {"text":"Can you elaborate with a specific example?","keywords":[]}
        next_q = Question(
            interview_id=interview.id, text=followup["text"],
            type="followup", difficulty=question.difficulty,
            expected_keywords=",".join(followup.get("keywords",[])),
            order=question_count+1, asked_by=question.asked_by
        )
        db.session.add(next_q); db.session.commit()
        return jsonify({
            "evaluation": evaluation, "cognitive_load": cog_load,
            "next_question": next_q.to_dict(), "is_followup": True,
            "panel_reaction": panel_reaction,
            "progress": {"current": question_count+1, "total": MAX_QUESTIONS}
        })

    if question_count >= MAX_QUESTIONS:
        interview.status = "completed"; db.session.commit()
        return jsonify({
            "evaluation": evaluation, "cognitive_load": cog_load,
            "panel_reaction": panel_reaction,
            "interview_complete": True, "report": _build_report(interview)
        })

    # Generate next question
    try:
        if interview.mode == "panel":
            panel_keys = json.loads(interview.panel_personas or "[]")
            turn_idx   = (interview.panel_turn_index + 1) % len(panel_keys)
            interview.panel_turn_index = turn_idx
            panelist_key = panel_keys[turn_idx]
            transcript   = json.loads(interview.panel_transcript or "[]")
            q_data = ai.generate_panel_question(
                interview.role, interview.level, interview.category,
                panelist_key, [q.text for q in interview.questions],
                transcript, interview.current_difficulty
            )
            db.session.commit()
        else:
            q_data = ai.generate_next_question(
                interview.role, interview.level, interview.category,
                interview.current_difficulty,
                [q.text for q in interview.questions],
                score, interview.persona
            )
            q_data["asked_by"] = ""
    except Exception as e:
        return jsonify({"error": f"AI error: {e}"}), 502

    next_q = Question(
        interview_id=interview.id, text=q_data["text"],
        type=q_data["type"], difficulty=q_data["difficulty"],
        expected_keywords=",".join(q_data.get("keywords",[])),
        order=question_count+1, asked_by=q_data.get("asked_by","")
    )
    db.session.add(next_q); db.session.commit()
    return jsonify({
        "evaluation": evaluation, "cognitive_load": cog_load,
        "next_question": next_q.to_dict(), "is_followup": False,
        "panel_reaction": panel_reaction,
        "panelist_note":  q_data.get("panelist_note",""),
        "progress": {"current": question_count+1, "total": MAX_QUESTIONS}
    })


# ─── F4: Pressure Simulator ────────────────────────────────────────────────────

@app.route("/api/interviews/<int:interview_id>/pressure", methods=["POST"])
@jwt_required()
def pressure_rebuttal(interview_id):
    """
    Triggered by frontend when user clicks 'Apply Pressure' mid-answer.
    Returns an adversarial challenge. User must then respond.
    """
    uid = get_jwt_identity()
    interview = Interview.query.filter_by(id=interview_id, user_id=uid).first_or_404()
    data = request.get_json()
    question_text  = data.get("question","")
    current_answer = data.get("current_answer","")
    pressure_type  = data.get("pressure_type","challenge")  # challenge|rapid_fire|skeptical

    try:
        rebuttal = ai.generate_pressure_rebuttal(
            question_text, current_answer, interview.role, pressure_type
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    return jsonify({"rebuttal": rebuttal})


@app.route("/api/interviews/<int:interview_id>/pressure-response", methods=["POST"])
@jwt_required()
def pressure_response(interview_id):
    """
    User submits their defense after a pressure rebuttal.
    Scores their recovery.
    """
    uid = get_jwt_identity()
    interview = Interview.query.filter_by(id=interview_id, user_id=uid).first_or_404()
    data = request.get_json()
    original_question = data.get("original_question","")
    original_answer   = data.get("original_answer","")
    rebuttal          = data.get("rebuttal","")
    defense           = data.get("defense","")
    answer_id         = data.get("answer_id")

    try:
        result = ai.evaluate_pressure_response(original_question, original_answer, rebuttal, defense)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    # Update the answer record with pressure data if answer_id provided
    if answer_id:
        answer = Answer.query.get(answer_id)
        if answer:
            events = json.loads(answer.pressure_events or "[]")
            events.append({"rebuttal": rebuttal, "defense": defense, "result": result})
            answer.pressure_events = json.dumps(events)
            answer.pressure_recovery_score = result["pressure_recovery_score"]
            db.session.commit()

    return jsonify({"pressure_result": result})


# ─── End Interview ─────────────────────────────────────────────────────────────

@app.route("/api/interviews/<int:interview_id>/end", methods=["POST"])
@jwt_required()
def end_interview(interview_id):
    uid = get_jwt_identity()
    interview = Interview.query.filter_by(id=interview_id, user_id=uid).first_or_404()
    interview.status = "completed"; db.session.commit()
    return jsonify({"report": _build_report(interview)})

@app.route("/api/interviews/<int:interview_id>/report", methods=["GET"])
@jwt_required()
def get_report(interview_id):
    uid = get_jwt_identity()
    interview = Interview.query.filter_by(id=interview_id, user_id=uid).first_or_404()
    return jsonify({"report": _build_report(interview)})

@app.route("/api/interviews/<int:interview_id>/confidence", methods=["POST"])
@jwt_required()
def rate_confidence(interview_id):
    uid = get_jwt_identity()
    interview = Interview.query.filter_by(id=interview_id, user_id=uid).first_or_404()
    data   = request.get_json()
    answer = Answer.query.filter_by(id=data.get("answer_id"), interview_id=interview_id).first_or_404()
    answer.confidence_rating = max(1, min(5, int(data.get("rating",3))))
    db.session.commit()
    return jsonify({"ok": True})


# ─── Report builder ────────────────────────────────────────────────────────────

def _build_report(interview):
    answers = Answer.query.filter_by(interview_id=interview.id).all()
    if not answers: return {"error":"No answers found"}

    scores    = [a.score for a in answers]
    avg_score = round(sum(scores)/len(scores))
    all_s, all_w = [], []
    for a in answers:
        if a.strengths:  all_s.extend(a.strengths.split(","))
        if a.weaknesses: all_w.extend(a.weaknesses.split(","))

    strengths  = list(set(s.strip() for s in all_s if s.strip()))[:5]
    weaknesses = list(set(w.strip() for w in all_w if w.strip()))[:5]

    try: tips = ai.generate_learning_tips(interview.role, weaknesses, avg_score)
    except Exception: tips = []

    # F2: aggregate cognitive load across all answers
    stress_scores, all_wpm = [], []
    for a in answers:
        try:
            cl = json.loads(a.cognitive_load or "{}")
            if "stress_score" in cl: stress_scores.append(cl["stress_score"])
            if "avg_wpm"     in cl: all_wpm.append(cl["avg_wpm"])
        except Exception: pass
    cognitive_summary = {
        "avg_stress":  round(sum(stress_scores)/len(stress_scores)) if stress_scores else 0,
        "avg_wpm":     round(sum(all_wpm)/len(all_wpm),1) if all_wpm else 0,
        "peak_stress": max(stress_scores) if stress_scores else 0
    }

    # F4: aggregate pressure recovery
    pr_scores = [a.pressure_recovery_score for a in answers if a.pressure_recovery_score > 0]
    pressure_summary = {
        "sessions_with_pressure": len(pr_scores),
        "avg_recovery": round(sum(pr_scores)/len(pr_scores)) if pr_scores else None
    }

    qa_pairs = []
    for q in interview.questions:
        ans = next((a for a in answers if a.question_id == q.id), None)
        cl  = {}
        try: cl = json.loads(ans.cognitive_load or "{}") if ans else {}
        except Exception: pass
        pe = []
        try: pe = json.loads(ans.pressure_events or "[]") if ans else []
        except Exception: pass
        qa_pairs.append({
            "question":             q.text,
            "asked_by":             q.asked_by,
            "answer":               ans.text if ans else "Not answered",
            "score":                ans.score if ans else 0,
            "feedback":             ans.feedback if ans else "",
            "improvements":         ans.improvements if ans else "",
            "ideal_answer":         ans.ideal_answer if ans else "",
            "teacher_explanation":  ans.teacher_explanation if ans else "",
            "detailed_resources":   json.loads(ans.detailed_resources) if ans and ans.detailed_resources else [],
            "confidence_rating":    ans.confidence_rating if ans else 0,
            "cognitive_load":       cl,
            "pressure_events":      pe,
            "pressure_recovery_score": ans.pressure_recovery_score if ans else 0,
            "type":                 q.type,
            "time_taken":           ans.time_taken if ans else 0
        })

    return {
        "interview_id":    interview.id,
        "role":            interview.role,
        "level":           interview.level,
        "persona":         interview.persona,
        "mode":            interview.mode,
        "avg_score":       avg_score,
        "total_questions": len(answers),
        "scores_over_time":scores,
        "strengths":       strengths,
        "weaknesses":      weaknesses,
        "learning_tips":   tips,
        "cognitive_summary":  cognitive_summary,
        "pressure_summary":   pressure_summary,
        "qa_pairs":        qa_pairs,
        "created_at":      interview.created_at.isoformat()
    }


if __name__ == "__main__":
    app.run(debug=True, port=5000)
