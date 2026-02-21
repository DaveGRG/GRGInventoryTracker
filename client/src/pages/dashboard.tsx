import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ArrowRight, Clock, Package, ScrollText, FileText, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";
import type { DashboardData } from "@/lib/types";

const quickLinks = [
  { href: "/more/manage-skus", label: "Manage SKUs", desc: "View, add SKUs & set par levels", icon: Package, testId: "link-manage-skus" },
  { href: "/more/par-report", label: "Par Report", desc: "View reorder recommendations", icon: FileText, testId: "link-par-report" },
  { href: "/physical-count", label: "Physical Count", desc: "Count and adjust inventory", icon: ClipboardCheck, testId: "link-physical-count" },
  { href: "/more/audit", label: "Audit Log", desc: "View all inventory changes", icon: ScrollText, testId: "link-audit-log" },
];

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Dashboard" />
      <BottomNav />
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          <div className="space-y-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="hover-elevate cursor-pointer" data-testid={item.testId}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {data?.recentActivity && data.recentActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/more/audit">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {data.recentActivity.slice(0, 10).map((entry: any) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 py-2 border-b last:border-0"
                      data-testid={`card-activity-${entry.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={entry.actionType} type="item" />
                          {entry.sku && <span className="text-xs font-mono text-muted-foreground">{entry.sku}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
