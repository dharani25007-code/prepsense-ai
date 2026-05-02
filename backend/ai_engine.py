"""
AI Engine — PrepSense AI
Handles all Groq API calls. Model: llama-3.3-70b-versatile

Novelty features wired in here:
  1. IRI (Interview Readiness Index) — computed in analytics.py, data gathered here
  2. Teacher Explanation Mode — evaluate_answer returns teacher_explanation + ideal_answer
  3. Smart Follow-Up Questions — generate_followup called when answer is vague
  4. Structured Resource Cards — evaluate_answer returns structured_resources[]
  5. Confidence Tracker — confidence stored per-answer, fed into generate_confidence_insight
"""

import os
import json
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

GROQ_MODEL = "llama-3.3-70b-versatile"


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


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        text = text.rstrip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end   = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except Exception:
                pass
        # Try array
        start = text.find("[")
        end   = text.rfind("]") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except Exception:
                pass
        return {"raw": text}


class AIEngine:

    # ── Novelty 3 + Role×Level×Category Matrix ─────────────────────────────
    def generate_first_question(self, role: str, level: str, category: str) -> dict:
        system = (
            "You are an expert technical interviewer at a top tech company. "
            "Tailor every question precisely to the role, level, and category provided. "
            "Respond with ONLY a valid JSON object — no markdown, no extra text."
        )
        user = f"""Generate the FIRST interview question for:
- Role: {role}
- Level: {level} (junior=0-2yr / mid=2-5yr / senior=5+yr)
- Category: {category} (technical=coding+systems / hr=behaviour+culture / mixed=both)

Start with a warm-up appropriate for this EXACT role and level.
A junior Software Engineer gets a simpler question than a senior ML Engineer.

Respond with ONLY this JSON:
{{
  "text": "<question text>",
  "type": "technical|hr|mixed",
  "difficulty": <1-10 integer>,
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}"""
        result = _parse_json(_call_groq(system, user))
        return {
            "text":       result.get("text", "Tell me about yourself and your background."),
            "type":       result.get("type", "hr"),
            "difficulty": int(result.get("difficulty", 3)),
            "keywords":   result.get("keywords", [])
        }

    def generate_next_question(self, role, level, category, difficulty, previous_questions, last_score) -> dict:
        system = (
            "You are an expert technical interviewer who adapts difficulty based on candidate performance. "
            "Respond with ONLY a valid JSON object — no extra text."
        )
        prev_list = "\n".join(f"- {q}" for q in previous_questions[-5:])
        user = f"""Generate the NEXT adaptive interview question.

Context:
- Role: {role}, Level: {level}, Category: {category}
- Target difficulty: {difficulty}/10
- Last answer score: {last_score}/100
- Recent questions (do NOT repeat or rephrase these):
{prev_list}

Rules:
- Never repeat any previous question even loosely
- Difficulty must match: {difficulty}/10
- If last score < 40 → make it slightly easier
- If last score > 75 → push harder
- For "mixed" category: alternate technical and HR
- Make the question specific to {role} at {level} level

Respond with ONLY this JSON:
{{
  "text": "<question text>",
  "type": "technical|hr|followup",
  "difficulty": {difficulty},
  "keywords": ["keyword1", "keyword2"]
}}"""
        result = _parse_json(_call_groq(system, user))
        return {
            "text":       result.get("text", "Describe a challenging project you have worked on."),
            "type":       result.get("type", "technical"),
            "difficulty": int(result.get("difficulty", difficulty)),
            "keywords":   result.get("keywords", [])
        }

    # ── Novelty 3: Smart Follow-Up Questions ───────────────────────────────
    def generate_followup(self, original_question, answer, interview_role) -> dict:
        system = (
            "You are a senior interviewer probing for deeper understanding. "
            "The candidate gave a vague or short answer. "
            "Respond with ONLY a valid JSON object."
        )
        user = f"""The candidate was asked: "{original_question}"
Their answer: "{answer[:500]}"
Role being interviewed for: {interview_role}

Their answer was vague, too short, or lacked specifics.
Generate ONE targeted follow-up question that:
- Probes exactly what was missing or unclear
- Asks for a concrete example or metric
- Cannot be answered with yes/no

Respond with ONLY this JSON:
{{
  "text": "<follow-up question>",
  "keywords": ["keyword1", "keyword2"]
}}"""
        result = _parse_json(_call_groq(system, user))
        return {
            "text":     result.get("text", "Can you walk me through a specific example of that?"),
            "keywords": result.get("keywords", [])
        }

    # ── Novelty 2 + 4: Teacher Mode + Structured Resource Cards ────────────
    def evaluate_answer(self, question, answer, expected_keywords, question_type, difficulty) -> dict:
        system = (
            "You are an expert interview evaluator and senior technical mentor. "
            "Be constructive, honest, and educational. "
            "Respond with ONLY a valid JSON object — no extra text."
        )
        kw_str = ", ".join(expected_keywords) if expected_keywords else "none specified"
        user = f"""Evaluate this interview answer.

Question: "{question}"
Question type: {question_type}
Difficulty: {difficulty}/10
Expected keywords/concepts: {kw_str}
Candidate's answer: "{answer[:1000]}"

Scoring rubric (total = 100 pts):
- Correctness (40 pts): factually accurate and relevant?
- Keyword coverage (30 pts): covers key concepts?
- Clarity (30 pts): well-structured and easy to follow?

Respond with ONLY this JSON:
{{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentences of constructive feedback>",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "improvements": "<short actionable improvement tip>",
  "ideal_answer": "<comprehensive expert-level model answer for this role/level>",
  "teacher_explanation": "<detailed technical breakdown: why correct/incorrect, common pitfalls, advanced nuances — write like a senior tutor explaining to a student>",
  "structured_resources": [
    {{"title": "Resource title", "description": "One-line description", "url": "https://..."}}
  ],
  "needs_followup": <true if answer under 40 words OR very vague, else false>,
  "correctness_score": <0-40>,
  "keyword_score": <0-30>,
  "clarity_score": <0-30>
}}

URL RULES for structured_resources:
1. Only use: developer.mozilla.org, geeksforgeeks.org, leetcode.com, stackoverflow.com, youtube.com, wikipedia.org
2. If unsure of exact URL, use a search: https://www.google.com/search?q=<topic+tutorial>
3. Include exactly 2-3 resources."""
        result = _parse_json(_call_groq(system, user, max_tokens=1800))
        score = max(0, min(100, int(result.get("score", 50))))
        return {
            "score":                score,
            "feedback":             result.get("feedback", "Good attempt. Keep practising."),
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

    # ── Novelty 5: Confidence Insight ──────────────────────────────────────
    def generate_confidence_insight(self, role: str, confidence_data: list, scores: list) -> dict:
        """
        Analyses the gap between self-reported confidence and actual scores.
        confidence_data: list of {question_order, confidence_rating (1-5), score}
        Returns insight text + calibration_type (overconfident/underconfident/calibrated)
        """
        system = (
            "You are a career coach specialising in interview psychology. "
            "Respond with ONLY a valid JSON object."
        )
        pairs = "\n".join(
            f"Q{d['order']}: confidence {d['confidence']}/5 → actual score {d['score']}/100"
            for d in confidence_data
        ) if confidence_data else "No data yet."

        avg_conf = round(sum(d["confidence"] for d in confidence_data) / len(confidence_data), 1) if confidence_data else 3
        avg_score = round(sum(scores) / len(scores)) if scores else 0

        user = f"""Candidate role: {role}
Average self-confidence rating: {avg_conf}/5
Average actual score: {avg_score}/100
Per-question breakdown:
{pairs}

Analyse whether the candidate is:
- overconfident (high confidence but low score)
- underconfident (low confidence but high score)  
- well-calibrated (confidence matches performance)

Respond with ONLY this JSON:
{{
  "calibration_type": "overconfident|underconfident|calibrated",
  "insight": "<2-3 sentence personalised insight about their confidence calibration>",
  "tip": "<one specific actionable tip to improve calibration>"
}}"""
        result = _parse_json(_call_groq(system, user, max_tokens=400))
        return {
            "calibration_type": result.get("calibration_type", "calibrated"),
            "insight":          result.get("insight", "Your confidence aligns well with your performance."),
            "tip":              result.get("tip", "Keep practising to build consistent confidence.")
        }

    def generate_learning_tips(self, role, weaknesses, avg_score) -> list:
        system = (
            "You are an expert career coach. "
            "Respond with ONLY a valid JSON array — no extra text."
        )
        weak_str = ", ".join(weaknesses) if weaknesses else "general interview skills"
        user = f"""A candidate for {role} completed an interview.
Average score: {avg_score}/100
Key weaknesses: {weak_str}

Generate exactly 4 specific, actionable learning tips.

Respond with ONLY this JSON array:
[
  {{
    "title": "<short tip title>",
    "description": "<1-2 sentence actionable advice>",
    "resource": "<specific book, course, or practice method>"
  }}
]"""
        raw = _call_groq(system, user, max_tokens=700)
        try:
            parsed = _parse_json(raw)
            if isinstance(parsed, list):
                return parsed[:4]
            for key in ("tips", "learning_tips", "results"):
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key][:4]
        except Exception:
            pass
        return [
            {"title": "Daily coding practice",   "description": "Solve 2 LeetCode problems daily focusing on weak areas.",                     "resource": "LeetCode Top 150"},
            {"title": "System design study",      "description": "Learn scalable architecture patterns used in real interviews.",               "resource": "\"Designing Data-Intensive Applications\" by Kleppmann"},
            {"title": "Use the STAR method",      "description": "Structure all behavioural answers as Situation, Task, Action, Result.",       "resource": "\"Cracking the Coding Interview\" by McDowell"},
            {"title": "Weekly mock interviews",   "description": "One timed mock per week builds real interview confidence.",                   "resource": "Pramp.com or interviewing.io"}
        ]
