import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMasterCourse } from "@/lib/api/courses";
import { FORMAT_LABELS, type LearningFormat } from "@/contracts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useActivePersona } from "@/lib/store/personaStore";
import { useGamificationStore, levelForPoints, BADGES, type BadgeId } from "@/lib/store/gamificationStore";
import { useToastStore } from "@/lib/store/toastStore";
import { cn } from "@/lib/cn";
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
  FileText,
  ListMusic,
  Volume2,
  Zap,
  Trophy,
  Star,
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

const CHAPTERS = ["Cold open (0:00)", "The core concept (2:15)", "A real scenario (6:40)", "What people get wrong (10:05)", "Wrap-up (13:30)"];

const TRANSCRIPT_LINES = [
  { t: "0:00", text: "Welcome back — today we're covering the part of this topic most teams get wrong on their first attempt." },
  { t: "0:24", text: "Let's start with the core idea, then walk through a scenario that's close to what you'll actually run into." },
  { t: "1:10", text: "Here's the key thing to remember before we go further." },
];

type Question = {
  prompt: string;
  type: "single" | "multi" | "boolean";
  options: string[];
  correct: number[]; // indices
};

const QUESTIONS: Question[] = [
  { prompt: "Which action should you take first in an emergency?", type: "single", options: ["Call for help", "Assess the scene for danger", "Move the casualty"], correct: [1] },
  { prompt: "This procedure applies regardless of local site rules.", type: "boolean", options: ["True", "False"], correct: [1] },
  { prompt: "What is the maximum safe lift without assistance?", type: "single", options: ["10kg", "25kg", "50kg"], correct: [1] },
  { prompt: "Which of these are required PPE for this task? (select all that apply)", type: "multi", options: ["Hi-vis vest", "Steel-toe boots", "Sunglasses", "Hard hat"], correct: [0, 1, 3] },
];

