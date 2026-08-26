import { useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, ShieldCheck, Target, UserCheck } from "lucide-react";
import { api } from "../../lib/api.js";

const rubricSignals = [
  { label: "Control knowledge", value: "Weighted 45%", icon: Target },
  { label: "Safe AI use", value: "Weighted 25%", icon: ShieldCheck },
  { label: "Human override", value: "Available", icon: UserCheck },
];

export default function AssessmentPanel({ assessments, user }) {
  const assessment = assessments[0];
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const canSubmit = useMemo(
    () => assessment?.questions.every((question) => answers[question.id] !== undefined),
    [assessment, answers],
  );

  async function submit() {
    const payload = await api(`/api/assessments/${assessment.id}/grade`, {
      method: "POST",
      body: JSON.stringify({
        learnerId: user.name,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      }),
    });
    setResult(payload.submission);
  }

  if (!assessment)
    return (
      <p className="rounded-md border border-slate-200 bg-white p-5">No assessments configured.</p>
    );

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.65fr)]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-amber-50 text-amber-700">
            <ClipboardCheck size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-amber-700">{assessment.subject}</p>
            <h2 className="text-2xl font-black">{assessment.title}</h2>
          </div>
        </div>

        <div className="grid gap-4">
          {assessment.questions.map((question, questionIndex) => (
            <fieldset className="rounded-md border border-slate-200 p-4" key={question.id}>
              <legend className="px-2 text-lg font-black">Question {questionIndex + 1}</legend>
              <p className="mb-3 text-slate-700">{question.prompt}</p>
              <div className="grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    className="flex min-h-12 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold"
                    key={option}
                  >
                    <input
                      className="size-4"
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === optionIndex}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                      }
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <button
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-md bg-emerald-700 px-4 font-black text-white disabled:opacity-60"
          disabled={!canSubmit}
          type="button"
          onClick={submit}
        >
          <Check size={18} aria-hidden="true" />
          Submit for automated grading
        </button>
      </article>

      <article
        className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        aria-live="polite"
      >
        <p className="text-sm font-black uppercase text-emerald-700">Evaluation engine</p>
        <div className="mt-4 grid gap-3">
          {rubricSignals.map(({ label, value, icon: Icon }) => (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={label}>
              <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                <Icon size={15} aria-hidden="true" />
                {label}
              </div>
              <p className="font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
        {result ? (
          <div className="mt-4 grid gap-4">
            <div className="rounded-md bg-emerald-50 p-5">
              <span className="text-sm font-black uppercase text-emerald-700">Score</span>
              <strong className="block text-5xl font-black">{result.score}%</strong>
              <p className="mt-2 font-semibold text-slate-700">{result.feedback}</p>
            </div>
            {result.results.map((item, index) => (
              <div className="rounded-md border border-slate-200 p-3" key={item.questionId}>
                <strong>Question {index + 1}</strong>
                <p
                  className={
                    item.isCorrect ? "font-bold text-emerald-700" : "font-bold text-red-700"
                  }
                >
                  {item.isCorrect
                    ? "Correct"
                    : `Review: correct answer is option ${item.correctAnswer + 1}`}
                </p>
              </div>
            ))}
            {!result.passed ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-black text-amber-950">
                  <AlertTriangle size={18} aria-hidden="true" />
                  Human review recommended
                </div>
                <p className="text-sm font-semibold leading-6 text-amber-950">
                  The system creates a review task, suggests a control refresher, and keeps
                  automated feedback visible as provisional until reviewed.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-slate-600">
            Submit answers to receive instant score, pass/fail status, item-level feedback, and
            review routing.
          </p>
        )}
      </article>
    </section>
  );
}
