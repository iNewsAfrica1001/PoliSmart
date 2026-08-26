import { assessments } from "../data/catalog.js";

export function gradeMultipleChoice({ assessmentId, answers }) {
  const assessment = assessments.find((item) => item.id === assessmentId);
  if (!assessment) {
    const error = new Error("Assessment not found.");
    error.status = 404;
    throw error;
  }

  const results = assessment.questions.map((question) => {
    const selected = Number(answers.find((item) => item.questionId === question.id)?.answer);
    return {
      questionId: question.id,
      selected,
      correctAnswer: question.answer,
      isCorrect: selected === question.answer,
    };
  });
  const correct = results.filter((item) => item.isCorrect).length;
  const score = Math.round((correct / assessment.questions.length) * 100);
  return {
    assessmentId,
    title: assessment.title,
    score,
    correct,
    total: assessment.questions.length,
    passed: score >= (assessment.passingScore || 70),
    results,
    feedback:
      score >= (assessment.passingScore || 70)
        ? "Ready to move ahead. This can count toward governance readiness."
        : "Review the missed controls, then retry with copilot guidance and routing practice.",
  };
}
