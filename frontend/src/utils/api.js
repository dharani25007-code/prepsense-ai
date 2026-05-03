// api.js — PrepSense AI v2
// All API calls including F1-F6 new endpoints

const BASE_URL = "";

function getToken() { return localStorage.getItem("token"); }

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const authAPI = {
  register: (name, email, password) =>
    request("/auth/register", { method:"POST", body:JSON.stringify({name,email,password}) }),
  login: (email, password) =>
    request("/auth/login", { method:"POST", body:JSON.stringify({email,password}) }),
  me: () => request("/auth/me"),
};

export const dashboardAPI = {
  get: () => request("/dashboard"),
};

export const interviewAPI = {
  // F1: persona, F6: mode
  start: (role, level, category, persona="standard", mode="solo") =>
    request("/interviews/start", {
      method: "POST",
      body: JSON.stringify({ role, level, category, persona, mode }),
    }),

  // F2: keystroke_events sent with every answer
  submitAnswer: (interviewId, questionId, answer, timeTaken, confidenceRating=0, keystrokeEvents=[]) =>
    request(`/interviews/${interviewId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id:       questionId,
        answer,
        time_taken:        timeTaken,
        confidence_rating: confidenceRating,
        keystroke_events:  keystrokeEvents,
      }),
    }),

  end: (interviewId) =>
    request(`/interviews/${interviewId}/end`, { method:"POST" }),

  getReport: (interviewId) =>
    request(`/interviews/${interviewId}/report`),

  rateConfidence: (interviewId, answerId, rating) =>
    request(`/interviews/${interviewId}/confidence`, {
      method: "POST",
      body: JSON.stringify({ answer_id:answerId, rating }),
    }),

  // F4: Pressure Simulator
  applyPressure: (interviewId, question, currentAnswer, pressureType="challenge") =>
    request(`/interviews/${interviewId}/pressure`, {
      method: "POST",
      body: JSON.stringify({ question, current_answer:currentAnswer, pressure_type:pressureType }),
    }),

  submitPressureResponse: (interviewId, originalQuestion, originalAnswer, rebuttal, defense, answerId=null) =>
    request(`/interviews/${interviewId}/pressure-response`, {
      method: "POST",
      body: JSON.stringify({
        original_question: originalQuestion,
        original_answer:   originalAnswer,
        rebuttal,
        defense,
        answer_id:         answerId,
      }),
    }),
};

// F5: Career Arc Predictor
export const careerAPI = {
  getArc: () => request("/career-arc"),
};

// F1: Persona & panel info
export const metaAPI = {
  getPersonas:      () => request("/personas"),
  getPanelPersonas: () => request("/panel-personas"),
};
