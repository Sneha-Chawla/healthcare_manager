const env = require("../config/env");

function fallbackPreVisit(symptoms) {
  return {
    urgencyLevel: "Medium",
    summary: `Patient reported: ${symptoms.slice(0, 180)}. Doctor should verify severity, duration, and previous history.`,
    llmStatus: "FALLBACK"
  };
}

function fallbackPostVisit(notes, prescription) {
  return {
    summary: `Your doctor noted: ${notes}. Please follow the prescription carefully: ${prescription || "No prescription added"}. Contact the clinic if symptoms worsen.`,
    llmStatus: "FALLBACK"
  };
}

async function createPreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}`;

  if (!env.openAiKey) return fallbackPreVisit(symptoms);

  try {
    // Real OpenAI call can be added here. Keeping fallback makes demo work without paid API keys.
    console.log("LLM prompt:", prompt);
    return fallbackPreVisit(symptoms);
  } catch (error) {
    return fallbackPreVisit(symptoms);
  }
}

async function createPostVisitSummary(notes, prescription) {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}. Prescription: ${prescription}`;

  if (!env.openAiKey) return fallbackPostVisit(notes, prescription);

  try {
    console.log("LLM prompt:", prompt);
    return fallbackPostVisit(notes, prescription);
  } catch (error) {
    return fallbackPostVisit(notes, prescription);
  }
}

module.exports = { createPreVisitSummary, createPostVisitSummary };
