import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMasterCourse, submitReadinessCheck } from "@/lib/api/courses";
import { CheckCircle2, Circle, ArrowRight, AlertTriangle } from "lucide-react";

const QUESTIONS = [
  "Does this course have a clear, named learning outcome?",
  "Is the content free of anything commercially or legally sensitive?",
  "Is the source material in its final, approved form?",
  "Does the course avoid region-specific legal references that don't apply to your learners?",
  "Is there an assessment or pass criteria already defined?",
  "Has a subject-matter expert reviewed the content in the last 12 months?",
  "Is the reading level appropriate for a general workforce audience?",
  "Are there no outstanding compliance sign-offs pending on this content?",
];

export function ReadinessCheckPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const answeredCount = Object.keys(answers).length;
  const yesCount = Object.values(answers).filter(Boolean).length;

  const submit = useMutation({
    mutationFn: () => submitReadinessCheck(id!, yesCount),
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
          {result.outcome === "ready" ? <CheckCircle2 className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
        </div>
        <h2 className="text-lg font-semibold text-ink">
          {result.outcome === "ready" ? "Ready for AI conversion" : "Needs a little prep first"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {result.answeredCount} of 8 answered "yes". Answers are never shared with organisations.
        </p>
        {result.suggestions.length > 0 && (
          <Card className="mt-5 text-left">
            <CardBody>
              <p className="mb-2 text-sm font-semibold text-ink">Suggestions</p>
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
          <Button variant="secondary" onClick={() => submit.reset()}>
            Come Back Later
          </Button>
          <Button onClick={() => navigate(`/course/${id}/learning-setup`)}>
            {result.outcome === "ready" ? "Continue" : "Skip & Continue"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Readiness Check"
        description={`${course?.title ?? "…"} — 8 quick questions before AI conversion. Rule-based scoring, no AI cost.`}
      />
      <Card>
        <CardBody className="space-y-1">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="flex items-center justify-between border-b border-line py-3 last:border-0">
              <p className="pr-4 text-sm text-ink">{q}</p>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setAnswers((a) => ({ ...a, [i]: true }))}
                  className={`flex items-center gap-1 rounded-[8px] border px-3 py-1.5 text-xs font-medium ${
                    answers[i] === true ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted hover:bg-gray-50"
                  }`}
                >
                  {answers[i] === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />} Yes
                </button>
                <button
                  onClick={() => setAnswers((a) => ({ ...a, [i]: false }))}
                  className={`flex items-center gap-1 rounded-[8px] border px-3 py-1.5 text-xs font-medium ${
                    answers[i] === false ? "border-danger bg-danger-soft text-danger" : "border-line text-muted hover:bg-gray-50"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Badge tone="neutral">{answeredCount}/8 answered</Badge>
        <div className="flex gap-2">
          <Link to={`/course/${id}/learning-setup`}>
            <Button variant="ghost">Skip Readiness Check</Button>
          </Link>
          <Button disabled={answeredCount < 8 || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Scoring…" : "See my result"}
          </Button>
        </div>
      </div>
    </div>
  );
}
