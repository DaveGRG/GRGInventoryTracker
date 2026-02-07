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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, User, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Allocation, PickList, InventoryItem, Location as LocationType } from "@shared/schema";

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocSku, setAllocSku] = useState("");
  const [allocQty, setAllocQty] = useState("");
  const [allocLocation, setAllocLocation] = useState("");
  const [confirmPickOpen, setConfirmPickOpen] = useState(false);
  const [selectedPick, setSelectedPick] = useState<PickList | null>(null);
  const [pickedQty, setPickedQty] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`, projectId],
    enabled: !!projectId,
  });

  const { data: allocationsData } = useQuery<Allocation[]>({
    queryKey: [`/api/projects/${projectId}/allocations`, projectId],
    enabled: !!projectId,
  });

  const { data: pickListsData } = useQuery<PickList[]>({
    queryKey: [`/api/projects/${projectId}/pick-lists`, projectId],
    enabled: !!projectId,
  });

  const { data: items } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  const { data: locationsList } = useQuery<LocationType[]>({
    queryKey: ["/api/locations"],
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

  const generatePickListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/generate-pick-list`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/pick-lists`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/allocations`] });
      toast({ title: "Pick list generated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const confirmPickMutation = useMutation({
    mutationFn: async (data: { pickListId: number; quantityPicked: number }) => {
      const res = await apiRequest("POST", `/api/pick-lists/${data.pickListId}/confirm`, { quantityPicked: data.quantityPicked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/pick-lists`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/allocations`] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Pick confirmed", description: "Stock has been updated." });
      setConfirmPickOpen(false);
      setSelectedPick(null);
      setPickedQty("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reservedAllocations = allocationsData?.filter((a) => a.status === "Reserved") || [];

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Project" />
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Project Not Found" />
        <div className="p-4 text-center py-12">
          <p className="text-muted-foreground">Project not found.</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title={project.projectName} />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-2" data-testid="button-back-projects">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>

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
            <p className="text-xs font-mono text-muted-foreground">{project.projectId}</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="materials">
          <TabsList className="w-full">
            <TabsTrigger value="materials" className="flex-1" data-testid="tab-materials">
              Materials ({allocationsData?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="picks" className="flex-1" data-testid="tab-picks">
              Pick Lists ({pickListsData?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials" className="space-y-3 mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setAllocateOpen(true)} data-testid="button-add-material">
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
              {reservedAllocations.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generatePickListMutation.mutate()}
                  disabled={generatePickListMutation.isPending}
                  data-testid="button-generate-pick-list"
                >
                  {generatePickListMutation.isPending ? "Generating..." : "Generate Pick List"}
                </Button>
              )}
            </div>

            {allocationsData?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No materials allocated yet
              </div>
            ) : (
              <div className="space-y-2">
                {allocationsData?.map((alloc) => (
                  <Card key={alloc.id} data-testid={`card-allocation-${alloc.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-mono font-medium">{alloc.sku}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">Qty: {alloc.quantity}</span>
                            <span className="text-xs text-muted-foreground">From: {alloc.sourceLocation}</span>
                          </div>
                        </div>
                        <StatusBadge status={alloc.status} type="allocation" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="picks" className="space-y-3 mt-3">
            {pickListsData?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No pick lists yet. Add materials and generate a pick list.
              </div>
            ) : (
              <div className="space-y-2">
                {pickListsData?.map((pick) => (
                  <Card key={pick.id} data-testid={`card-pick-${pick.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-mono font-medium">{pick.sku}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">Need: {pick.quantityRequested}</span>
                            <span className="text-xs text-muted-foreground">Picked: {pick.quantityPicked}</span>
                            <span className="text-xs text-muted-foreground">From: {pick.pickFromLocation}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={pick.status} type="pickList" />
                          {(pick.status === "Pending" || pick.status === "In Progress") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedPick(pick); setPickedQty(String(pick.quantityRequested)); setConfirmPickOpen(true); }}
                              data-testid={`button-confirm-pick-${pick.id}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
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
                  {locationsList?.filter((l) => l.zoneType !== "Virtual").map((loc) => (
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

      <Dialog open={confirmPickOpen} onOpenChange={setConfirmPickOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Pick</DialogTitle>
            {selectedPick && <p className="text-sm text-muted-foreground font-mono">{selectedPick.sku}</p>}
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Requested: <strong>{selectedPick?.quantityRequested}</strong> from <strong>{selectedPick?.pickFromLocation}</strong></p>
            <div>
              <Label>Quantity Actually Picked</Label>
              <Input type="number" min="0" max={selectedPick?.quantityRequested} value={pickedQty} onChange={(e) => setPickedQty(e.target.value)} data-testid="input-picked-qty" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPickOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedPick && confirmPickMutation.mutate({ pickListId: selectedPick.id, quantityPicked: parseInt(pickedQty) })}
              disabled={!pickedQty || confirmPickMutation.isPending}
              data-testid="button-confirm-pick-save"
            >
              {confirmPickMutation.isPending ? "Confirming..." : "Confirm Pick"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
