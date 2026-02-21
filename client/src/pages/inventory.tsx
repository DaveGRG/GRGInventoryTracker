import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { InventoryListSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, ChevronRight, Minus, Plus, Trash2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link, useLocation } from "wouter";
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

const hubLocationMap: Record<string, string> = {
  Farm: "FARM",
  MKE: "MKE",
};

const speciesDisplayName: Record<string, string> = {
  Cedar: "CDR",
  "Cedar Tone": "CT",
  "Black Locust": "BL",
};

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [hub, setHub] = useState("Farm");
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [belowParOnly, setBelowParOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithStock | null>(null);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustLocation, setAdjustLocation] = useState("");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: items, isLoading } = useQuery<InventoryItemWithStock[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: locationsList } = useQuery<LocationType[]>({
    queryKey: ["/api/locations"],
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: { sku: string; locationId: string; newQuantity: number; reason: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/stock/adjust", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Stock adjusted", description: "Count updated successfully." });
      setAdjustDialog(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (sku: string) => {
      const res = await apiRequest("DELETE", `/api/inventory/${sku}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Item deleted", description: "Inventory item and related data removed." });
      setSelectedItem(null);
      setDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const currentLocationId = hubLocationMap[hub] || "FARM";

  const species = Array.from(new Set(items?.map((i) => i.species).filter(Boolean) || []));

  const filteredItems = items?.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!item.sku.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
    }
    if (speciesFilter && item.species !== speciesFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (belowParOnly) {
      const parLevel = hub === "Farm" ? item.farmParLevel : item.mkeParLevel;
      if (parLevel === 0) return false;
      const qty = getQtyAtLocation(item, currentLocationId);
      if (qty >= parLevel) return false;
    }
    return true;
  });


  function getQtyAtLocation(item: InventoryItemWithStock, locId: string) {
    return item.stockLevels?.find((sl) => sl.locationId === locId)?.quantity || 0;
  }

  const handleAdjust = () => {
    if (!selectedItem || !adjustLocation || !adjustQuantity || !adjustReason) return;
    adjustMutation.mutate({
      sku: selectedItem.sku,
      locationId: adjustLocation,
      newQuantity: parseInt(adjustQuantity),
      reason: adjustReason,
      notes: adjustNotes || undefined,
    });
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };




  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Inventory" />
      <BottomNav />

      <div className="sticky top-[7.5rem] z-30 bg-background border-b">
        <div className="p-3 space-y-2 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search SKU or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-inventory"
            />
          </div>

        </div>

        <div className="max-w-2xl mx-auto">
          <Tabs value={hub} onValueChange={(val) => { setHub(val); setExpandedGroups(new Set()); }}>
            <TabsList className="w-full rounded-none justify-start px-3 bg-[#5c4a1e]/10">
              <TabsTrigger value="Farm" data-testid="tab-farm" className="flex-1 data-[state=active]:bg-[#5c4a1e] data-[state=active]:text-white">Farm</TabsTrigger>
              <TabsTrigger value="MKE" data-testid="tab-mke" className="flex-1 data-[state=active]:bg-[#5c4a1e] data-[state=active]:text-white">MKE</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap px-3 py-2 max-w-2xl mx-auto">
          <Badge
            variant={belowParOnly ? "default" : "outline"}
            className={`cursor-pointer text-xs ${belowParOnly ? "" : ""}`}
            onClick={() => setBelowParOnly(!belowParOnly)}
            data-testid="filter-below-par"
          >
            Below Par
          </Badge>
          {species.map((sp) => (
            <Badge
              key={sp}
              variant={speciesFilter === sp ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSpeciesFilter(speciesFilter === sp ? null : sp!)}
              data-testid={`filter-species-${sp}`}
            >
              {sp === "Cedar" ? "CDR" : sp === "Cedar Tone" ? "CT" : sp}
            </Badge>
          ))}
          <Badge
            variant={statusFilter === "Discontinuing" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setStatusFilter(statusFilter === "Discontinuing" ? null : "Discontinuing")}
            data-testid="filter-discontinuing"
          >
            Discontinuing
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <InventoryListSkeleton />
      ) : (
        <div className="max-w-2xl mx-auto">
          {(() => {
            const groupedBySpecies: Record<string, InventoryItemWithStock[]> = {};
            for (const item of (filteredItems || [])) {
              const group = item.species || "Other";
              if (!groupedBySpecies[group]) groupedBySpecies[group] = [];
              groupedBySpecies[group].push(item);
            }

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

            const sortByDimension = (a: InventoryItemWithStock, b: InventoryItemWithStock) => {
              const at = parseDim(a.thickness), bt = parseDim(b.thickness);
              if (at !== bt) return at - bt;
              const aw = parseDim(a.width), bw = parseDim(b.width);
              if (aw !== bw) return aw - bw;
              const al = parseDim(a.length), bl = parseDim(b.length);
              if (al !== bl) return al - bl;
              return a.sku.localeCompare(b.sku);
            };

            const speciesOrder = Object.keys(groupedBySpecies).sort();
            const isSearching = !!search;

            return speciesOrder.map((group) => {
              const groupItems = groupedBySpecies[group].sort(sortByDimension);
              const displayName = speciesDisplayName[group] || group;
              const groupInStock = groupItems.filter((item) =>
                item.stockLevels?.some((sl) => sl.locationId === currentLocationId && sl.quantity > 0)
              );
              const groupNoStock = groupItems.filter((item) => getQtyAtLocation(item, currentLocationId) === 0);
              const isOpen = expandedGroups.has(group) || isSearching;

              return (
                <Collapsible key={group} open={isOpen} onOpenChange={() => toggleGroup(group)}>
                  <CollapsibleTrigger className="w-full" data-testid={`group-toggle-${displayName}`}>
                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-semibold">{displayName}</span>
                      </div>
                      <Badge variant="outline" className="no-default-hover-elevate text-xs tabular-nums">
                        {groupItems.length} items{!isOpen && groupNoStock.length > 0 ? `, ${groupNoStock.length} not in stock` : ""}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="divide-y">
                      {groupInStock.map((item) => {
                        const qty = getQtyAtLocation(item, currentLocationId);
                        const parLevel = hub === "Farm" ? item.farmParLevel : item.mkeParLevel;
                        return (
                          <div
                            key={item.sku}
                            className="px-4 py-3 hover-elevate cursor-pointer"
                            onClick={() => setSelectedItem(item)}
                            data-testid={`item-row-${item.sku}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-mono font-semibold">{item.sku}</span>
                                  <StatusBadge status={item.status} />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <p className="text-xl font-bold tabular-nums" data-testid={`text-qty-${item.sku}`}>{qty}</p>
                                {parLevel > 0 && qty < parLevel && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" data-testid={`icon-below-par-${item.sku}`} />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {groupNoStock.map((item) => {
                      const parLevel = hub === "Farm" ? item.farmParLevel : item.mkeParLevel;
                      return (
                        <div
                          key={item.sku}
                          className="px-4 py-3 hover-elevate cursor-pointer opacity-60"
                          onClick={() => setSelectedItem(item)}
                          data-testid={`item-row-${item.sku}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono font-semibold">{item.sku}</span>
                                <StatusBadge status={item.status} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <p className="text-xl font-bold tabular-nums text-muted-foreground" data-testid={`text-qty-${item.sku}`}>0</p>
                              {parLevel > 0 && (
                                <AlertTriangle className="h-4 w-4 text-red-500" data-testid={`icon-below-par-${item.sku}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            });
          })()}
        </div>
      )}

      <Dialog open={!!selectedItem && !adjustDialog} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-lg">{selectedItem.sku}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Species</span>
                    <p className="font-medium">{selectedItem.species || "--"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Status</span>
                    <div className="mt-0.5"><StatusBadge status={selectedItem.status} /></div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Dimensions</span>
                    <p className="font-medium">{[selectedItem.thickness, selectedItem.width, selectedItem.length].filter(Boolean).join(" x ") || "--"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Category</span>
                    <p className="font-medium">{selectedItem.category}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Stock by Location</h4>
                  <div className="space-y-1">
                    {selectedItem.stockLevels?.filter((sl) => sl.quantity > 0).map((sl) => (
                      <div key={sl.locationId} className="flex items-center justify-between py-1.5 text-sm">
                        <span>{sl.locationName || sl.locationId}</span>
                        <span className="font-semibold tabular-nums">{sl.quantity}</span>
                      </div>
                    ))}
                    {(!selectedItem.stockLevels || selectedItem.stockLevels.filter((sl) => sl.quantity > 0).length === 0) && (
                      <p className="text-sm text-muted-foreground py-2">No stock on hand</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground text-xs">Farm Par Level</span>
                    <p className="font-semibold tabular-nums">{selectedItem.farmParLevel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">MKE Par Level</span>
                    <p className="font-semibold tabular-nums">{selectedItem.mkeParLevel}</p>
                  </div>
                </div>

                {selectedItem.notes && (
                  <div>
                    <span className="text-muted-foreground text-xs">Notes</span>
                    <p className="text-sm">{selectedItem.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1"
                  onClick={() => setAdjustDialog(true)}
                  data-testid="button-adjust-count"
                >
                  Adjust Count
                </Button>
                <Button variant="outline" className="flex-1" asChild data-testid="button-create-transfer">
                  <Link href={`/transfers/new?sku=${selectedItem.sku}`}>Transfer</Link>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirm(true)}
                  data-testid="button-delete-item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-mono font-semibold">{selectedItem?.sku}</span> and remove all associated stock levels, allocations, transfers, and pick lists. Any reserved allocations will be released. This action is recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-item">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteItemMutation.mutate(selectedItem.sku)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-item"
            >
              {deleteItemMutation.isPending ? "Deleting..." : "Delete Item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Count</DialogTitle>
            <p className="text-sm text-muted-foreground font-mono">{selectedItem?.sku}</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location</Label>
              <Select value={adjustLocation} onValueChange={setAdjustLocation}>
                <SelectTrigger data-testid="select-adjust-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locationsList?.filter((l) => l.locationId !== "TRANSIT").map((loc) => (
                    <SelectItem key={loc.locationId} value={loc.locationId}>{loc.locationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Quantity</Label>
              <Input
                type="number"
                min="0"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                data-testid="input-adjust-quantity"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger data-testid="select-adjust-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical Count">Physical Count</SelectItem>
                  <SelectItem value="Received Shipment">Received Shipment</SelectItem>
                  <SelectItem value="Damaged/Waste">Damaged/Waste</SelectItem>
                  <SelectItem value="Correction">Correction</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} data-testid="input-adjust-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAdjust}
              disabled={!adjustLocation || !adjustQuantity || !adjustReason || adjustMutation.isPending}
              data-testid="button-confirm-adjust"
            >
              {adjustMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
