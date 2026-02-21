import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Download } from "lucide-react";
import type { ParLevelAlert } from "@/lib/types";

export default function ParReportPage() {
  const { data: alerts, isLoading } = useQuery<ParLevelAlert[]>({
    queryKey: ["/api/reports/par-levels"],
  });

  const farmAlerts = alerts?.filter((a) => a.hub === "Farm") || [];
  const mkeAlerts = alerts?.filter((a) => a.hub === "MKE") || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Par Report" />
      <BottomNav showBack backTo="/" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <>
            {alerts?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">All items are at or above par levels.</p>
              </div>
            ) : (
              <>
                {farmAlerts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Farm - Below Par ({farmAlerts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {farmAlerts.map((item) => (
                          <div key={item.sku} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`par-alert-farm-${item.sku}`}>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-mono font-medium">{item.sku}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="text-sm tabular-nums">
                                <span className="text-red-600 dark:text-red-400 font-semibold">{item.currentTotal}</span>
                                <span className="text-muted-foreground"> / {item.parLevel}</span>
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Need {item.deficit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mkeAlerts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        MKE - Below Par ({mkeAlerts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {mkeAlerts.map((item) => (
                          <div key={item.sku} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`par-alert-mke-${item.sku}`}>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-mono font-medium">{item.sku}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="text-sm tabular-nums">
                                <span className="text-red-600 dark:text-red-400 font-semibold">{item.currentTotal}</span>
                                <span className="text-muted-foreground"> / {item.parLevel}</span>
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Need {item.deficit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
}
