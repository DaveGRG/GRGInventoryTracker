import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter } from "lucide-react";
import type { AuditLogEntry } from "@shared/schema";

const actionTypes = [
  "Stock Adjustment", "Transfer", "Allocation", "Pick",
  "Physical Count", "Item Created", "Item Updated",
];

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: entries, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-log"],
  });

  const filtered = entries?.filter((e) => {
    if (actionFilter !== "all" && e.actionType !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(e.sku?.toLowerCase().includes(q) || false) &&
        !e.userEmail.toLowerCase().includes(q) &&
        !e.reason.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Audit Log" showBack />

      <div className="sticky top-14 z-30 bg-background border-b">
        <div className="p-3 space-y-2 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search by SKU, user, reason..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-audit" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={actionFilter === "all" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setActionFilter("all")}>All</Badge>
            {actionTypes.map((a) => (
              <Badge key={a} variant={actionFilter === a ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setActionFilter(a)} data-testid={`filter-audit-${a.replace(/\s/g, "-")}`}>
                {a}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2 max-w-2xl mx-auto">
          {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="p-4 space-y-2 max-w-2xl mx-auto">
          {filtered?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No audit entries found</div>
          ) : (
            filtered?.map((entry) => (
              <Card key={entry.id} data-testid={`card-audit-${entry.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{entry.actionType}</Badge>
                        {entry.sku && <span className="text-xs font-mono text-muted-foreground">{entry.sku}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{entry.reason}</p>
                      {entry.quantityBefore !== null && entry.quantityAfter !== null && (
                        <p className="text-xs mt-0.5">
                          <span className="text-muted-foreground">{entry.quantityBefore}</span>
                          <span className="text-muted-foreground mx-1">-&gt;</span>
                          <span className="font-semibold">{entry.quantityAfter}</span>
                          {entry.locationId && <span className="text-muted-foreground ml-1">@ {entry.locationId}</span>}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-muted-foreground">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{entry.userEmail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
