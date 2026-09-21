import { useEffect, useState } from "react";
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
import { useActivePersona } from "@/lib/store/personaStore";
import type { MasterCourse, MasterCourseVersion } from "@/contracts";
import { Store, ShieldOff, Upload, Lock, Globe, History, Check } from "lucide-react";

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
  const persona = useActivePersona();
  const { data: versionsData } = useQuery({ queryKey: ["versions", course.id], queryFn: () => listMasterCourseVersions(course.id) });
  const { data: variants } = useQuery({ queryKey: ["format-variants", course.id], queryFn: () => listFormatVariants(course.id) });
  const push = useToastStore((s) => s.push);
  const [publishOpen, setPublishOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [published, setPublished] = useState(false);
  const [visibility, setVisibility] = useState(course.leaseVisibility);

  // Local, mutable copy so publishing a new version actually shows up in
  // "Manage versions" immediately, not just as a toast.
  const [versions, setVersions] = useState<MasterCourseVersion[] | null>(null);
  useEffect(() => {
    if (versionsData && versions === null) setVersions(versionsData);
  }, [versionsData, versions]);

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
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => setVersionsOpen(true)}>
            <History className="h-3.5 w-3.5" /> Manage versions
          </Button>
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
              const newVersion: MasterCourseVersion = {
                id: `${course.id}_v${course.currentVersion + 1}`,
                masterCourseId: course.id,
                versionNumber: course.currentVersion + 1,
                changeNote: changeNote.trim(),
                publishedAt: new Date().toISOString(),
                publishedBy: persona.label.split(" — ")[0],
                isCurrent: true,
              };
              setVersions((prev) => [...(prev ?? []).map((v) => ({ ...v, isCurrent: false })), newVersion]);
              setPublished(true);
              setPublishOpen(false);
              setChangeNote("");
              push(`Published v${newVersion.versionNumber} of "${course.title}" to the Learning Exchange`);
            }}
          >
            Publish version {course.currentVersion + 1}
          </Button>
        </div>
      </Modal>

      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Version history"
        description={`"${course.title}" — every published version is immutable; customer leases stay pinned to their agreed version unless auto-update is on (set per lease in the Distribution Hub).`}
      >
        <div className="space-y-2">
          {(versions ?? [])
            .slice()
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((v) => (
              <div
                key={v.id}
                className={`flex items-start justify-between gap-3 rounded-[10px] border px-3 py-2.5 ${v.isCurrent ? "border-primary-200 bg-primary-50" : "border-line"}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">Version {v.versionNumber}</p>
                    {v.isCurrent && (
                      <Badge tone="brand">
                        <Check className="mr-1 inline h-3 w-3" /> Current
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">{v.changeNote}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {new Date(v.publishedAt).toLocaleDateString()} · {v.publishedBy}
                  </p>
                </div>
              </div>
            ))}
          {(versions ?? []).length === 0 && <p className="text-sm text-muted">No published versions yet.</p>}
        </div>
      </Modal>
    </Card>
  );
}
