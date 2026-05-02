"""
Analytics Engine — PrepSense AI
Novelty 1: Interview Readiness Index (IRI)
  Composite score from accuracy + consistency + improvement trend.
  Not a plain average — rewards steady improvement and low variance.
"""

from statistics import stdev


class AnalyticsEngine:

    def compute_stats(self, interviews: list) -> dict:
        if not interviews:
            return {
                "total_interviews": 0,
                "avg_score": 0,
                "best_score": 0,
                "total_questions": 0,
                "improvement_rate": 0
            }

        all_scores = [ans.score for iv in interviews for ans in iv.answers]
        avg = round(sum(all_scores) / len(all_scores)) if all_scores else 0

        improvement = 0
        if len(all_scores) >= 4:
            half = len(all_scores) // 2
            first_avg  = sum(all_scores[:half]) / half
            second_avg = sum(all_scores[half:]) / (len(all_scores) - half)
            improvement = round(second_avg - first_avg, 1)

        return {
            "total_interviews": len(interviews),
            "avg_score":        avg,
            "best_score":       max(all_scores) if all_scores else 0,
            "total_questions":  len(all_scores),
            "improvement_rate": improvement
        }

    # ── Novelty 1: Interview Readiness Index ───────────────────────────────
    def compute_readiness_index(self, interviews: list) -> dict:
        """
        IRI = 40% accuracy + 30% consistency + 30% improvement trend.

        - Accuracy:    raw average score (0–100)
        - Consistency: penalises high variance. SD of 0 → 100, SD of 50 → 0.
        - Improvement: compares earliest 33% of answers vs latest 33%.
                       Rising → score above 50, falling → below 50.

        Levels:
          0–44  → Beginner
          45–74 → Intermediate
          75+   → Ready
        """
        if not interviews:
            return {
                "level": "Beginner",
                "score": 0,
                "breakdown": {"accuracy": 0, "consistency": 0, "improvement": 0}
            }

        all_scores = [ans.score for iv in interviews for ans in iv.answers]
        if not all_scores:
            return {"level": "Beginner", "score": 0,
                    "breakdown": {"accuracy": 0, "consistency": 0, "improvement": 0}}

        # Accuracy (40%)
        accuracy = sum(all_scores) / len(all_scores)

        # Consistency (30%) — low standard deviation = high consistency
        if len(all_scores) > 1:
            sd = stdev(all_scores)
            consistency = max(0, 100 - (sd * 2))
        else:
            consistency = 50

        # Improvement (30%) — compare first third vs last third
        if len(all_scores) >= 3:
            n3     = max(1, len(all_scores) // 3)
            early  = sum(all_scores[:n3]) / n3
            recent = sum(all_scores[-n3:]) / n3
            delta  = recent - early          # -100 … +100
            improvement = max(0, min(100, 50 + delta))
        else:
            improvement = 50

        iri = round(accuracy * 0.4 + consistency * 0.3 + improvement * 0.3)

        if iri >= 75:
            level = "Ready"
        elif iri >= 45:
            level = "Intermediate"
        else:
            level = "Beginner"

        return {
            "level": level,
            "score": iri,
            "breakdown": {
                "accuracy":    round(accuracy),
                "consistency": round(consistency),
                "improvement": round(improvement)
            }
        }

    def compute_confidence_stats(self, interviews: list) -> dict:
        """
        Novelty 5: aggregate confidence vs score gap across all sessions.
        Returns avg_confidence, avg_score, calibration_gap.
        """
        all_confidence = []
        all_scores     = []
        for iv in interviews:
            for ans in iv.answers:
                if ans.confidence_rating and ans.confidence_rating > 0:
                    all_confidence.append(ans.confidence_rating * 20)  # map 1-5 → 20-100
                    all_scores.append(ans.score)

        if not all_confidence:
            return {"avg_confidence": 0, "avg_score": 0, "calibration_gap": 0, "has_data": False}

        avg_conf  = round(sum(all_confidence) / len(all_confidence))
        avg_score = round(sum(all_scores) / len(all_scores))
        gap       = avg_conf - avg_score  # positive = overconfident, negative = underconfident

        return {
            "avg_confidence":  avg_conf,
            "avg_score":       avg_score,
            "calibration_gap": gap,
            "has_data":        True
        }
