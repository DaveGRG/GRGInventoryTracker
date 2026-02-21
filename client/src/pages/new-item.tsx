import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function NewItemPage() {
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
  const [, navigate] = useLocation();

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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Item created", description: "New inventory item added successfully." });
      navigate("/inventory");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="New Item" showBack />
      <BottomNav />
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
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
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/more")} data-testid="button-cancel-new-item">Cancel</Button>
          <Button
            className="flex-1"
            onClick={handleCreate}
            disabled={!sku.trim() || !description.trim() || createItemMutation.isPending}
            data-testid="button-save-new-item"
          >
            {createItemMutation.isPending ? "Creating..." : "Create Item"}
          </Button>
        </div>
      </div>
    </div>
  );
}
