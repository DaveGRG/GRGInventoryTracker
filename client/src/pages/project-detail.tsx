import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo } from "react";
import { ArrowLeft, Plus, User, MapPin, Calendar, Trash2, PackageCheck, AlertTriangle, Undo2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Allocation, InventoryItem, Location as LocationType } from "@shared/schema";


export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocSku, setAllocSku] = useState("");
  const [allocQty, setAllocQty] = useState("");
  const [allocLocation, setAllocLocation] = useState("");
  const [checkedAllocations, setCheckedAllocations] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`, projectId],
    enabled: !!projectId,
  });

  const { data: allocationsData } = useQuery<Allocation[]>({
    queryKey: [`/api/projects/${projectId}/allocations`, projectId],
    enabled: !!projectId,
  });

  const { data: items } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  const { data: locationsList } = useQuery<LocationType[]>({
    queryKey: ["/api/locations"],
  });

  const { data: inventoryData } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const allocateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/allocations`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/allocations`] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Material allocated" });
      setAllocateOpen(false);
      setAllocSku("");
      setAllocQty("");
      setAllocLocation("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pullBatchMutation = useMutation({
    mutationFn: async (allocationIds: number[]) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/allocations/pull-batch`, { allocationIds });
      return res.json();
    },
    onSuccess: (data: { pulledCount: number }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/allocations`] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Materials pulled", description: `${data.pulledCount} item${data.pulledCount !== 1 ? "s" : ""} pulled from inventory.` });
      setCheckedAllocations(new Set());
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unpullBatchMutation = useMutation({
    mutationFn: async (allocationIds: number[]) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/allocations/unpull-batch`, { allocationIds });
      return res.json();
    },
    onSuccess: (data: { unpulledCount: number }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/allocations`] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Materials unpulled", description: `${data.unpulledCount} item${data.unpulledCount !== 1 ? "s" : ""} returned to inventory.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Product deleted", description: "Product and all related data removed." });
      navigate("/products");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (inventoryData) {
      for (const item of inventoryData) {
        for (const sl of item.stockLevels || []) {
          map[`${item.sku}::${sl.locationId}`] = sl.quantity || 0;
        }
      }
    }
    return map;
  }, [inventoryData]);

  const hasInsufficientStock = (alloc: Allocation): boolean => {
    if (!alloc.sourceLocation) return false;
    const available = stockMap[`${alloc.sku}::${alloc.sourceLocation}`] ?? 0;
    return alloc.quantity > available;
  };

  const pullableAllocations = allocationsData?.filter((a) =>
    a.status === "Planning" && a.sourceLocation && !hasInsufficientStock(a)
  ) || [];

  const toggleAllocation = (id: number) => {
    setCheckedAllocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedAllocations.size === pullableAllocations.length) {
      setCheckedAllocations(new Set());
    } else {
      setCheckedAllocations(new Set(pullableAllocations.map((a) => a.id)));
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Product" />
        <BottomNav showBack backTo="/projects" />
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Product Not Found" />
        <BottomNav showBack backTo="/projects" />
        <div className="p-4 text-center py-12">
          <p className="text-muted-foreground">Product not found.</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/projects">Back to Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={project.projectName} />
      <BottomNav showBack backTo="/projects" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{project.projectName}</h2>
              <StatusBadge status={project.status} type="project" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{project.client}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{project.assignedHub}</span>
              </div>
              {project.projectLead && (
                <div className="text-muted-foreground">
                  <span className="text-xs">Lead:</span> {project.projectLead}
                </div>
              )}
              {project.startDate && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(project.startDate).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}</span>
                </div>
              )}
            </div>
            {project.notes && <p className="text-sm text-muted-foreground">{project.notes}</p>}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-mono text-muted-foreground">{project.projectId}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                data-testid="button-delete-product"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">Materials ({allocationsData?.length || 0})</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setAllocateOpen(true)} data-testid="button-add-material">
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
            </div>
          </div>

          {pullableAllocations.length > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={checkedAllocations.size === pullableAllocations.length && pullableAllocations.length > 0}
                  onCheckedChange={toggleAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-xs text-muted-foreground">
                  {checkedAllocations.size > 0
                    ? `${checkedAllocations.size} of ${pullableAllocations.length} selected`
                    : "Select all"}
                </span>
              </div>
              {checkedAllocations.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => pullBatchMutation.mutate(Array.from(checkedAllocations))}
                  disabled={pullBatchMutation.isPending}
                  data-testid="button-submit-pulled"
                >
                  <PackageCheck className="h-4 w-4 mr-1" />
                  {pullBatchMutation.isPending ? "Pulling..." : `Submit Pulled (${checkedAllocations.size})`}
                </Button>
              )}
            </div>
          )}

          {allocationsData?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No materials allocated yet
            </div>
          ) : (
            <div className="space-y-2">
              {allocationsData?.map((alloc) => {
                const isPlanning = alloc.status === "Planning" && !!alloc.sourceLocation;
                const insufficientStock = isPlanning && hasInsufficientStock(alloc);
                const isPullable = isPlanning && !insufficientStock;
                const isChecked = checkedAllocations.has(alloc.id);
                const available = alloc.sourceLocation ? (stockMap[`${alloc.sku}::${alloc.sourceLocation}`] ?? 0) : 0;
                return (
                  <Card
                    key={alloc.id}
                    data-testid={`card-allocation-${alloc.id}`}
                    className={insufficientStock ? "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30" : ""}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {isPullable ? (
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleAllocation(alloc.id)}
                            data-testid={`checkbox-allocation-${alloc.id}`}
                          />
                        ) : insufficientStock ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                        ) : (
                          <div className="w-4" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className={`text-sm font-mono font-medium ${insufficientStock ? "text-red-700 dark:text-red-400" : ""}`}>{alloc.sku}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-xs ${insufficientStock ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>Qty: {alloc.quantity}</span>
                            <span className={`text-xs ${insufficientStock ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>From: {alloc.sourceLocation || "Not assigned"}</span>
                            {insufficientStock && (
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                (Only {available} available)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={alloc.status} type="allocation" />
                          {alloc.status === "Pulled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-xs"
                              onClick={() => unpullBatchMutation.mutate([alloc.id])}
                              disabled={unpullBatchMutation.isPending}
                              data-testid={`button-unpull-${alloc.id}`}
                            >
                              <Undo2 className="h-3 w-3 mr-0.5" />
                              Unpull
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>SKU</Label>
              <Select value={allocSku} onValueChange={setAllocSku}>
                <SelectTrigger data-testid="select-alloc-sku">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.sku} value={item.sku}>
                      {item.sku} - {item.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="1" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} data-testid="input-alloc-qty" />
            </div>
            <div>
              <Label>Source Location</Label>
              <Select value={allocLocation} onValueChange={setAllocLocation}>
                <SelectTrigger data-testid="select-alloc-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locationsList?.filter((l) => l.locationId !== "TRANSIT").map((loc) => (
                    <SelectItem key={loc.locationId} value={loc.locationId}>{loc.locationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => allocateMutation.mutate({ sku: allocSku, quantity: parseInt(allocQty), sourceLocation: allocLocation })}
              disabled={!allocSku || !allocQty || !allocLocation || allocateMutation.isPending}
              data-testid="button-save-allocation"
            >
              {allocateMutation.isPending ? "Allocating..." : "Allocate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{project?.projectName}</span> and remove all allocations and pick lists. Any reserved material will be released back to its source location. This action is recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-product">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-product"
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
