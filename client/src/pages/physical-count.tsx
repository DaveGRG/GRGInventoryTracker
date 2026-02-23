import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ClipboardCheck, Loader2, ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem, StockLevel, Location as LocationType } from "@shared/schema";

interface StockWithLocation extends StockLevel {
  locationName?: string;
  hub?: string;
}

interface InventoryItemWithStock extends InventoryItem {
  stockLevels: StockWithLocation[];
}

export default function PhysicalCountPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [search, setSearch] = useState("");
  const [countedQuantities, setCountedQuantities] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [submissionResult, setSubmissionResult] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: items, isLoading: itemsLoading } = useQuery<InventoryItemWithStock[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: locationsList, isLoading: locationsLoading } = useQuery<LocationType[]>({
    queryKey: ["/api/locations"],
  });

  const physicalLocations = useMemo(
    () => locationsList?.filter((loc) => loc.locationId !== "TRANSIT") || [],
    [locationsList]
  );

  const getQtyAtLocation = (item: InventoryItemWithStock, locId: string): number => {
    return item.stockLevels?.find((sl) => sl.locationId === locId)?.quantity || 0;
  };

  const locationItems = useMemo(() => {
    if (!selectedLocation || !items) return [];
    return items.map((item) => ({
      ...item,
      systemQty: getQtyAtLocation(item, selectedLocation),
    }));
  }, [selectedLocation, items]);

  const filteredItems = useMemo(() => {
    if (!search) return locationItems;
    const q = search.toLowerCase();
    return locationItems.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [locationItems, search]);

  const getCountedQty = (sku: string, systemQty: number): number => {
    const val = countedQuantities[sku];
    if (val === undefined || val === "") return systemQty;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? systemQty : parsed;
  };

  const getInputValue = (sku: string, systemQty: number): string => {
    const val = countedQuantities[sku];
    if (val !== undefined) return val;
    return String(systemQty);
  };

  const hasDifference = (sku: string, systemQty: number): boolean => {
    const val = countedQuantities[sku];
    if (val === undefined || val === "") return false;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return false;
    return parsed !== systemQty;
  };

  const getSkuPrefix = (sku: string): string => {
    const match = sku.match(/^([A-Za-z]+)/);
    return match ? match[1] : "Other";
  };

  const prefixLabels: Record<string, string> = {
    CDR: "Cedar",
    CT: "Cedar Tone",
    BL: "Black Locust",
  };

  const parseDim = (val: string | null | undefined): number => {
    if (!val) return 0;
    const m = val.match(/[\d/.]+/);
    if (!m) return 0;
    if (m[0].includes("/")) {
      const parts = m[0].split("/");
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(m[0]);
  };

  const sortByDimension = (a: { thickness?: string | null; width?: string | null; length?: string | null; sku: string }, b: { thickness?: string | null; width?: string | null; length?: string | null; sku: string }) => {
    const aBS = a.sku.includes(" BS ") ? 1 : 0;
    const bBS = b.sku.includes(" BS ") ? 1 : 0;
    if (aBS !== bBS) return aBS - bBS;
    const at = parseDim(a.thickness), bt = parseDim(b.thickness);
    if (at !== bt) return at - bt;
    const aw = parseDim(a.width), bw = parseDim(b.width);
    if (aw !== bw) return aw - bw;
    const al = parseDim(a.length), bl = parseDim(b.length);
    if (al !== bl) return al - bl;
    return a.sku.localeCompare(b.sku);
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      const prefix = getSkuPrefix(item.sku);
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(item);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => [key, [...items].sort(sortByDimension)] as [string, typeof filteredItems]);
  }, [filteredItems]);

  const toggleCategory = (prefix: string) => {
    setOpenCategories((prev) => ({ ...prev, [prefix]: !prev[prefix] }));
  };

  const diffCount = useMemo(() => {
    return locationItems.filter((item) => hasDifference(item.sku, item.systemQty)).length;
  }, [locationItems, countedQuantities]);

  const itemsWithDiffs = useMemo(() => {
    return locationItems.filter((item) => hasDifference(item.sku, item.systemQty));
  }, [locationItems, countedQuantities]);

  const handleQuantityChange = (sku: string, value: string) => {
    setCountedQuantities((prev) => ({ ...prev, [sku]: value }));
  };

  const handleLocationChange = (locId: string) => {
    setSelectedLocation(locId);
    setCountedQuantities({});
    setSubmissionResult(null);
    setSearch("");
  };

  const handleSubmit = async () => {
    if (locationItems.length === 0) return;
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const items = locationItems.map((item) => ({
        sku: item.sku,
        systemQty: item.systemQty,
        countedQty: getCountedQty(item.sku, item.systemQty),
      }));

      await apiRequest("POST", "/api/reconciliation-reports", {
        locationId: selectedLocation,
        items,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation-reports"] });

      const discrepancyCount = items.filter((i) => i.systemQty !== i.countedQty).length;
      setIsSubmitting(false);
      setSubmissionResult(items.length);
      setCountedQuantities({});

      toast({
        title: "Reconciliation report submitted",
        description: `${items.length} items counted, ${discrepancyCount} discrepanc${discrepancyCount !== 1 ? "ies" : "y"} found.`,
      });
    } catch {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to submit reconciliation report.",
        variant: "destructive",
      });
    }
  };

  const isLoading = itemsLoading || locationsLoading;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Physical Count" />
      <BottomNav showBack backTo="/" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="location-select">
            Select Location
          </label>
          <Select
            value={selectedLocation}
            onValueChange={handleLocationChange}
          >
            <SelectTrigger data-testid="select-location" id="location-select">
              <SelectValue placeholder="Choose a location..." />
            </SelectTrigger>
            <SelectContent>
              {physicalLocations.map((loc) => (
                <SelectItem
                  key={loc.locationId}
                  value={loc.locationId}
                  data-testid={`select-location-option-${loc.locationId}`}
                >
                  {loc.locationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedLocation && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search SKU or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-physical-count"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="no-default-hover-elevate text-xs tabular-nums" data-testid="text-total-items">
                  {filteredItems.length} items
                </Badge>
                {diffCount > 0 && (
                  <Badge variant="default" className="no-default-hover-elevate text-xs tabular-nums" data-testid="text-diff-count">
                    {diffCount} difference{diffCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              {submissionResult !== null && (
                <Badge variant="outline" className="no-default-hover-elevate text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" data-testid="text-submission-result">
                  {submissionResult} item{submissionResult !== 1 ? "s" : ""} adjusted
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {groupedItems.map(([prefix, groupItems]) => {
                  const isOpen = openCategories[prefix] || false;
                  const groupDiffs = groupItems.filter((item) => hasDifference(item.sku, item.systemQty)).length;
                  return (
                    <Collapsible key={prefix} open={isOpen} onOpenChange={() => toggleCategory(prefix)}>
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                          data-testid={`toggle-category-${prefix}`}
                        >
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-semibold text-sm">{prefix}</span>
                            <span className="text-xs text-muted-foreground">{prefixLabels[prefix] || prefix}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {groupDiffs > 0 && (
                              <Badge variant="default" className="no-default-hover-elevate text-xs tabular-nums">
                                {groupDiffs}
                              </Badge>
                            )}
                            <Badge variant="outline" className="no-default-hover-elevate text-xs tabular-nums">
                              {groupItems.length}
                            </Badge>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-1 border rounded-lg overflow-hidden">
                          <div className="max-h-[60vh] overflow-y-auto">
                            <div className="grid px-3 py-2 bg-muted border-b sticky top-0 z-10" style={{ gridTemplateColumns: '1fr 3.5rem minmax(0, 9rem)' }}>
                              <span></span>
                              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold text-center leading-tight">System<br/>Qty</span>
                              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold text-center leading-tight">Count</span>
                            </div>
                            {groupItems.map((item) => {
                              const systemQty = item.systemQty;
                              const isDiff = hasDifference(item.sku, systemQty);
                              const currentVal = parseInt(getInputValue(item.sku, systemQty), 10) || 0;
                              return (
                                <div
                                  key={item.sku}
                                  className={`grid items-center px-3 py-2 border-b last:border-b-0 ${isDiff ? "bg-primary/5" : ""}`}
                                  style={{ gridTemplateColumns: '1fr 3.5rem minmax(0, 9rem)' }}
                                  data-testid={`physical-count-item-${item.sku}`}
                                >
                                  <span
                                    className="text-sm font-mono font-semibold min-w-0 truncate"
                                    data-testid={`text-sku-${item.sku}`}
                                  >
                                    {item.sku}
                                  </span>
                                  <p
                                    className="text-sm font-semibold tabular-nums text-center"
                                    data-testid={`text-system-qty-${item.sku}`}
                                  >
                                    {systemQty}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleQuantityChange(item.sku, String(Math.max(0, currentVal - 1)))}
                                      className="flex-none touch-manipulation"
                                      data-testid={`button-minus-${item.sku}`}
                                    >
                                      <Minus className="h-5 w-5" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={getInputValue(item.sku, systemQty)}
                                      onChange={(e) => handleQuantityChange(item.sku, e.target.value)}
                                      className="flex-1 min-w-0 text-center tabular-nums"
                                      data-testid={`input-counted-qty-${item.sku}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleQuantityChange(item.sku, String(currentVal + 1))}
                                      className="flex-none touch-manipulation"
                                      data-testid={`button-plus-${item.sku}`}
                                    >
                                      <Plus className="h-5 w-5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground" data-testid="text-no-items">
                    {search ? "No items match your search" : "No inventory items found"}
                  </div>
                )}
              </div>
            )}

            {locationItems.length > 0 && (
              <div className="sticky bottom-20 z-30 pt-2">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  data-testid="button-submit-count"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Submit Reconciliation Report{diffCount > 0 ? ` (${diffCount} discrepanc${diffCount !== 1 ? "ies" : "y"})` : ""}
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {!selectedLocation && !isLoading && (
          <div className="text-center py-16 text-sm text-muted-foreground" data-testid="text-select-location-prompt">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">Select a location to begin</p>
            <p className="mt-1">Choose a storage location above to start your physical count.</p>
          </div>
        )}
      </div>

    </div>
  );
}
