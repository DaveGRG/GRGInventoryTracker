import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Loader2, Gauge } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@shared/schema";

export default function ParLevelsPage() {
  const [search, setSearch] = useState("");
  const [editedLevels, setEditedLevels] = useState<Record<string, { farmParLevel: number; mkeParLevel: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    select: (data: any[]) =>
      data.map((item) => ({
        sku: item.sku,
        description: item.description,
        category: item.category,
        species: item.species,
        thickness: item.thickness,
        width: item.width,
        length: item.length,
        farmParLevel: item.farmParLevel,
        mkeParLevel: item.mkeParLevel,
        status: item.status,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
  });

  const filteredItems = useMemo(() => {
    let result = items ? [...items] : [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.sku.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const aBS = a.sku.includes(" BS ") ? 1 : 0;
      const bBS = b.sku.includes(" BS ") ? 1 : 0;
      if (aBS !== bBS) return aBS - bBS;
      return a.sku.localeCompare(b.sku);
    });
  }, [items, search]);

  const getDisplayValue = (sku: string, hub: "farm" | "mke"): string => {
    const edited = editedLevels[sku];
    if (edited) {
      return String(hub === "farm" ? edited.farmParLevel : edited.mkeParLevel);
    }
    const item = items?.find((i) => i.sku === sku);
    if (!item) return "0";
    return String(hub === "farm" ? item.farmParLevel : item.mkeParLevel);
  };

  const handleChange = (sku: string, hub: "farm" | "mke", value: string) => {
    const parsed = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;

    const item = items?.find((i) => i.sku === sku);
    if (!item) return;

    const current = editedLevels[sku] || {
      farmParLevel: item.farmParLevel,
      mkeParLevel: item.mkeParLevel,
    };

    const updated = {
      ...current,
      [hub === "farm" ? "farmParLevel" : "mkeParLevel"]: parsed,
    };

    if (updated.farmParLevel === item.farmParLevel && updated.mkeParLevel === item.mkeParLevel) {
      const next = { ...editedLevels };
      delete next[sku];
      setEditedLevels(next);
    } else {
      setEditedLevels((prev) => ({ ...prev, [sku]: updated }));
    }
  };

  const changedCount = Object.keys(editedLevels).length;

  const handleSubmit = async () => {
    if (changedCount === 0) return;
    setIsSubmitting(true);

    let successCount = 0;
    let errorCount = 0;

    for (const [sku, levels] of Object.entries(editedLevels)) {
      try {
        await apiRequest("PATCH", `/api/inventory/${encodeURIComponent(sku)}/par-levels`, levels);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/par-levels"] });

    setIsSubmitting(false);
    setEditedLevels({});

    if (errorCount > 0) {
      toast({
        title: "Partial update",
        description: `${successCount} updated, ${errorCount} failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Par levels updated",
        description: `${successCount} item${successCount !== 1 ? "s" : ""} updated successfully.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Par Levels" />
      <BottomNav showBack backTo="/more" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search SKU or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-par-levels"
          />
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="outline" className="no-default-hover-elevate text-xs tabular-nums" data-testid="text-item-count">
            {filteredItems.length} items
          </Badge>
          {changedCount > 0 && (
            <Badge variant="default" className="no-default-hover-elevate text-xs tabular-nums" data-testid="text-changed-count">
              {changedCount} changed
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 px-3 pb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Item</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-20 text-center">Farm</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-20 text-center">MKE</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const isEdited = !!editedLevels[item.sku];
              return (
                <Card
                  key={item.sku}
                  className={isEdited ? "border-primary/50 bg-primary/5" : ""}
                  data-testid={`par-level-item-${item.sku}`}
                >
                  <CardContent className="p-3">
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1">
                      <div className="min-w-0">
                        <span className="text-sm font-mono font-semibold" data-testid={`text-sku-${item.sku}`}>
                          {item.sku}
                        </span>
                        <p className="text-xs text-muted-foreground truncate mt-0.5" data-testid={`text-desc-${item.sku}`}>
                          {item.description}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={getDisplayValue(item.sku, "farm")}
                        onChange={(e) => handleChange(item.sku, "farm", e.target.value)}
                        className="w-20 text-center tabular-nums"
                        data-testid={`input-farm-par-${item.sku}`}
                      />
                      <Input
                        type="number"
                        min="0"
                        value={getDisplayValue(item.sku, "mke")}
                        onChange={(e) => handleChange(item.sku, "mke", e.target.value)}
                        className="w-20 text-center tabular-nums"
                        data-testid={`input-mke-par-${item.sku}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground" data-testid="text-no-items">
                {search ? "No items match your search" : "No inventory items found"}
              </div>
            )}
          </div>
        )}

        {changedCount > 0 && (
          <div className="sticky bottom-20 z-30 pt-2">
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="button-save-par-levels"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes ({changedCount} item{changedCount !== 1 ? "s" : ""})
                </>
              )}
            </Button>
          </div>
        )}

        {!isLoading && filteredItems.length > 0 && changedCount === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground" data-testid="text-par-levels-hint">
            <Gauge className="h-5 w-5 mx-auto mb-2 text-muted-foreground/50" />
            Edit Farm or MKE par levels above, then save.
          </div>
        )}
      </div>

    </div>
  );
}
