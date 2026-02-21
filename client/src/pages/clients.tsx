import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Search, Users, ChevronRight, Loader2, MapPin, Calendar } from "lucide-react";
import { Link } from "wouter";
import type { ClientSummary } from "@/lib/types";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const { data: clients, isLoading } = useQuery<ClientSummary[]>({
    queryKey: ["/api/clients"],
  });

  const filtered = useMemo(() => {
    if (!clients) return [];
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.products.some((p) => p.projectName.toLowerCase().includes(q))
    );
  }, [clients, search]);

  const toggleExpand = (clientName: string) => {
    setExpandedClient((prev) => (prev === clientName ? null : clientName));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Projects" />

      <div className="sticky top-14 z-30 bg-background border-b">
        <div className="p-3 space-y-2 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-clients"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="no-default-hover-elevate text-xs tabular-nums" data-testid="text-client-count">
              {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            </Badge>
            {clients && (
              <Badge variant="outline" className="no-default-hover-elevate text-xs tabular-nums" data-testid="text-total-products">
                {clients.reduce((sum, c) => sum + c.productCount, 0)} total products
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="p-4 space-y-2 max-w-2xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-clients">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">{search ? "No projects match your search" : "No projects yet"}</p>
              <p className="text-xs mt-1">Projects appear here when you create products with a client name.</p>
            </div>
          ) : (
            filtered.map((client) => {
              const isExpanded = expandedClient === client.name;
              return (
                <div key={client.name} data-testid={`client-card-${client.name}`}>
                  <Card
                    className="hover-elevate cursor-pointer"
                    onClick={() => toggleExpand(client.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-semibold text-sm" data-testid={`text-client-name-${client.name}`}>
                              {client.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {client.productCount} product{client.productCount !== 1 ? "s" : ""}
                            </span>
                            {client.activeCount > 0 && (
                              <Badge variant="default" className="no-default-hover-elevate text-[10px] tabular-nums">
                                {client.activeCount} active
                              </Badge>
                            )}
                            {client.completedCount > 0 && (
                              <Badge variant="outline" className="no-default-hover-elevate text-[10px] tabular-nums">
                                {client.completedCount} completed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-3">
                      {client.products.map((product) => (
                        <Link key={product.projectId} href={`/projects/${product.projectId}`}>
                          <Card
                            className="hover-elevate cursor-pointer"
                            data-testid={`client-product-${product.projectId}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{product.projectName}</span>
                                    <StatusBadge status={product.status} type="project" />
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {product.assignedHub}
                                    </span>
                                    {product.startDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(product.startDate).toLocaleDateString("en-US", {
                                          timeZone: "America/Chicago",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
