"""
AI Engine — PrepSense AI v2
Features built in:
  F1: Interviewer Persona Engine      — persona-driven question generation
  F2: Cognitive Load Detector         — compute_cognitive_load()
  F4: Pressure Simulator              — generate_pressure_rebuttal()
  F5: Career Arc Predictor            — generate_career_arc()
  F6: Panel Interview Simulator       — generate_panel_question()
  + existing: teacher mode, smart follow-up, resource cards, confidence insight
"""

import os
import json
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
GROQ_MODEL = "llama-3.3-70b-versatile"

# ── F1: All persona definitions ───────────────────────────────────────────────
PERSONAS = {
    "standard": {
        "name": "Standard Interviewer",
        "emoji": "🎤",
        "description": "Professional, balanced, warm.",
        "system_prefix": "You are a professional, balanced interviewer. Be encouraging but thorough.",
        "interrupt_rate": 0,
        "style_notes": "Ask clear, structured questions. Give the candidate time to think."
    },
    "silent_skeptic": {
        "name": "Silent Skeptic",
        "emoji": "🧊",
        "description": "Says little. Long silences. Makes you prove everything.",
        "system_prefix": "You are a famously terse, skeptical interviewer. You speak as few words as possible. Your questions are short and pointed. You never say 'great' or 'good'. You expect candidates to fill the silence and prove themselves without prompting.",
        "interrupt_rate": 0,
        "style_notes": "Keep every question under 15 words. No filler phrases. No encouragement."
    },
    "aggressive_challenger": {
        "name": "Aggressive Challenger",
        "emoji": "🔥",
        "description": "Pushes hard. Questions your every assumption.",
        "system_prefix": "You are a tough, direct interviewer who challenges every answer. Your follow-up is always 'but why?' or 'prove it' or 'that's too generic'. You expect precise, defensible answers and you push back immediately on vague responses.",
        "interrupt_rate": 3,
        "style_notes": "Be direct and slightly confrontational. Do not accept surface-level answers."
    },
    "friendly_distractor": {
        "name": "Friendly Distractor",
        "emoji": "🤝",
        "description": "Warm and chatty. Takes tangents. Tests your focus.",
        "system_prefix": "You are a very friendly, conversational interviewer who occasionally goes off on tangents before returning to the real question. You tell short anecdotes, make jokes, and then pivot back to probing questions. This tests whether the candidate stays focused.",
        "interrupt_rate": 0,
        "style_notes": "Be warm and human. Occasionally add a one-sentence tangent before the real question."
    },
    "speed_gunner": {
        "name": "Speed Gunner",
        "emoji": "⚡",
        "description": "Rapid fire. Short questions. No pause.",
        "system_prefix": "You are a rapid-fire interviewer. Your questions are very short (under 10 words). You move fast. You never expand on questions. The candidate must keep up. This tests speed of thought.",
        "interrupt_rate": 0,
        "style_notes": "Maximum 10 words per question. No sub-clauses. Fire immediately."
    }
}

# ── F6: Panel persona definitions ────────────────────────────────────────────
PANEL_PERSONAS = {
    "hiring_manager": {
        "name": "Alex (Hiring Manager)",
        "emoji": "👔",
        "focus": "culture fit, leadership, team impact",
        "system_prefix": "You are Alex, the hiring manager. You care most about leadership potential, culture fit, and how the candidate impacts their team. Ask strategic, impact-focused questions."
    },
    "tech_lead": {
        "name": "Jordan (Tech Lead)",
        "emoji": "💻",
        "focus": "technical depth, architecture, code quality",
        "system_prefix": "You are Jordan, the tech lead. You care about deep technical knowledge, system design, and code quality. Ask precise technical questions and probe for depth."
    },
    "peer_engineer": {
        "name": "Sam (Peer Engineer)",
        "emoji": "🤝",
        "focus": "collaboration, problem-solving approach, day-to-day work",
        "system_prefix": "You are Sam, a peer engineer who would work alongside this candidate. You care about how they collaborate, handle ambiguity, and approach real day-to-day problems. Ask practical, grounded questions."
    }
}


def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.7,
    )
    return response.choices[0].message.content


