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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem } from "@shared/schema";

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

  const filtered = items?.filter((item) => {
    const q = search.toLowerCase();
    return item.sku.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
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

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "No matching SKUs found" : "No SKUs yet"}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <Card key={item.sku} data-testid={`card-sku-${item.sku}`}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono font-medium truncate" data-testid={`text-sku-${item.sku}`}>{item.sku}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.species && (
                      <Badge variant="outline" className="text-[10px] no-default-hover-elevate">{item.species}</Badge>
                    )}
                    <Badge variant={item.status === "Active" ? "default" : "secondary"} className="text-[10px] no-default-hover-elevate">
                      {item.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
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
