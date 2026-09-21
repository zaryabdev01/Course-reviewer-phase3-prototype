import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Field";
import { listMasterCourses, listMasterCourseVersions, listFormatVariants } from "@/lib/api/courses";
import { useToastStore } from "@/lib/store/toastStore";
import type { MasterCourse } from "@/contracts";
import { Store, ShieldOff, Upload, Lock, Globe } from "lucide-react";

export function ContentLibraryPage() {
  const { data: courses } = useQuery({ queryKey: ["master-courses"], queryFn: listMasterCourses });

  return (
    <>
      <PageHeader
        title="Content Library"
        description="Create, upload, save, version, regenerate and export — Phase 2 baseline, extended here with marketplace publishing as approved master courses."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c) => <ContentCard key={c.id} course={c} />)}
      </div>
    </>
  );
}

function ContentCard({ course }: { course: MasterCourse }) {
  const { data: versions } = useQuery({ queryKey: ["versions", course.id], queryFn: () => listMasterCourseVersions(course.id) });
  const { data: variants } = useQuery({ queryKey: ["format-variants", course.id], queryFn: () => listFormatVariants(course.id) });
  const push = useToastStore((s) => s.push);
  const [publishOpen, setPublishOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [published, setPublished] = useState(false);
  const [visibility, setVisibility] = useState(course.leaseVisibility);

  const readyVariants = variants?.filter((v) => v.status === "ready").length ?? 0;

  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center justify-between">
          <div className="h-2 w-10 rounded-full" style={{ backgroundColor: course.thumbnailColor }} />
          {course.bypassAiConversion && (
            <Badge tone="neutral" title="SCORM/URL content bypasses AI conversion per M3">
              <ShieldOff className="mr-1 inline h-3 w-3" /> Bypasses AI
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-ink">{course.title}</p>
        <p className="mt-1 text-xs text-muted line-clamp-2">{course.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="neutral">v{course.currentVersion} · {versions?.length ?? course.currentVersion} versions</Badge>
          <Badge tone="brand">{course.sourceType.replace("_", " ")}</Badge>
          {!course.bypassAiConversion && (
            <Badge tone={readyVariants > 0 ? "success" : "neutral"}>{readyVariants} of {course.availableFormats.length} formats generated</Badge>
          )}
        </div>

        <div className="mt-3 flex rounded-[10px] bg-gray-100 p-1 text-xs">
          <button
            onClick={() => setVisibility("private")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-[8px] py-1.5 font-medium ${visibility === "private" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
          >
            <Lock className="h-3 w-3" /> Private
          </button>
          <button
            onClick={() => setVisibility("leasable")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-[8px] py-1.5 font-medium ${visibility === "leasable" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
          >
            <Globe className="h-3 w-3" /> Available for Leasing
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1">Manage versions</Button>
          {course.bypassAiConversion ? (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => push(`xAPI package uploaded for "${course.title}"`)}
            >
              <Upload className="h-3.5 w-3.5" /> Upload xAPI package
            </Button>
          ) : (
            <Button size="sm" className="flex-1" onClick={() => setPublishOpen(true)} disabled={published}>
              <Store className="h-3.5 w-3.5" /> {published ? "Published" : "Publish to Exchange"}
            </Button>
          )}
        </div>
        {!course.bypassAiConversion && (
          <Link to={`/course/${course.id}/readiness`} className="mt-2 block">
            <Button size="sm" variant="secondary" className="w-full">Preview Learner Journey →</Button>
          </Link>
        )}
      </CardBody>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish to Learning Exchange"
        description={`This creates an approved, immutable version ${course.currentVersion + 1} of "${course.title}". Existing leases and format variants keep referencing the version they were created against.`}
      >
        <div className="space-y-4">
          <div>
            <Label>Change note</Label>
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="e.g. Updated regulatory references in module 3"
              className="h-24 w-full rounded-[10px] border border-line bg-white p-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <Button
            className="w-full"
            disabled={!changeNote.trim()}
            onClick={() => {
              setPublished(true);
              setPublishOpen(false);
              push(`Published v${course.currentVersion + 1} of "${course.title}" to the Learning Exchange`);
            }}
          >
            Publish version {course.currentVersion + 1}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