def _parse_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        text = text.rstrip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        for open_c, close_c in [("{", "}"), ("[", "]")]:
            start = text.find(open_c)
            end   = text.rfind(close_c) + 1
            if start != -1 and end > start:
                try:
                    return json.loads(text[start:end])
                except Exception:
                    pass
    return {"raw": text}


class AIEngine:

    # ─── F1: Persona-aware question generation ────────────────────────────────

    def _persona_system(self, persona_key: str) -> str:
        p = PERSONAS.get(persona_key, PERSONAS["standard"])
        return p["system_prefix"] + f"\n\nStyle notes: {p['style_notes']}\nRespond with ONLY valid JSON — no markdown, no extra text."

    def generate_first_question(self, role: str, level: str, category: str, persona: str = "standard") -> dict:
        system = self._persona_system(persona)
        user = f"""Generate the FIRST interview question for:
- Role: {role}
- Level: {level} (junior=0-2yr / mid=2-5yr / senior=5+yr)
- Category: {category} (technical / hr / mixed)

Start with a warm-up appropriate for this EXACT role and level.

Respond with ONLY this JSON:
{{
  "text": "<question text>",
  "type": "technical|hr|mixed",
  "difficulty": <1-10 integer>,
  "keywords": ["keyword1", "keyword2"]
}}"""
        result = _parse_json(_call_groq(system, user))
        return {
            "text":       result.get("text", "Tell me about yourself."),
            "type":       result.get("type", "hr"),
            "difficulty": int(result.get("difficulty", 3)),
            "keywords":   result.get("keywords", [])
        }

    def generate_next_question(self, role, level, category, difficulty, previous_questions,
                                last_score, persona: str = "standard") -> dict:
        system = self._persona_system(persona)
        prev_list = "\n".join(f"- {q}" for q in previous_questions[-5:])
        user = f"""Generate the NEXT adaptive interview question.

Context:
- Role: {role}, Level: {level}, Category: {category}
- Target difficulty: {difficulty}/10
- Last answer score: {last_score}/100
- Recent questions (do NOT repeat):
{prev_list}

Rules:
- Never repeat any previous question
- Match difficulty: {difficulty}/10
- score < 40 → easier; score > 75 → harder
- mixed category: alternate technical and HR

Respond with ONLY this JSON:
{{
  "text": "<question text>",
  "type": "technical|hr|followup",
  "difficulty": {difficulty},
  "keywords": ["keyword1", "keyword2"]
}}"""
        result = _parse_json(_call_groq(system, user))
        return {
            "text":       result.get("text", "Describe a challenging project you worked on."),
            "type":       result.get("type", "technical"),
            "difficulty": int(result.get("difficulty", difficulty)),
            "keywords":   result.get("keywords", [])
        }

    def generate_followup(self, original_question, answer, interview_role, persona: str = "standard") -> dict:
        system = self._persona_system(persona)
        user = f"""The candidate was asked: "{original_question}"
Their answer: "{answer[:500]}"
Role: {interview_role}

Their answer was vague or too short. Generate ONE targeted follow-up that:
- Probes exactly what was missing
- Asks for a concrete example or metric
- Cannot be answered with yes/no

Respond with ONLY this JSON:
{{
  "text": "<follow-up question>",
  "keywords": ["keyword1", "keyword2"]
}}"""
        result = _parse_json(_call_groq(system, user))
        return {
            "text":     result.get("text", "Can you give me a specific example?"),
            "keywords": result.get("keywords", [])
        }

    # ─── F6: Panel Interview Simulator ────────────────────────────────────────

    def generate_panel_question(self, role: str, level: str, category: str,
                                 panelist_key: str, previous_questions: list,
                                 panel_transcript: list, difficulty: int) -> dict:
        """
        Generates a question from a specific panelist, aware of what other
        panelists have already asked and said.
        """
        p = PANEL_PERSONAS.get(panelist_key, PANEL_PERSONAS["hiring_manager"])
        prev_qs = "\n".join(f"- {q}" for q in previous_questions[-6:]) or "None yet."
        transcript_summary = ""
        if panel_transcript:
            last3 = panel_transcript[-3:]
            transcript_summary = "\n".join(
                f"  {t['panelist']} asked: \"{t['question'][:80]}\" → candidate scored {t.get('score','?')}/100"
                for t in last3
            )

        system = (
            p["system_prefix"] +
            f"\nYou focus on: {p['focus']}."
            "\nRespond with ONLY valid JSON — no markdown, no extra text."
        )
        user = f"""You are interviewing a {level} {role} candidate.

Questions already asked in this panel interview:
{prev_qs}

Recent panel exchange:
{transcript_summary or 'Panel just started.'}

Your focus area: {p['focus']}
Target difficulty: {difficulty}/10

Generate your next interview question. Make it different from all previous questions.
Build on or contrast with what other panelists have explored.

Respond with ONLY this JSON:
{{
  "text": "<your question as {p['name']}>",
  "type": "technical|hr|mixed",
  "difficulty": {difficulty},
  "keywords": ["keyword1", "keyword2"],
  "panelist_note": "<1 sentence: why YOU are asking this — what angle you bring>"
}}"""
        result = _parse_json(_call_groq(system, user))
        return {
            "text":          result.get("text", f"From {p['name']}: tell me about your experience with {role} work."),
            "type":          result.get("type", "mixed"),
            "difficulty":    int(result.get("difficulty", difficulty)),
            "keywords":      result.get("keywords", []),
            "panelist_note": result.get("panelist_note", ""),
            "asked_by":      p["name"],
            "asked_by_key":  panelist_key,
            "asked_by_emoji": p["emoji"]
        }

    def generate_panel_reaction(self, panelist_keys: list, question: str,
                                 answer: str, score: int, asking_panelist: str) -> dict:
        """
        After a candidate answers, a DIFFERENT panelist reacts briefly — agree,
        disagree, or add a follow-up angle. This is the multi-agent loop.
        """
        other_panelists = [k for k in panelist_keys if k != asking_panelist]
        if not other_panelists:
            return {"reaction": None}
        reactor_key = other_panelists[0]
        reactor = PANEL_PERSONAS.get(reactor_key, PANEL_PERSONAS["peer_engineer"])

        system = (
            reactor["system_prefix"] +
            "\nRespond with ONLY valid JSON."
        )
        user = f"""Your colleague just asked: "{question}"
The candidate answered: "{answer[:400]}" (score: {score}/100)

As {reactor['name']}, you have 1 brief reaction (1-2 sentences max):
- If score > 70: add a quick compliment + one probing extension question
- If score 40-70: note what was missing, ask them to clarify one thing
- If score < 40: politely but directly challenge the answer

Respond with ONLY this JSON:
{{
  "reactor_name": "{reactor['name']}",
  "reactor_emoji": "{reactor['emoji']}",
  "reaction_text": "<your 1-2 sentence reaction>",
  "follow_up_question": "<optional 1 short follow-up question, or null>"
}}"""
        result = _parse_json(_call_groq(system, user, max_tokens=300))
        return {
            "reactor_name":      result.get("reactor_name", reactor["name"]),
            "reactor_emoji":     result.get("reactor_emoji", reactor["emoji"]),
            "reaction_text":     result.get("reaction_text", ""),
            "follow_up_question": result.get("follow_up_question", None)
        }

    # ─── F4: Pressure Simulator ───────────────────────────────────────────────

    def generate_pressure_rebuttal(self, question: str, answer: str, role: str,
                                    pressure_type: str = "challenge") -> dict:
        """
        Mid-answer or post-answer adversarial push. Types:
          'challenge'   — "But that contradicts X. Explain."
          'rapid_fire'  — throws 2 quick follow-up sub-questions
          'skeptical'   — "That's a textbook answer. Give a real example."
        """
        prompts = {
            "challenge": f"""The candidate was asked: "{question}"
They answered: "{answer[:500]}"

Generate a sharp, direct challenge that:
- Identifies a real or potential weakness/contradiction in their answer
- Forces them to defend or clarify a specific claim
- Is 1-2 sentences max, confrontational but professional

Respond with ONLY this JSON:
{{
  "type": "challenge",
  "rebuttal": "<your challenge statement>",
  "expected_defense_keywords": ["keyword1", "keyword2"]
}}""",
            "rapid_fire": f"""The candidate answered: "{answer[:300]}"
Generate TWO rapid-fire sub-questions that must both be answered quickly. Each under 10 words.

Respond with ONLY this JSON:
{{
  "type": "rapid_fire",
  "rebuttal": "<question 1>",
  "sub_question": "<question 2>",
  "expected_defense_keywords": ["keyword1"]
}}""",
            "skeptical": f"""The candidate gave this answer: "{answer[:500]}"
Role: {role}

Generate a skeptical pushback (1-2 sentences) that:
- Says their answer sounded rehearsed/generic
- Demands a specific real-world example with numbers or outcomes

Respond with ONLY this JSON:
{{
  "type": "skeptical",
  "rebuttal": "<your skeptical pushback>",
  "expected_defense_keywords": ["example", "specific", "metric"]
}}"""
        }

        user = prompts.get(pressure_type, prompts["challenge"])
        system = (
            "You are a tough interviewer applying deliberate pressure to test candidate resilience. "
            "Respond with ONLY valid JSON."
        )
        result = _parse_json(_call_groq(system, user, max_tokens=400))
        return {
            "type":     result.get("type", pressure_type),
            "rebuttal": result.get("rebuttal", "Can you be more specific?"),
            "sub_question": result.get("sub_question", None),
            "expected_defense_keywords": result.get("expected_defense_keywords", [])
        }

    def evaluate_pressure_response(self, original_question: str, original_answer: str,
                                    rebuttal: str, defense_answer: str) -> dict:
        """Scores how well the candidate recovered from adversarial pressure."""
        system = (
            "You are an expert evaluator assessing resilience under interview pressure. "
            "Respond with ONLY valid JSON."
        )
        user = f"""Original question: "{original_question}"
Candidate's first answer: "{original_answer[:400]}"
Interviewer's pressure/rebuttal: "{rebuttal}"
Candidate's defense: "{defense_answer[:400]}"

Evaluate the defense (0-100):
- Did they stay calm and structured? (30 pts)
- Did they add new concrete information? (40 pts)
- Did they acknowledge the valid critique? (30 pts)

Respond with ONLY this JSON:
{{
  "pressure_recovery_score": <0-100>,
  "recovery_feedback": "<2-3 sentences on how well they handled pressure>",
  "composure": <0-30>,
  "new_info_score": <0-40>,
  "acknowledgement_score": <0-30>
}}"""
        result = _parse_json(_call_groq(system, user, max_tokens=500))
        return {
            "pressure_recovery_score": max(0, min(100, int(result.get("pressure_recovery_score", 50)))),
            "recovery_feedback":       result.get("recovery_feedback", "Handled the pressure reasonably."),
            "composure":               result.get("composure", 15),
            "new_info_score":          result.get("new_info_score", 20),
            "acknowledgement_score":   result.get("acknowledgement_score", 15)
        }

    # ─── F5: Career Arc Predictor ─────────────────────────────────────────────

    def generate_career_arc(self, user_name: str, all_interviews: list) -> dict:
        """
        Analyses all completed interview sessions across roles/levels
        and predicts which roles the user is actually ready for,
        which they are approaching, and which are out of reach yet.
        """
        if not all_interviews:
            return {"error": "Not enough data", "sessions_needed": 3}

        summary_lines = []
        for iv in all_interviews:
            answers = iv.answers
            if not answers:
                continue
            avg = round(sum(a.score for a in answers) / len(answers))
            cog_scores = []
            for a in answers:
                try:
                    cl = json.loads(a.cognitive_load or "{}")
                    if "stress_score" in cl:
                        cog_scores.append(cl["stress_score"])
                except Exception:
                    pass
            avg_stress = round(sum(cog_scores) / len(cog_scores)) if cog_scores else 50
            summary_lines.append(
                f"- Role: {iv.role}, Level: {iv.level}, Avg score: {avg}/100, "
                f"Stress: {avg_stress}/100, Persona: {iv.persona}, Questions: {len(answers)}"
            )

        summary = "\n".join(summary_lines) or "No completed sessions yet."

        system = (
            "You are a senior career coach and talent expert. "
            "Respond with ONLY valid JSON."
        )
        user = f"""Candidate: {user_name}
Interview history:
{summary}

Based on their performance patterns across roles and levels, predict:
1. Roles they are READY for right now (score >= 70 consistently)
2. Roles they are APPROACHING (score 50-70, improving trend)
3. Roles that need MORE PREP (score < 50 or high stress)
4. A surprising role recommendation they haven't tried yet
5. Their personality archetype as an interviewee

Respond with ONLY this JSON:
{{
  "ready_roles": [{{"role": "<role>", "confidence": <0-100>, "reason": "<1 sentence>"}}],
  "approaching_roles": [{{"role": "<role>", "gap": "<what to improve>", "eta_weeks": <integer>}}],
  "needs_prep_roles": [{{"role": "<role>", "blocker": "<main weakness>"}}],
  "surprise_recommendation": {{"role": "<unexpected role>", "reason": "<why they'd be great>"}},
  "interviewee_archetype": {{
    "name": "<archetype name e.g. The Quiet Expert>",
    "description": "<2 sentences about their interview style>",
    "superpower": "<their biggest strength>",
    "blind_spot": "<their biggest weakness>"
  }},
  "overall_readiness": <0-100>
}}"""
        result = _parse_json(_call_groq(system, user, max_tokens=1200))
        return {
            "ready_roles":            result.get("ready_roles", []),
            "approaching_roles":      result.get("approaching_roles", []),
            "needs_prep_roles":       result.get("needs_prep_roles", []),
            "surprise_recommendation": result.get("surprise_recommendation", {}),
            "interviewee_archetype":  result.get("interviewee_archetype", {}),
            "overall_readiness":      result.get("overall_readiness", 0)
        }

    # ─── F2: Cognitive Load (pure computation, no AI needed) ─────────────────

    def compute_cognitive_load(self, keystroke_events: list, word_count: int,
                                time_seconds: int) -> dict:
        """
        Receives keystroke events from frontend:
          [{type: 'key'|'pause'|'backspace', duration_ms: int, timestamp: int}]

        Computes:
          - avg_wpm: words per minute
          - pause_count: number of pauses > 2 seconds
          - backspace_rate: backspaces per 100 characters typed
          - stress_score: 0-100 (higher = more cognitive stress)
        """
        if not keystroke_events or time_seconds <= 0:
            return {"avg_wpm": 0, "pause_count": 0, "backspace_rate": 0, "stress_score": 50}

        pauses       = [e for e in keystroke_events if e.get("type") == "pause" and e.get("duration_ms", 0) > 2000]
        backspaces   = [e for e in keystroke_events if e.get("type") == "backspace"]
        total_keys   = [e for e in keystroke_events if e.get("type") == "key"]

        avg_wpm      = round((word_count / time_seconds) * 60, 1) if time_seconds > 0 else 0
        pause_count  = len(pauses)
        backspace_rate = round((len(backspaces) / max(len(total_keys), 1)) * 100, 1)

        # Stress score formula (0-100):
        # Slow WPM (< 20) → high stress contribution
        # Many pauses → high stress
        # High backspace rate (> 30%) → high stress
        wpm_stress   = max(0, min(40, (25 - avg_wpm) * 1.6)) if avg_wpm < 25 else 0
        pause_stress = min(30, pause_count * 6)
        bs_stress    = min(30, backspace_rate * 0.75)
        stress_score = min(100, round(wpm_stress + pause_stress + bs_stress))

        stress_label = (
            "High stress" if stress_score > 65
            else "Moderate stress" if stress_score > 35
            else "Calm"
        )

        return {
            "avg_wpm":       avg_wpm,
            "pause_count":   pause_count,
            "backspace_rate": backspace_rate,
            "stress_score":  stress_score,
            "stress_label":  stress_label
        }

    # ─── Existing features (teacher mode, resource cards, confidence) ─────────

    def evaluate_answer(self, question, answer, expected_keywords,
                         question_type, difficulty) -> dict:
        system = (
            "You are an expert interview evaluator and senior technical mentor. "
            "Be constructive, honest, and educational. "
            "Respond with ONLY a valid JSON object — no extra text."
        )
        kw_str = ", ".join(expected_keywords) if expected_keywords else "none"
        user = f"""Evaluate this interview answer.

Question: "{question}"
Type: {question_type}, Difficulty: {difficulty}/10
Expected keywords: {kw_str}
Answer: "{answer[:1000]}"

Scoring (total 100):
- Correctness (40): factually accurate?
- Keywords (30): covers key concepts?
- Clarity (30): well-structured?

Respond with ONLY this JSON:
{{
  "score": <0-100>,
  "feedback": "<2-3 constructive sentences>",
  "strengths": ["s1", "s2"],
  "weaknesses": ["w1", "w2"],
  "improvements": "<actionable tip>",
  "ideal_answer": "<expert model answer>",
  "teacher_explanation": "<senior-tutor breakdown: why correct/incorrect, pitfalls, nuances>",
  "structured_resources": [{{"title": "...", "description": "...", "url": "https://..."}}],
  "needs_followup": <true if under 40 words or very vague>,
  "correctness_score": <0-40>,
  "keyword_score": <0-30>,
  "clarity_score": <0-30>
}}

URL rules: only use developer.mozilla.org, geeksforgeeks.org, leetcode.com,
stackoverflow.com, youtube.com, wikipedia.org. Include 2-3 resources."""
        result = _parse_json(_call_groq(system, user, max_tokens=1800))
        score = max(0, min(100, int(result.get("score", 50))))
        return {
            "score":                score,
            "feedback":             result.get("feedback", "Good attempt."),
            "strengths":            result.get("strengths", []),
            "weaknesses":           result.get("weaknesses", []),
            "improvements":         result.get("improvements", ""),
            "ideal_answer":         result.get("ideal_answer", ""),
            "teacher_explanation":  result.get("teacher_explanation", ""),
            "structured_resources": result.get("structured_resources", []),
            "needs_followup":       result.get("needs_followup", len(answer.split()) < 30),
            "correctness_score":    result.get("correctness_score", 0),
            "keyword_score":        result.get("keyword_score", 0),
            "clarity_score":        result.get("clarity_score", 0)
        }

    def generate_confidence_insight(self, role, confidence_data, scores) -> dict:
        system = "You are a career coach. Respond with ONLY valid JSON."
        pairs = "\n".join(
            f"Q{d['order']}: confidence {d['confidence']}/5 → score {d['score']}/100"
            for d in confidence_data
        ) if confidence_data else "No data."
        avg_conf  = round(sum(d["confidence"] for d in confidence_data) / len(confidence_data), 1) if confidence_data else 3
        avg_score = round(sum(scores) / len(scores)) if scores else 0
        user = f"""Role: {role}
Avg confidence: {avg_conf}/5, Avg score: {avg_score}/100
{pairs}

Analyse calibration: overconfident / underconfident / calibrated.
Respond with ONLY:
{{"calibration_type":"...","insight":"...","tip":"..."}}"""
        result = _parse_json(_call_groq(system, user, max_tokens=300))
        return {
            "calibration_type": result.get("calibration_type", "calibrated"),
            "insight":          result.get("insight", "Confidence aligns with performance."),
            "tip":              result.get("tip", "Keep practising.")
        }

    def generate_learning_tips(self, role, weaknesses, avg_score) -> list:
        system = "You are an expert career coach. Respond with ONLY a valid JSON array."
        weak_str = ", ".join(weaknesses) if weaknesses else "general skills"
        user = f"""Candidate for {role}. Avg score: {avg_score}/100. Weaknesses: {weak_str}.
Generate exactly 4 actionable tips as a JSON array:
[{{"title":"...","description":"...","resource":"..."}}]"""
        raw = _call_groq(system, user, max_tokens=700)
        try:
            parsed = _parse_json(raw)
            if isinstance(parsed, list): return parsed[:4]
            for k in ("tips","learning_tips","results"):
                if k in parsed and isinstance(parsed[k], list): return parsed[k][:4]
        except Exception:
            pass
        return [
            {"title":"Daily coding practice","description":"Solve 2 LeetCode problems daily.","resource":"LeetCode Top 150"},
            {"title":"System design","description":"Learn scalable architecture patterns.","resource":"Designing Data-Intensive Applications"},
            {"title":"STAR method","description":"Structure behavioural answers clearly.","resource":"Cracking the Coding Interview"},
            {"title":"Mock interviews","description":"One timed mock per week.","resource":"Pramp.com"}
        ]
