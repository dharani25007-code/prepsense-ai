"""
Database models for PrepSense AI.
Uses Flask-SQLAlchemy with SQLite.
"""

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    interviews = db.relationship("Interview", backref="user", lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat()
        }


class Interview(db.Model):
    __tablename__ = "interviews"

    id                 = db.Column(db.Integer, primary_key=True)
    user_id            = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role               = db.Column(db.String(100), nullable=False)
    level              = db.Column(db.String(20), default="mid")
    category           = db.Column(db.String(20), default="mixed")
    status             = db.Column(db.String(20), default="active")
    current_difficulty = db.Column(db.Integer, default=5)
    # Novelty 5: Confidence Tracker — stores per-session confidence ratings JSON
    confidence_data    = db.Column(db.Text, default="[]")
    created_at         = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship("Question", backref="interview", lazy=True)
    answers   = db.relationship("Answer",   backref="interview", lazy=True)

    def to_summary(self):
        answers = self.answers
        avg = round(sum(a.score for a in answers) / len(answers)) if answers else 0
        return {
            "id": self.id,
            "role": self.role,
            "level": self.level,
            "category": self.category,
            "avg_score": avg,
            "question_count": len(answers),
            "created_at": self.created_at.isoformat()
        }


class Question(db.Model):
    __tablename__ = "questions"

    id                = db.Column(db.Integer, primary_key=True)
    interview_id      = db.Column(db.Integer, db.ForeignKey("interviews.id"), nullable=False)
    text              = db.Column(db.Text, nullable=False)
    type              = db.Column(db.String(30), default="technical")
    difficulty        = db.Column(db.Integer, default=5)
    expected_keywords = db.Column(db.Text, default="")
    order             = db.Column(db.Integer, default=1)

    answers = db.relationship("Answer", backref="question", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "type": self.type,
            "difficulty": self.difficulty,
            "order": self.order
        }


class Answer(db.Model):
    __tablename__ = "answers"

    id                  = db.Column(db.Integer, primary_key=True)
    question_id         = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False)
    interview_id        = db.Column(db.Integer, db.ForeignKey("interviews.id"), nullable=False)
    text                = db.Column(db.Text, nullable=False)
    score               = db.Column(db.Integer, default=0)
    feedback            = db.Column(db.Text, default="")
    strengths           = db.Column(db.Text, default="")
    weaknesses          = db.Column(db.Text, default="")
    improvements        = db.Column(db.Text, default="")
    ideal_answer        = db.Column(db.Text, default="")
    teacher_explanation = db.Column(db.Text, default="")
    detailed_resources  = db.Column(db.Text, default="")
    resources           = db.Column(db.Text, default="")
    # Novelty 5: per-answer confidence rating (1–5 stars, set by user)
    confidence_rating   = db.Column(db.Integer, default=0)
    time_taken          = db.Column(db.Integer, default=0)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
