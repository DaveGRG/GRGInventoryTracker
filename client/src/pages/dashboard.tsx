import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { AlertTriangle, Truck, ClipboardList, ArrowRight, Clock, Users } from "lucide-react";
import { Link } from "wouter";
import type { DashboardData } from "@/lib/types";

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Dashboard" />
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground font-medium">Below Par</span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400" data-testid="text-below-par-count">
                  {data?.belowParItems?.length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Active Transfers</span>
                </div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-active-transfers">{data?.activeTransfers || 0}</p>
              </CardContent>
            </Card>
            <Link href="/clients">
              <Card className="hover-elevate cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Active Clients</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" data-testid="text-active-clients">{data?.activeClients || 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{data?.totalClients || 0} total</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild data-testid="button-quick-transfer">
              <Link href="/transfers/new">
                <Truck className="h-4 w-4 mr-1.5" />
                New Transfer
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild data-testid="button-quick-project">
              <Link href="/projects/new">
                <ClipboardList className="h-4 w-4 mr-1.5" />
                New Product
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild data-testid="button-view-clients">
              <Link href="/clients">
                <Users className="h-4 w-4 mr-1.5" />
                View Clients
              </Link>
            </Button>
          </div>

          {data?.belowParItems && data.belowParItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Below Par Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="max-h-[400px] overflow-y-auto scroll-smooth space-y-2">
                  {data.belowParItems.map((item) => (
                    <div
                      key={`${item.sku}-${item.hub}`}
                      className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                      data-testid={`card-par-alert-${item.sku}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono font-medium truncate">{item.sku}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm tabular-nums">
                          <span className="text-red-600 dark:text-red-400 font-semibold">{item.currentTotal}</span>
                          <span className="text-muted-foreground"> / {item.parLevel}</span>
                        </p>
                        <Badge variant="outline" className="text-[10px] no-default-hover-elevate">
                          {item.hub}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
      <BottomNav />
    </div>
  );
}
