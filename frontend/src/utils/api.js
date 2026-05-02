// src/utils/api.js
// Centralised API client. BASE_URL is empty so package.json proxy handles routing.

const BASE_URL = "";

function getToken() {
  return localStorage.getItem("token");
}

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
    request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),
};

export const dashboardAPI = {
  get: () => request("/dashboard"),
};

export const interviewAPI = {
  start: (role, level, category) =>
    request("/interviews/start", {
      method: "POST",
      body: JSON.stringify({ role, level, category }),
    }),

  // Novelty 5: confidence_rating sent with every answer
  submitAnswer: (interviewId, questionId, answer, timeTaken, confidenceRating = 0) =>
    request(`/interviews/${interviewId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id:       questionId,
        answer,
        time_taken:        timeTaken,
        confidence_rating: confidenceRating,
      }),
    }),

  end: (interviewId) =>
    request(`/interviews/${interviewId}/end`, { method: "POST" }),

  getReport: (interviewId) =>
    request(`/interviews/${interviewId}/report`),

  // Novelty 5: standalone confidence rating update
  rateConfidence: (interviewId, answerId, rating) =>
    request(`/interviews/${interviewId}/confidence`, {
      method: "POST",
      body: JSON.stringify({ answer_id: answerId, rating }),
    }),
};
