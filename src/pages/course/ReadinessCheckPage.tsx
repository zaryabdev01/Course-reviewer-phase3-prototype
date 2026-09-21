import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMasterCourse, submitReadinessCheck } from "@/lib/api/courses";
import type { ReadinessAnswers } from "@/contracts";
import { CheckCircle2, Sparkles, ArrowRight, Coffee } from "lucide-react";

type QuestionKey = keyof ReadinessAnswers;

const QUESTIONS: { key: QuestionKey; question: string; options: { value: string; label: string }[] }[] = [
  {
    key: "energy",
    question: "How is your energy level right now?",
    options: [
      { value: "low", label: "Low" },
      { value: "okay", label: "Okay" },
      { value: "good", label: "Good" },
      { value: "high", label: "High" },
    ],
  },
  {
    key: "eaten",
    question: "Have you eaten recently enough to feel comfortable and focused?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    key: "hydrated",
    question: "Are you hydrated?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "could_use_water", label: "I could use some water" },
    ],
  },
  {
    key: "rested",
    question: "How well rested do you feel?",
    options: [
      { value: "poorly", label: "Poorly rested" },
      { value: "okay", label: "Okay" },
      { value: "well", label: "Well rested" },
    ],
  },
  {
    key: "attention",
    question: "Can you give this course your full attention right now?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "mostly", label: "Mostly" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "environment",
    question: "Are you in a suitable place to learn without too many distractions?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "some_distractions", label: "Some distractions" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "stress",
    question: "How stressed or mentally overloaded do you feel right now?",
    options: [
      { value: "low", label: "Low" },
      { value: "moderate", label: "Moderate" },
      { value: "high", label: "High" },
    ],
  },
  {
    key: "readyToStart",
    question: "Do you feel ready to start, or would a short break help first?",
    options: [
      { value: "ready_now", label: "Ready now" },
      { value: "break_5", label: "5-minute break" },
      { value: "break_10", label: "10-minute break" },
      { value: "come_back_later", label: "Come back later" },
    ],
  },
];

export function ReadinessCheckPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const answeredCount = Object.keys(answers).length;

  const submit = useMutation({
    mutationFn: () => submitReadinessCheck(id!, answers as unknown as ReadinessAnswers),
  });

  if (submit.data) {
    const result = submit.data;
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            result.outcome === "ready" ? "bg-success-soft text-[color:#079455]" : "bg-warning-soft text-warning-dark"
          }`}
        >
          {result.outcome === "ready" ? <CheckCircle2 className="h-7 w-7" /> : <Coffee className="h-7 w-7" />}
        </div>
        <h2 className="text-lg font-semibold text-ink">
          {result.outcome === "ready" ? "You're ready to learn" : "A quick reset may help you get more from this course"}
        </h2>
        <p className="mt-1 text-sm text-muted">Your answers are never shared with your organisation.</p>
        {result.suggestions.length > 0 && (
          <Card className="mt-5 text-left">
            <CardBody>
              <p className="mb-2 text-sm font-semibold text-ink">A few suggestions</p>
              <ul className="space-y-1.5 text-sm text-ink-soft">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-warning-dark">•</span> {s}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/development")}>
            Come Back Later
          </Button>
          <Button onClick={() => navigate(`/course/${id}/learning-setup`)}>
            Skip & Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Complete Readiness Check"
        description={`${course?.title ?? "…"} — a quick check-in before you start. Entirely optional, rule-based, and private to you.`}
      />
      <Card>
        <CardBody className="space-y-5">
          {QUESTIONS.map((q) => (
            <div key={q.key} className="border-b border-line pb-4 last:border-0 last:pb-0">
              <p className="mb-2 text-sm font-medium text-ink">{q.question}</p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt.value }))}
                    className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${
                      answers[q.key] === opt.value
                        ? "border-primary-300 bg-primary-50 text-primary-700"
                        : "border-line text-muted hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Badge tone="neutral">{answeredCount}/{QUESTIONS.length} answered</Badge>
        <div className="flex gap-2">
          <Link to={`/course/${id}/learning-setup`}>
            <Button variant="ghost">Skip Readiness Check</Button>
          </Link>
          <Button disabled={answeredCount < QUESTIONS.length || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "…" : "See my result"} <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
