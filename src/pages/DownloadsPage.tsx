import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { listDownloadJobs } from "@/lib/api/engagement";
import { Download, Clock, Loader2 } from "lucide-react";

export function DownloadsPage() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ["download-jobs"], queryFn: listDownloadJobs });

  return (
    <>
      <PageHeader title="Downloads" description="Single-learner reports export instantly. Group and Overall reports queue in order, with a ready notification." />
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <SkeletonRows className="p-5" rows={5} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">Report</th>
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {jobs?.map((j) => (
                  <tr key={j.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 font-medium text-ink">{j.label}</td>
                    <td className="px-5 py-2.5 text-muted">{new Date(j.requestedAt).toLocaleString()}</td>
                    <td className="px-5 py-2.5">
                      {j.status === "ready" && <Badge tone="success">Ready</Badge>}
                      {j.status === "processing" && (
                        <Badge tone="warning"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Processing</Badge>
                      )}
                      {j.status === "queued" && <Badge tone="neutral"><Clock className="mr-1 inline h-3 w-3" />Queued</Badge>}
                    </td>
                    <td className="px-5 py-2.5 text-muted">{j.fileSizeKb ? `${j.fileSizeKb} KB` : "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Button size="sm" variant="secondary" disabled={j.status !== "ready"}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