export function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const format = (params.get("format") as LearningFormat) ?? "reading";
  const gamified = params.get("gamified") === "1";
  const Icon = FORMAT_ICON[format];
  const persona = useActivePersona();
  const push = useToastStore((s) => s.push);
  const gami = useGamificationStore();

  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });

  const storageKey = `player_progress_${id}_${format}`;
  const resumed = useRef(false);
  const [activeModule, setActiveModule] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [revisitedAny, setRevisitedAny] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [narration, setNarration] = useState(true);
  const [extraTime, setExtraTime] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [timeSpentSec, setTimeSpentSec] = useState(0);

  // Resume: restore from localStorage on mount.
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { activeModule: number; completedModules: number[]; timeSpentSec: number };
        setActiveModule(saved.activeModule ?? 0);
        setCompletedModules(new Set(saved.completedModules ?? []));
        setTimeSpentSec(saved.timeSpentSec ?? 0);
        if (saved.activeModule > 0) push(`Resumed at "${MODULES[saved.activeModule]}"`, "info");
      }
    } catch {
      // localStorage unavailable (private mode etc.) — just start fresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Time spent: ticks while this page is mounted, persisted alongside progress.
  useEffect(() => {
    const interval = setInterval(() => setTimeSpentSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ activeModule, completedModules: Array.from(completedModules), timeSpentSec }));
    } catch {
      // ignore
    }
  }, [storageKey, activeModule, completedModules, timeSpentSec]);

  const isMedia = format === "podcast" || format === "audio_lesson" || format === "video" || format === "animation";
  const hasChapters = format === "podcast" || format === "audio_lesson";
  const progressPercent = Math.round(((completedModules.size + (showAssessment ? 1 : 0)) / (MODULES.length + 1)) * 100);

  function goToModule(i: number) {
    if (activeModule !== i && completedModules.has(i)) setRevisitedAny(true);
    setActiveModule(i);
    setShowAssessment(false);
  }

  function completeModuleAndAdvance() {
    const firstTimeCompletion = !completedModules.has(activeModule);
    if (firstTimeCompletion) {
      setCompletedModules((prev) => new Set(prev).add(activeModule));
      gami.addPoints(10);
      if (completedModules.size === 0 && gami.awardBadge("getting_started")) {
        push(`Badge earned: ${BADGES.getting_started.label} (+10 pts)`, "info");
      }
    }
    if (activeModule < MODULES.length - 1) {
      setActiveModule((m) => m + 1);
    } else {
      setShowAssessment(true);
    }
  }

  const minutes = Math.floor(timeSpentSec / 60);
  const seconds = timeSpentSec % 60;

  return (
    <div className={cn("grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]", reducedMotion && "motion-reduce:transition-none [&_*]:!transition-none [&_*]:!animate-none")}>
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
        <div className="mb-4 flex items-center justify-between text-xs text-muted">
          <span>{progressPercent}% complete</span>
          <span>{minutes}:{seconds.toString().padStart(2, "0")} spent</span>
        </div>

        <div className="space-y-1">
          {MODULES.map((m, i) => (
            <button
              key={m}
              onClick={() => goToModule(i)}
              className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm ${
                activeModule === i && !showAssessment ? "bg-primary-50 font-medium text-primary-700" : "text-ink-soft hover:bg-gray-50"
              }`}
            >
              {completedModules.has(i) ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="h-4 w-4 rounded-full border border-line text-center text-[10px] leading-4">{i + 1}</span>}
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
            <span className="flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Narration</span>
            <input type="checkbox" checked={narration} onChange={(e) => setNarration(e.target.checked)} />
          </label>
          <label className="mb-2 flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><Type className="h-3.5 w-3.5" /> Larger text</span>
            <input type="checkbox" checked={largeText} onChange={(e) => setLargeText(e.target.checked)} />
          </label>
          <label className="mb-2 flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Reduced motion</span>
            <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Extra time</span>
            <input type="checkbox" checked={extraTime} onChange={(e) => setExtraTime(e.target.checked)} />
          </label>
        </div>

        <div className={gamified ? "mt-5 rounded-[10px] border-2 border-warning-dark/30 bg-warning-soft p-3" : "mt-5 rounded-[10px] border border-line p-3"}>
          {gamified && <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-warning-dark">Gamified course</p>}
          <div className="mb-1.5 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><Trophy className="h-3.5 w-3.5 text-warning-dark" /> Level {levelForPoints(gami.points)}</p>
            <span className="text-xs text-muted">{gami.points} pts</span>
          </div>
          <ProgressBar percent={gami.points % 50 * 2} tone="warning" className="mb-2" />
          <div className="flex flex-wrap gap-1">
            {gami.badges.length === 0 && <span className="text-[11px] text-muted">No badges yet — complete a module to earn one.</span>}
            {gami.badges.map((b) => (
              <span key={b} title={BADGES[b].description} className="flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning-dark">
                <Star className="h-2.5 w-2.5" /> {BADGES[b].label}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="order-1 lg:order-2">
        {!showAssessment ? (
          <div className="rounded-[14px] border border-line bg-white p-6">
            {isMedia ? (
              <>
                <div className="mb-5 flex flex-col items-center justify-center rounded-[12px] bg-ink py-16 text-white">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                  >
                    {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 pl-0.5" />}
                  </button>
                  <p className="text-sm text-white/70">{FORMAT_LABELS[format]} — {MODULES[activeModule]}</p>
                  {narration && playing && <p className="mt-1 text-xs text-white/40">Narration playing…</p>}
                  {captions && <p className="mt-3 max-w-md text-center text-xs text-white/50">[captions] Template-rendered narration would appear here, synced to the transcript.</p>}
                </div>
                {hasChapters && (
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink"><ListMusic className="h-3.5 w-3.5" /> Chapters</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CHAPTERS.map((c) => (
                        <span key={c} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft hover:bg-gray-50">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setShowTranscript((v) => !v)} className="mb-4 flex items-center gap-1.5 text-xs font-medium text-primary-700">
                  <FileText className="h-3.5 w-3.5" /> {showTranscript ? "Hide transcript" : "Show transcript"}
                </button>
                {showTranscript && (
                  <div className="mb-4 space-y-2 rounded-[10px] bg-gray-50 p-3">
                    {TRANSCRIPT_LINES.map((line) => (
                      <p key={line.t} className="text-xs text-ink-soft"><span className="mr-2 font-mono text-muted">{line.t}</span>{line.text}</p>
                    ))}
                  </div>
                )}
              </>
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
              <Button variant="secondary" disabled={activeModule === 0} onClick={() => goToModule(Math.max(0, activeModule - 1))}>
                Back
              </Button>
              <Button onClick={completeModuleAndAdvance}>
                {activeModule < MODULES.length - 1 ? "Next" : "Go to assessment"}
              </Button>
            </div>
          </div>
        ) : (
          <Assessment
            courseTitle={course?.title ?? ""}
            format={format}
            learnerName={persona.label.split(" — ")[0]}
            extraTime={extraTime}
            revisitedAny={revisitedAny}
          />
        )}
      </div>
    </div>
  );
}

function Assessment({
  courseTitle,
  format,
  learnerName,
  extraTime,
  revisitedAny,
}: {
  courseTitle: string;
  format: LearningFormat;
  learnerName: string;
  extraTime: boolean;
  revisitedAny: boolean;
}) {
  const push = useToastStore((s) => s.push);
  const gami = useGamificationStore();
  const PASS_MARK = 70;
  const MAX_ATTEMPTS = 2;

  const [attempt, setAttempt] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [awardedBadges, setAwardedBadges] = useState<string[]>([]);

  function toggleAnswer(qIndex: number, optIndex: number, type: Question["type"]) {
    setAnswers((prev) => {
      const current = prev[qIndex] ?? [];
      if (type === "multi") {
        const next = current.includes(optIndex) ? current.filter((i) => i !== optIndex) : [...current, optIndex];
        return { ...prev, [qIndex]: next };
      }
      return { ...prev, [qIndex]: [optIndex] };
    });
  }

  const score = useMemo(() => {
    let correct = 0;
    QUESTIONS.forEach((q, i) => {
      const given = (answers[i] ?? []).slice().sort();
      const want = q.correct.slice().sort();
      if (given.length === want.length && given.every((v, idx) => v === want[idx])) correct++;
    });
    return Math.round((correct / QUESTIONS.length) * 100);
  }, [answers]);

  const passed = score >= PASS_MARK;
  const allAnswered = QUESTIONS.every((_, i) => (answers[i] ?? []).length > 0);

  function submit() {
    setSubmitted(true);
    const earned: string[] = [];
    if (passed) {
      gami.addPoints(25);
      if (gami.awardBadge("certified")) earned.push("certified");
      if (score === 100 && gami.awardBadge("perfect_score")) earned.push("perfect_score");
      if (!revisitedAny && gami.awardBadge("fast_learner")) earned.push("fast_learner");
      gami.incrementCoursesCompleted();
    }
    setAwardedBadges(earned);
    for (const b of earned) push(`Badge earned: ${BADGES[b as BadgeId].label}`, "info");
  }

  function downloadCertificate() {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.setDrawColor(6, 56, 28);
      doc.setLineWidth(3);
      doc.rect(24, 24, w - 48, h - 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(6, 56, 28);
      doc.text("Certificate of Completion", w / 2, 120, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("This certifies that", w / 2, 165, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(20, 20, 20);
      doc.text(learnerName, w / 2, 200, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("has successfully completed", w / 2, 230, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20);
      doc.text(`${courseTitle} (${FORMAT_LABELS[format]})`, w / 2, 260, { align: "center" });
      const issued = new Date();
      const expires = new Date(issued);
      expires.setMonth(expires.getMonth() + 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text(`Score: ${score}%   ·   Issued: ${issued.toLocaleDateString()}   ·   Expires: ${expires.toLocaleDateString()}`, w / 2, 300, { align: "center" });
      doc.save(`certificate-${courseTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-6">
        <div className="py-6 text-center">
          {passed ? <Award className="mx-auto mb-3 h-12 w-12 text-primary-500" /> : <Award className="mx-auto mb-3 h-12 w-12 text-muted" />}
          <h2 className="text-lg font-semibold text-ink">{passed ? `Passed — ${score}%` : `Not yet — ${score}%`}</h2>
          <p className="mt-1 text-sm text-muted">
            {passed ? "Certificate generated, expires in 24 months." : `Pass mark is ${PASS_MARK}%. ${MAX_ATTEMPTS - attempt} attempt${MAX_ATTEMPTS - attempt !== 1 ? "s" : ""} remaining.`}
          </p>
          {awardedBadges.length > 0 && (
            <div className="mt-3 flex justify-center gap-2">
              {awardedBadges.map((b) => (
                <span key={b} className="flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning-dark">
                  <Star className="h-3 w-3" /> {BADGES[b as BadgeId].label}
                </span>
              ))}
            </div>
          )}
          <div className="mt-5 flex justify-center gap-2">
            {passed ? (
              <>
                <Button variant="secondary" onClick={downloadCertificate}>Download certificate (PDF)</Button>
                <Link to="/development"><Button>Back to Development</Button></Link>
              </>
            ) : attempt < MAX_ATTEMPTS ? (
              <Button
                onClick={() => {
                  setAttempt((a) => a + 1);
                  setAnswers({});
                  setSubmitted(false);
                }}
              >
                Try again ({MAX_ATTEMPTS - attempt} attempt{MAX_ATTEMPTS - attempt !== 1 ? "s" : ""} left)
              </Button>
            ) : (
              <Link to="/development"><Button variant="secondary">Back to Development</Button></Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Knowledge check</h2>
      <p className="mb-5 text-sm text-muted">
        {QUESTIONS.length} questions · {PASS_MARK}% pass mark · attempt {attempt} of {MAX_ATTEMPTS}
        {extraTime && " · extra time enabled"}
      </p>
      <div className="mb-5 space-y-4">
        {QUESTIONS.map((q, i) => (
          <div key={i} className="rounded-[10px] border border-line p-3">
            <p className="mb-2 text-sm font-medium text-ink">
              {i + 1}. {q.prompt} {q.type === "multi" && <Badge tone="neutral" className="ml-1">Select all</Badge>}
            </p>
            {q.options.map((opt, oi) => (
              <label key={opt} className="flex items-center gap-2 py-1 text-sm text-ink-soft">
                <input
                  type={q.type === "multi" ? "checkbox" : "radio"}
                  name={`q${i}`}
                  checked={(answers[i] ?? []).includes(oi)}
                  onChange={() => toggleAnswer(i, oi, q.type)}
                />
                {opt}
              </label>
            ))}
          </div>
        ))}
      </div>
      <Button disabled={!allAnswered} onClick={submit}>Submit assessment</Button>
    </div>
  );
}
