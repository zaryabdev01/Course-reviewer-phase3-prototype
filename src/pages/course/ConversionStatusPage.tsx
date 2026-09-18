import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getMasterCourse, listFormatVariants } from "@/lib/api/courses";
import { FORMAT_LABELS, type LearningFormat } from "@/contracts";
import { CheckCircle2, Loader2, Zap, ShieldCheck } from "lucide-react";

/** Simulates the M4 conversion job pipeline: queued -> processing -> ready,
 * with a cache-hit short-circuit when the variant already exists (the
 * variant-key reuse the milestone doc's Technical Details describes). */
export function ConversionStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const formatParam = params.get("format") as LearningFormat | "auto" | null;

  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });
  const { data: variants } = useQuery({ queryKey: ["format-variants", id], queryFn: () => listFormatVariants(id!) });

  const format: LearningFormat = (formatParam === "auto" ? course?.availableFormats[0] : formatParam) ?? "reading";
  const existingVariant = variants?.find((v) => v.format === format);
  const isCached = existingVariant?.status === "ready" && existingVariant.reused;

  const [stage, setStage] = useState<"queued" | "processing" | "fidelity" | "ready">(isCached ? "ready" : "queued");

  useEffect(() => {
    if (isCached) {
      setStage("ready");
      return;
    }
    const t1 = setTimeout(() => setStage("processing"), 500);
    const t2 = setTimeout(() => setStage("fidelity"), 1600);
    const t3 = setTimeout(() => setStage("ready"), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isCached, format]);

  const steps = [
    { key: "queued", label: "Queued" },
    { key: "processing", label: `Generating ${FORMAT_LABELS[format]}` },
    { key: "fidelity", label: "Fidelity check against master" },
    { key: "ready", label: "Ready" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === stage);

  return (
    <div className="mx-auto max-w-xl py-6">
      <PageHeader title="Preparing your course" description={course?.title} />
      <Card>
        <CardBody>
          {isCached && (
            <div className="mb-4 flex items-center gap-2 rounded-[10px] bg-primary-50 px-3 py-2 text-sm text-primary-700">
              <Zap className="h-4 w-4" /> Reused from cache — same master version, format and content-affecting settings. No AI call made.
            </div>
          )}
          <div className="space-y-4">
            {steps.map((s, i) => {
              const done = i < currentIndex || stage === "ready";
              const active = i === currentIndex && stage !== "ready";
              return (
                <div key={s.key} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-line" />
                  )}
                  <span className={done || active ? "text-sm font-medium text-ink" : "text-sm text-muted"}>{s.label}</span>
                </div>
              );
            })}
          </div>

          {stage === "ready" && (
            <div className="mt-5 flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-ink">
                <ShieldCheck className="h-4 w-4 text-success" /> Fidelity score {existingVariant?.fidelityScore ?? 97}/100
              </div>
              <Badge tone="success">Passed</Badge>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button disabled={stage !== "ready"} onClick={() => navigate(`/course/${id}/player?format=${format}`)}>
              {stage === "ready" ? "Open course" : "Preparing…"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
