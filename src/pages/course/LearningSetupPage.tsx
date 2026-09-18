import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { listLearningSetupSettings, listLearningSetupTemplates } from "@/lib/api/courses";
import { cn } from "@/lib/cn";
import { ArrowRight, Info, Lock, RefreshCw } from "lucide-react";

export function LearningSetupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: settings } = useQuery({ queryKey: ["learning-setup-settings"], queryFn: listLearningSetupSettings });
  const { data: templates } = useQuery({ queryKey: ["learning-setup-templates"], queryFn: listLearningSetupTemplates });

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"template" | "custom">("template");

  const applyTemplate = (tid: string) => {
    const t = templates?.find((t) => t.id === tid);
    if (t) {
      setValues(t.values);
      setTemplateId(tid);
      setMode("template");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Learning Experience Setup"
        description="Saved as a named template you can reuse on every course. Content-affecting settings change the variant key — changing one means a fresh AI generation instead of a reused version."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {templates?.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTemplate(t.id)}
            className={cn(
              "rounded-[10px] border px-3 py-2 text-left text-sm",
              templateId === t.id ? "border-primary-300 bg-primary-50" : "border-line hover:bg-gray-50",
            )}
          >
            <p className="font-medium text-ink">{t.name}</p>
            <p className="text-[11px] text-muted">{t.isDefault ? "Platform default" : `By ${t.ownerName}`}</p>
          </button>
        ))}
        <button
          onClick={() => {
            setMode("custom");
            setTemplateId(null);
          }}
          className={cn(
            "rounded-[10px] border border-dashed px-3 py-2 text-left text-sm",
            mode === "custom" && !templateId ? "border-primary-300 bg-primary-50" : "border-line text-muted hover:bg-gray-50",
          )}
        >
          <p className="font-medium">+ Create New Template</p>
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <Badge tone="info">
            <Info className="mr-1 inline h-3 w-3" /> 5 of 10 are content-affecting
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          {mode === "custom" && !templateId && (
            <Input placeholder="Name this template (e.g. Warehouse & Ops)" className="mb-2" />
          )}
          {settings?.map((s) => (
            <div key={s.key} className="flex flex-col gap-1.5 border-b border-line pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-ink">{s.label}</p>
                {s.contentAffecting ? (
                  <Badge tone="warning" className="gap-1">
                    <RefreshCw className="h-3 w-3" /> Content-affecting
                  </Badge>
                ) : (
                  <Badge tone="neutral" className="gap-1">
                    <Lock className="h-3 w-3" /> Render-time only
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setValues((v) => ({ ...v, [s.key]: opt }))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      values[s.key] === opt ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-ink-soft hover:bg-gray-50",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Link to={`/course/${id}/readiness`}>
          <Button variant="ghost">Back</Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/course/${id}/format`)}>
            Skip
          </Button>
          <Button onClick={() => navigate(`/course/${id}/format`)}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
