import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReconciliationReport, ReconciliationReportItem } from "@shared/schema";

interface ReportWithItems extends ReconciliationReport {
  items: ReconciliationReportItem[];
}

export default function ReconciliationReportsPage() {
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const { data: reports, isLoading } = useQuery<ReconciliationReport[]>({
    queryKey: ["/api/reconciliation-reports"],
  });

  const { data: reportDetail, isLoading: detailLoading } = useQuery<ReportWithItems>({
    queryKey: ["/api/reconciliation-reports", selectedReportId],
    enabled: !!selectedReportId,
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Reconciliation Reports" />
      <BottomNav showBack backTo="/more" />
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : reports && reports.length > 0 ? (
          reports.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedReportId(report.id)}
              data-testid={`report-${report.id}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: report.discrepancyCount > 0 ? "hsl(0 84% 60% / 0.1)" : "hsl(142 76% 36% / 0.1)" }}>
                  {report.discrepancyCount > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{report.locationId}</p>
                    <Badge variant={report.discrepancyCount > 0 ? "destructive" : "secondary"} className="no-default-hover-elevate text-xs">
                      {report.discrepancyCount > 0 ? `${report.discrepancyCount} discrepanc${report.discrepancyCount !== 1 ? "ies" : "y"}` : "All match"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(report.submittedAt)}</p>
                  <p className="text-xs text-muted-foreground">{report.submittedBy} · {report.totalItems} items</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No reconciliation reports yet</p>
              <p className="text-xs text-muted-foreground mt-1">Submit a physical count to create your first report</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Reconciliation Report
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : reportDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-md p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-semibold">{reportDetail.locationId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{formatDate(reportDetail.submittedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted By</p>
                  <p className="text-sm font-medium truncate">{reportDetail.submittedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items Counted</p>
                  <p className="text-sm font-medium">{reportDetail.totalItems}</p>
                </div>
              </div>

              {reportDetail.discrepancyCount > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-semibold">{reportDetail.discrepancyCount} Discrepanc{reportDetail.discrepancyCount !== 1 ? "ies" : "y"}</p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid bg-muted px-3 py-2 border-b" style={{ gridTemplateColumns: "1fr 4rem 4rem 4rem" }}>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">SKU</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">System</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">Counted</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">Diff</span>
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto">
                      {reportDetail.items
                        .filter((item) => item.difference !== 0)
                        .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
                        .map((item) => (
                          <div
                            key={item.id}
                            className="grid items-center px-3 py-2 border-b last:border-b-0"
                            style={{ gridTemplateColumns: "1fr 4rem 4rem 4rem" }}
                            data-testid={`report-item-${item.sku}`}
                          >
                            <span className="text-sm font-mono font-medium truncate">{item.sku}</span>
                            <span className="text-sm tabular-nums text-center">{item.systemQty}</span>
                            <span className="text-sm tabular-nums text-center font-semibold">{item.countedQty}</span>
                            <span className={`text-sm tabular-nums text-center font-bold ${item.difference > 0 ? "text-green-600" : "text-destructive"}`}>
                              {item.difference > 0 ? "+" : ""}{item.difference}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">All items match system quantities</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
