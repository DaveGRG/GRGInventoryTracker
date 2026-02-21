import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem } from "@shared/schema";

const speciesDisplayName: Record<string, string> = {
  Cedar: "CDR",
  "Cedar Tone": "CT",
  "Black Locust": "BL",
};

export default function ManageSkusPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Lumber");
  const [species, setSpecies] = useState("");
  const [thickness, setThickness] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [farmPar, setFarmPar] = useState("");
  const [mkePar, setMkePar] = useState("");
  const [notes, setNotes] = useState("");
  const [editedLevels, setEditedLevels] = useState<Record<string, { farmParLevel: number; mkeParLevel: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: {
      sku: string; description: string; category: string; species?: string;
      thickness?: string; width?: string; length?: string;
      farmParLevel: number; mkeParLevel: number; notes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "SKU created", description: "New inventory item added successfully." });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSku("");
    setDescription("");
    setCategory("Lumber");
    setSpecies("");
    setThickness("");
    setWidth("");
    setLength("");
    setFarmPar("");
    setMkePar("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!sku.trim() || !description.trim()) return;
    createItemMutation.mutate({
      sku: sku.trim().toUpperCase(),
      description: description.trim(),
      category,
      species: species || undefined,
      thickness: thickness || undefined,
      width: width || undefined,
      length: length || undefined,
      farmParLevel: parseInt(farmPar) || 0,
      mkeParLevel: parseInt(mkePar) || 0,
      notes: notes || undefined,
    });
  };

  const getDisplayValue = (skuId: string, hub: "farm" | "mke"): string => {
    const edited = editedLevels[skuId];
    if (edited) {
      return String(hub === "farm" ? edited.farmParLevel : edited.mkeParLevel);
    }
    const item = items?.find((i) => i.sku === skuId);
    if (!item) return "0";
    return String(hub === "farm" ? item.farmParLevel : item.mkeParLevel);
  };

  const handleParChange = (skuId: string, hub: "farm" | "mke", value: string) => {
    const parsed = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;

    const item = items?.find((i) => i.sku === skuId);
    if (!item) return;

    const current = editedLevels[skuId] || {
      farmParLevel: item.farmParLevel,
      mkeParLevel: item.mkeParLevel,
    };

    const updated = {
      ...current,
      [hub === "farm" ? "farmParLevel" : "mkeParLevel"]: parsed,
    };

    if (updated.farmParLevel === item.farmParLevel && updated.mkeParLevel === item.mkeParLevel) {
      const next = { ...editedLevels };
      delete next[skuId];
      setEditedLevels(next);
    } else {
      setEditedLevels((prev) => ({ ...prev, [skuId]: updated }));
    }
  };

  const changedCount = Object.keys(editedLevels).length;

  const handleSaveParLevels = async () => {
    if (changedCount === 0) return;
    setIsSubmitting(true);

    let successCount = 0;
    let errorCount = 0;

    for (const [skuId, levels] of Object.entries(editedLevels)) {
      try {
        await apiRequest("PATCH", `/api/inventory/${encodeURIComponent(skuId)}/par-levels`, levels);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/par-levels"] });

    setIsSubmitting(false);
    setEditedLevels({});

    if (errorCount > 0) {
      toast({ title: "Partial update", description: `${successCount} updated, ${errorCount} failed.`, variant: "destructive" });
    } else {
      toast({ title: "Par levels updated", description: `${successCount} item${successCount !== 1 ? "s" : ""} updated successfully.` });
    }
  };

  const parseDimensions = (skuStr: string): [number, number, number] => {
    const match = skuStr.match(/(\d+)x(\d+)x(\d+)/i);
    if (match) {
      return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    }
    return [9999, 9999, 9999];
  };

  const filtered = items?.filter((item) => {
    const q = search.toLowerCase();
    return item.sku.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  }).sort((a, b) => {
    const [aThick, aWidth, aLen] = parseDimensions(a.sku);
    const [bThick, bWidth, bLen] = parseDimensions(b.sku);
    if (aThick !== bThick) return aThick - bThick;
    if (aWidth !== bWidth) return aWidth - bWidth;
    if (aLen !== bLen) return aLen - bLen;
    return a.sku.localeCompare(b.sku);
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Manage SKUs" showBack />
      <BottomNav />

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search SKUs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-skus"
            />
          </div>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-sku">
            <Plus className="h-4 w-4 mr-1" /> Add SKU
          </Button>
        </div>

        {changedCount > 0 && (
          <Badge variant="default" className="no-default-hover-elevate text-xs tabular-nums" data-testid="text-changed-count">
            {changedCount} changed
          </Badge>
        )}

        <div className="flex items-end px-3 pb-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex-1">Item</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-semibold">Set Par</span>
            <div className="flex gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-16 text-center">Farm</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-16 text-center">MKE</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "No matching SKUs found" : "No SKUs yet"}
          </p>
        ) : (
          <div className="space-y-1">
            {(() => {
              const grouped: Record<string, InventoryItem[]> = {};
              for (const item of filtered) {
                const group = item.species || "Other";
                if (!grouped[group]) grouped[group] = [];
                grouped[group].push(item);
              }
              const groupOrder = Object.keys(grouped).sort();
              const isSearching = !!search;

              const toggleGroup = (group: string) => {
                setExpandedGroups((prev) => {
                  const next = new Set(prev);
                  if (next.has(group)) next.delete(group);
                  else next.add(group);
                  return next;
                });
              };

              return groupOrder.map((group) => {
                const groupItems = grouped[group];
                const displayName = speciesDisplayName[group] || group;
                const isOpen = expandedGroups.has(group) || isSearching;

                return (
                  <Collapsible key={group} open={isOpen} onOpenChange={() => toggleGroup(group)}>
                    <CollapsibleTrigger className="w-full" data-testid={`group-toggle-${displayName}`}>
                      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30 rounded-md">
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm font-semibold">{displayName}</span>
                        </div>
                        <Badge variant="outline" className="no-default-hover-elevate text-xs tabular-nums">
                          {groupItems.length} items
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-1 py-1">
                        {groupItems.map((item) => {
                          const isEdited = !!editedLevels[item.sku];
                          return (
                            <Card
                              key={item.sku}
                              className={isEdited ? "border-primary/50 bg-primary/5" : ""}
                              data-testid={`card-sku-${item.sku}`}
                            >
                              <CardContent className="p-3">
                                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-mono font-medium truncate" data-testid={`text-sku-${item.sku}`}>{item.sku}</p>
                                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                  </div>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={getDisplayValue(item.sku, "farm")}
                                    onChange={(e) => handleParChange(item.sku, "farm", e.target.value)}
                                    className="w-16 text-center tabular-nums"
                                    data-testid={`input-farm-par-${item.sku}`}
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    value={getDisplayValue(item.sku, "mke")}
                                    onChange={(e) => handleParChange(item.sku, "mke", e.target.value)}
                                    className="w-16 text-center tabular-nums"
                                    data-testid={`input-mke-par-${item.sku}`}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              });
            })()}
          </div>
        )}

        {changedCount > 0 && (
          <div className="sticky bottom-4 z-30 pt-2">
            <Button
              className="w-full"
              onClick={handleSaveParLevels}
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New SKU</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>SKU *</Label>
              <Input
                placeholder="e.g. CDR 2x4x08"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="font-mono"
                data-testid="input-new-sku"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Input
                placeholder="e.g. 2x4x08' Cedar"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-new-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-new-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lumber">Lumber</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Species</Label>
                <Select value={species || "none"} onValueChange={(v) => setSpecies(v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="select-new-species">
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Black Locust">Black Locust</SelectItem>
                    <SelectItem value="Cedar">Cedar</SelectItem>
                    <SelectItem value="Cedar Tone">Cedar Tone</SelectItem>
                    <SelectItem value="Pine">Pine</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Thickness</Label>
                <Input
                  placeholder='e.g. 2"'
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  data-testid="input-new-thickness"
                />
              </div>
              <div>
                <Label>Width</Label>
                <Input
                  placeholder='e.g. 4"'
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  data-testid="input-new-width"
                />
              </div>
              <div>
                <Label>Length</Label>
                <Input
                  placeholder="e.g. 8'"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  data-testid="input-new-length"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Farm Par Level</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={farmPar}
                  onChange={(e) => setFarmPar(e.target.value)}
                  data-testid="input-new-farm-par"
                />
              </div>
              <div>
                <Label>MKE Par Level</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={mkePar}
                  onChange={(e) => setMkePar(e.target.value)}
                  data-testid="input-new-mke-par"
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                data-testid="input-new-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-new-sku">Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!sku.trim() || !description.trim() || createItemMutation.isPending}
              data-testid="button-save-new-sku"
            >
              {createItemMutation.isPending ? "Creating..." : "Create SKU"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
