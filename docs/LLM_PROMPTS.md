# LLM Prompts

## Pre-visit Summary

```text
Analyse these symptoms and return strict JSON with:
urgencyLevel: Low | Medium | High
chiefComplaint: one sentence
suggestedQuestions: exactly three questions for the doctor
redFlags: short list of possible warning signs

Symptoms: <symptoms>
```

Fallback behavior: if the LLM fails, the system stores `urgencyLevel = Medium`, a short symptom excerpt as chief complaint, and three generic doctor questions.

## Post-visit Summary

```text
Convert these clinical notes into strict JSON with:
summary: patient-friendly explanation
medicationSchedule: simple schedule grouped by medicine
followUpSteps: short bullet list
safetyAdvice: when to contact the clinic urgently

Clinical notes and prescription: <notes>
```

Fallback behavior: if the LLM fails, the patient still receives the doctor notes, prescription schedule, and standard follow-up advice.
