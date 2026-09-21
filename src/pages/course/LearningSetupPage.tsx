import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { getMasterCourse, listLearningSetupSettings, listLearningSetupTemplates } from "@/lib/api/courses";
import { cn } from "@/lib/cn";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Lock, Sparkles } from "lucide-react";

/**
 * Learning Experience Setup — one question per step, mirroring the real
 * Phase 2 Training Material wizard's pattern (horizontal progress rail +
 * a single question card + pill option chips), rebuilt here with the
 * exact 10 questions the client specified rather than this prototype's
 * earlier invented settings. See mocks/generators/courses.ts for the
 * question text and options, taken verbatim from the client's spec.
 */
export function LearningSetupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });
  const { data: settings } = useQuery({ queryKey: ["learning-setup-settings"], queryFn: listLearningSetupSettings });
  const { data: templates } = useQuery({ queryKey: ["learning-setup-templates"], queryFn: listLearningSetupTemplates });

  // stage: "intro" (use template / create new / skip) -> step index 0..9
  // -> "review". Mirrors the milestone doc's "Use Template / Create New /
  // Skip on every course" requirement as the wizard's entry screen.
  const [stage, setStage] = useState<"intro" | number | "review">("intro");
  const [values, setValues] = useState<Record<string, string[]>>({});
  const [templateName, setTemplateName] = useState("");
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);

  const total = settings?.length ?? 10;

  function applyTemplate(templateId: string) {
    const t = templates?.find((t) => t.id === templateId);
    if (!t) return;
    const next: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(t.values)) next[k] = v.split(", ");
    setValues(next);
    setAppliedTemplateName(t.name);
    setStage("review");
  }

  function toggleOption(key: string, option: string, multi: boolean) {
    setValues((prev) => {
      const current = prev[key] ?? [];
      if (multi) {
        const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
        return { ...prev, [key]: next };
      }
      return { ...prev, [key]: [option] };
    });
  }

  function goToFormat() {
    const preferred = values.format_preference?.[0];
    const params = preferred && preferred !== "Choose for me" ? `?preferred=${encodeURIComponent(preferred)}` : "";
    navigate(`/course/${id}/format${params}`);
  }

  if (!settings || !templates) return null;

  // ── Intro: Use Template / Create New / Skip ────────────────────────────
  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Learning Experience Setup"
          description={`${course?.title ?? "…"} — 10 quick questions so the AI tailors this course to how you learn. Content-affecting answers change the variant key; render-time answers don't.`}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className="rounded-[14px] border border-line bg-white p-4 text-left shadow-[var(--shadow-card)] hover:border-primary-300"
            >
              <p className="text-sm font-semibold text-ink">{t.name}</p>
              <p className="mt-0.5 text-xs text-muted">{t.isDefault ? "Platform default" : `By ${t.ownerName}`}</p>
              <p className="mt-2 text-xs text-primary-700">Use this template →</p>
            </button>
          ))}
          <button
            onClick={() => { setValues({}); setAppliedTemplateName(null); setStage(0); }}
            className="rounded-[14px] border border-dashed border-line p-4 text-left hover:border-primary-300 hover:bg-gray-50"
          >
            <p className="text-sm font-semibold text-ink">+ Create New</p>
            <p className="mt-0.5 text-xs text-muted">Answer all 10 questions yourself</p>
          </button>
        </div>
        <div className="mt-5 flex justify-between">
          <Link to={`/course/${id}/readiness`}><Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
          <Button variant="secondary" onClick={() => navigate(`/course/${id}/format`)}>Skip <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  // ── Review ──────────────────────────────────────────────────────────────
  if (stage === "review") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Review your answers"
          description={appliedTemplateName ? `Loaded from "${appliedTemplateName}" — adjust anything before continuing.` : "Here's what you told us."}
        />
        <Card>
          <CardBody className="space-y-3">
            {settings.map((s) => (
              <div key={s.key} className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0">
                <span className="text-sm text-ink-soft">{s.label}</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {(values[s.key] ?? ["—"]).map((v) => (
                    <Badge key={v} tone="brand">{v}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <div className="mt-4">
          <SaveAsTemplate name={templateName} onChange={setTemplateName} />
        </div>
        <div className="mt-5 flex justify-between">
          <Button variant="ghost" onClick={() => setStage(total - 1)}><ArrowLeft className="h-4 w-4" /> Edit answers</Button>
          <Button onClick={goToFormat}>Continue to Choose Format <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  // ── A single question step ─────────────────────────────────────────────
  const stepIndex = stage;
  const setting = settings[stepIndex];
  const multi = setting.key === "accessibility";
  const selected = values[setting.key] ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Learning Experience Setup" description={course?.title} />

      {/* Horizontal step rail — mirrors Phase 2's TrainingProgressRail */}
      <div className="no-scrollbar mb-5 flex items-center gap-1.5 overflow-x-auto rounded-[12px] border border-line bg-white p-2">
        {settings.map((s, i) => {
          const isActive = i === stepIndex;
          const isComplete = i < stepIndex || (values[s.key]?.length ?? 0) > 0;
          return (
            <button
              key={s.key}
              onClick={() => setStage(i)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-white"
                  : isComplete
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-line text-muted hover:border-primary-200",
              )}
            >
              {isComplete && !isActive ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              {i === 0 ? "Format" : i === stepIndex ? s.label.split(" ").slice(0, 2).join(" ") : ""}
            </button>
          );
        })}
      </div>

      <Card>
        <CardBody>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary-700">
            Step {stepIndex + 1} of {total}
          </p>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-semibold leading-snug text-ink sm:text-xl">{setting.label}</h2>
            {stepIndex > 0 && (
              setting.contentAffecting ? (
                <Badge tone="warning" className="gap-1 shrink-0"><RefreshCw className="h-3 w-3" /> Content-affecting</Badge>
              ) : (
                <Badge tone="neutral" className="gap-1 shrink-0"><Lock className="h-3 w-3" /> Render-time only</Badge>
              )
            )}
          </div>
          {multi && <p className="mb-4 text-sm text-muted">Select all that apply.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {setting.options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleOption(setting.key, opt, multi)}
                  className={cn(
                    "inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
                    isSelected ? "border-primary bg-primary text-white" : "border-line bg-white text-ink-soft hover:border-primary-200",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => (stepIndex === 0 ? setStage("intro") : setStage(stepIndex - 1))}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/course/${id}/format`)}>Skip rest</Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => (stepIndex === total - 1 ? setStage("review") : setStage(stepIndex + 1))}
          >
            {stepIndex === total - 1 ? "Review answers" : "Next"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaveAsTemplate({ name, onChange }: { name: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-line p-3">
      <Sparkles className="h-4 w-4 shrink-0 text-primary-700" />
      <Input placeholder="Save these answers as a named template (optional)" value={name} onChange={(e) => onChange(e.target.value)} className="flex-1" />
    </div>
  );
}
