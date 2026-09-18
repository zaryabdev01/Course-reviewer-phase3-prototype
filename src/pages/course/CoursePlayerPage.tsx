import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMasterCourse } from "@/lib/api/courses";
import { FORMAT_LABELS, type LearningFormat } from "@/contracts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  BookOpen,
  MousePointerClick,
  Mic,
  Headphones,
  Video,
  Sparkle,
  Play,
  Pause,
  Captions,
  Type,
  Gauge,
  Award,
  CheckCircle2,
} from "lucide-react";

const FORMAT_ICON: Record<LearningFormat, typeof BookOpen> = {
  reading: BookOpen,
  interactive: MousePointerClick,
  podcast: Mic,
  audio_lesson: Headphones,
  video: Video,
  animation: Sparkle,
};

const MODULES = [
  "Introduction & objectives",
  "Core concepts",
  "Real-world scenario",
  "Common mistakes",
  "Knowledge check",
  "Summary & next steps",
];

export function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const format = (params.get("format") as LearningFormat) ?? "reading";
  const Icon = FORMAT_ICON[format];

  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });

  const [activeModule, setActiveModule] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isMedia = format === "podcast" || format === "audio_lesson" || format === "video" || format === "animation";
  const progressPercent = Math.round(((activeModule + (showAssessment ? 1 : 0)) / (MODULES.length + 1)) * 100);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="order-2 lg:order-1">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-50 text-primary-700">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{course?.title}</p>
            <p className="text-xs text-muted">{FORMAT_LABELS[format]}</p>
          </div>
        </div>
        <ProgressBar percent={progressPercent} className="mb-1" />
        <p className="mb-4 text-xs text-muted">{progressPercent}% complete</p>

        <div className="space-y-1">
          {MODULES.map((m, i) => (
            <button
              key={m}
              onClick={() => {
                setActiveModule(i);
                setShowAssessment(false);
              }}
              className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm ${
                activeModule === i && !showAssessment ? "bg-primary-50 font-medium text-primary-700" : "text-ink-soft hover:bg-gray-50"
              }`}
            >
              {i < activeModule ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="h-4 w-4 rounded-full border border-line text-center text-[10px] leading-4">{i + 1}</span>}
              {m}
            </button>
          ))}
          <button
            onClick={() => setShowAssessment(true)}
            className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm ${
              showAssessment ? "bg-primary-50 font-medium text-primary-700" : "text-ink-soft hover:bg-gray-50"
            }`}
          >
            <Award className="h-4 w-4" /> Assessment
          </button>
        </div>

        <div className="mt-5 rounded-[10px] border border-line p-3">
          <p className="mb-2 text-xs font-semibold text-ink">Accessibility</p>
          <label className="mb-2 flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><Captions className="h-3.5 w-3.5" /> Captions</span>
            <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} />
          </label>
          <label className="mb-2 flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><Type className="h-3.5 w-3.5" /> Larger text</span>
            <input type="checkbox" checked={largeText} onChange={(e) => setLargeText(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Extra time</span>
            <input type="checkbox" />
          </label>
        </div>
      </aside>

      <div className="order-1 lg:order-2">
        {!showAssessment ? (
          <div className="rounded-[14px] border border-line bg-white p-6">
            {isMedia ? (
              <div className="mb-5 flex flex-col items-center justify-center rounded-[12px] bg-ink py-16 text-white">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                >
                  {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 pl-0.5" />}
                </button>
                <p className="text-sm text-white/70">{FORMAT_LABELS[format]} — {MODULES[activeModule]}</p>
                {captions && <p className="mt-3 max-w-md text-center text-xs text-white/50">[captions] Template-rendered narration would appear here, synced to the transcript.</p>}
              </div>
            ) : (
              <Badge tone="brand" className="mb-3">{FORMAT_LABELS[format]}</Badge>
            )}
            <h2 className={largeText ? "text-2xl font-semibold text-ink" : "text-lg font-semibold text-ink"}>{MODULES[activeModule]}</h2>
            <p className={`mt-3 ${largeText ? "text-base" : "text-sm"} leading-relaxed text-ink-soft`}>
              This is placeholder module content for the "{course?.title}" master course, rendered in the{" "}
              {FORMAT_LABELS[format].toLowerCase()} format. In the real build this pane renders the structured content
              generated for this format variant — text and images for Reading, a branching scenario for Interactive,
              or a synced transcript alongside the player for audio/video formats.
            </p>
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" disabled={activeModule === 0} onClick={() => setActiveModule((m) => Math.max(0, m - 1))}>
                Back
              </Button>
              <Button
                onClick={() =>
                  activeModule < MODULES.length - 1 ? setActiveModule((m) => m + 1) : setShowAssessment(true)
                }
              >
                {activeModule < MODULES.length - 1 ? "Next" : "Go to assessment"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[14px] border border-line bg-white p-6">
            {!submitted ? (
              <>
                <h2 className="text-lg font-semibold text-ink">Knowledge check</h2>
                <p className="mb-5 text-sm text-muted">4 questions · 70% pass mark · 2 attempts remaining</p>
                <div className="mb-5 space-y-4">
                  {["Which action should you take first in an emergency?", "What is the maximum safe lift without assistance?"].map((q, i) => (
                    <div key={i} className="rounded-[10px] border border-line p-3">
                      <p className="mb-2 text-sm font-medium text-ink">{i + 1}. {q}</p>
                      {["Option A", "Option B", "Option C"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 py-1 text-sm text-ink-soft">
                          <input type="radio" name={`q${i}`} /> {opt}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <Button onClick={() => setSubmitted(true)}>Submit assessment</Button>
              </>
            ) : (
              <div className="py-6 text-center">
                <Award className="mx-auto mb-3 h-12 w-12 text-primary-500" />
                <h2 className="text-lg font-semibold text-ink">Passed — 85%</h2>
                <p className="mt-1 text-sm text-muted">Certificate generated, expires in 24 months.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <Button variant="secondary">Download certificate (PDF)</Button>
                  <Button>Back to Development</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
