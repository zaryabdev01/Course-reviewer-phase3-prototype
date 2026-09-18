import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listMasterCourses, listMasterCourseVersions } from "@/lib/api/courses";
import type { MasterCourse } from "@/contracts";
import { Store } from "lucide-react";

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
  return (
    <Card>
      <CardBody>
        <div className="mb-2 h-2 w-10 rounded-full" style={{ backgroundColor: course.thumbnailColor }} />
        <p className="text-sm font-semibold text-ink">{course.title}</p>
        <p className="mt-1 text-xs text-muted line-clamp-2">{course.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="neutral">v{course.currentVersion} · {versions?.length ?? course.currentVersion} versions</Badge>
          <Badge tone="brand">{course.sourceType.replace("_", " ")}</Badge>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1">Manage versions</Button>
          <Button size="sm" className="flex-1"><Store className="h-3.5 w-3.5" /> Publish to Exchange</Button>
        </div>
        <Link to={`/course/${course.id}/readiness`} className="mt-2 block text-center text-xs font-medium text-primary-700">
          Prepare AI formats →
        </Link>
      </CardBody>
    </Card>
  );
}
