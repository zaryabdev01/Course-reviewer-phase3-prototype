import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getMasterCourse, listFormatVariants } from "@/lib/api/courses";
import { FORMAT_LABELS, type LearningFormat } from "@/contracts";
import { BookOpen, MousePointerClick, Mic, Headphones, Video, Sparkle, Wand2 } from "lucide-react";

const FORMAT_ICON: Record<LearningFormat, typeof BookOpen> = {
  reading: BookOpen,
  interactive: MousePointerClick,
  podcast: Mic,
  audio_lesson: Headphones,
  video: Video,
  animation: Sparkle,
};

const FORMAT_DESC: Record<LearningFormat, string> = {
  reading: "Structured text with images, in your browser. Generator live in this prototype's cache preview.",
  interactive: "Click-through scenarios and knowledge checks between sections.",
  podcast: "Conversational two-voice audio with chapters and a transcript.",
  audio_lesson: "Single-narrator lesson audio, ideal for hands-busy learners.",
  video: "Template-rendered video with narration and captions (no generative video).",
  animation: "Template-rendered animated explainer with narration.",
};

export function ChooseFormatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: course } = useQuery({ queryKey: ["course", id], queryFn: () => getMasterCourse(id!) });
  const { data: variants } = useQuery({ queryKey: ["format-variants", id], queryFn: () => listFormatVariants(id!) });

  const formats = course?.availableFormats ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Choose Learning Format"
        description={course?.title}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/course/${id}/convert?format=auto`)}>
            <Wand2 className="h-4 w-4" /> Choose for me
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {formats.map((format) => {
          const Icon = FORMAT_ICON[format];
          const variant = variants?.find((v) => v.format === format);
          return (
            <Card key={format} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-50 text-primary-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-ink">{FORMAT_LABELS[format]}</p>
                <p className="mt-1 flex-1 text-xs text-muted">{FORMAT_DESC[format]}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  {variant?.status === "ready" ? (
                    <Badge tone={variant.reused ? "info" : "success"}>
                      {variant.reused ? "Cached — instant" : "Generated"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Not generated yet</Badge>
                  )}
                </div>
                <Link to={`/course/${id}/convert?format=${format}`} className="mt-4">
                  <Button className="w-full" size="sm">
                    {variant?.status === "ready" ? "Open" : "Generate"}
                  </Button>
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
