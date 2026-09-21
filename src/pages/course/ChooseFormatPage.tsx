import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getMasterCourse, listFormatVariants } from "@/lib/api/courses";
import type { LearningFormat } from "@/contracts";
import { BookOpen, MousePointerClick, Mic, Video, Sparkle, Wand2, Coins, Trophy, RefreshCw } from "lucide-react";

/** Rough, clearly-labelled cost estimate from the metered generation
 * figures (M4: "cost metering per generation ... for revenue and cost
 * reporting"). */
function estimateCost(costTokens: number | null, costTtsCharacters: number | null): number | null {
  if (costTokens) return (costTokens / 1000) * 0.006;
  if (costTtsCharacters) return costTtsCharacters * 0.000015;
  return null;
}

/**
 * Choose Learning Format — the exact six cards the client specified, in
 * the order given. This is presentational per the client's instruction
 * ("just do the design, don't worry about it working") — the click-
 * through still routes into the existing conversion pipeline where a
 * matching LearningFormat exists, since that costs nothing extra and
 * keeps the demo coherent, but the card set itself is fixed content, not
 * driven by course.availableFormats like the previous version was.
 *
 * "Gamification" isn't one of the six AI generation formats in the data
 * model (contracts/course.ts) — the client's own milestone doc describes
 * gamification as a layer on top of a format, not a format itself, and
 * this prototype already has a real points/levels/badges system (see
 * gamificationStore) that lives inside the player. So the Gamification
 * card routes into the Interactive pipeline with a flag that makes the
 * player foreground that system, rather than inventing a seventh format
 * end-to-end.
 */
const FORMAT_CARDS: {
  key: string;
  label: string;
  description: string;
  icon: typeof BookOpen;
  variantFormat: LearningFormat;
  gamified?: boolean;
}[] = [
  { key: "podcast", label: "Podcast", description: "A two-voice conversational walkthrough of the course, with chapters and a transcript — good for listening on the go.", icon: Mic, variantFormat: "podcast" },
  { key: "interactive", label: "Interactive Course", description: "Click-through scenarios and knowledge checks woven between sections, for hands-on learners.", icon: MousePointerClick, variantFormat: "interactive" },
  { key: "video", label: "Video-led", description: "A narrated video walkthrough with captions, rendered from the course's structure.", icon: Video, variantFormat: "video" },
  { key: "animation", label: "Animation", description: "An animated explainer with narration and captions — a lighter-touch alternative to video.", icon: Sparkle, variantFormat: "animation" },
  { key: "reading", label: "Reading", description: "A structured text version with images, read at your own pace in the browser.", icon: BookOpen, variantFormat: "reading" },
  { key: "gamification", label: "Gamification", description: "The Interactive Course, with points, levels, badges and challenges layered on top as you progress.", icon: Trophy, variantFormat: "interactive", gamified: true },
];

export function ChooseFormatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Carried forward from Learning Experience Setup, question 1. Card
  // labels below are now the same wording as that question's options
  // ("Video-led"), so this matches directly — Audio Lesson is the one
  // question-1 answer with no corresponding card here, left that way
  // deliberately for this prototype.
  const preferred = params.get("preferred");
  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });
  const { data: variants } = useQuery({ queryKey: ["format-variants", id], queryFn: () => listFormatVariants(id!) });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Choose Learning Format"
        description={course?.title}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/course/${id}/convert?format=auto`)}>
            <Wand2 className="h-4 w-4" /> Choose for me
          </Button>
        }
      />

      {preferred && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] bg-primary-50 px-3 py-2 text-sm text-primary-700">
          <Wand2 className="h-4 w-4" /> Based on your Learning Setup answers, we think <strong>{preferred}</strong> is a good fit — look for the "Recommended" badge below.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORMAT_CARDS.map((card) => {
          const Icon = card.icon;
          const variant = variants?.find((v) => v.format === card.variantFormat);
          const isRecommended = preferred === card.label;
          return (
            <Card key={card.key} className={isRecommended ? "flex flex-col ring-2 ring-primary-300" : "flex flex-col"}>
              <CardBody className="flex flex-1 flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-50 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  {isRecommended && <Badge tone="brand">Recommended</Badge>}
                </div>
                <p className="text-sm font-semibold text-ink">{card.label}</p>
                <p className="mt-1 flex-1 text-xs text-muted">{card.description}</p>

                {variant?.status === "ready" ? (
                  <div className="mt-3 flex items-center gap-1.5">
                    <Badge tone={variant.reused ? "info" : "success"}>
                      {variant.reused ? "Cached — instant" : "Generated"}
                    </Badge>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Badge tone="neutral">Not generated yet</Badge>
                  </div>
                )}
                {variant?.status === "ready" && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                    <Coins className="h-3 w-3" />
                    {variant.reused
                      ? "£0.00 — reused a saved version, no AI call"
                      : `£${(estimateCost(variant.costTokens, variant.costTtsCharacters) ?? 0).toFixed(3)} — ${
                          variant.costTokens ? `${variant.costTokens.toLocaleString()} tokens` : `${variant.costTtsCharacters?.toLocaleString()} TTS chars`
                        }`}
                  </p>
                )}

                <Link to={`/course/${id}/convert?format=${card.variantFormat}${card.gamified ? "&gamified=1" : ""}`} className="mt-4">
                  <Button className="w-full" size="sm">
                    {variant?.status === "ready" ? "Open" : "Submit request"}
                  </Button>
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-[10px] border border-line bg-gray-50 px-4 py-3 text-xs text-muted">
        <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Once you submit, the format converts in the background — you'll see it in <Link to="/development" className="font-medium text-primary-700 hover:underline">Development</Link> until
          you complete it. If this exact version has been generated before (same master version, format and content-affecting Learning Setup answers), it's reused instantly instead of
          calling the AI again.
        </p>
      </div>
    </div>
  );
}
