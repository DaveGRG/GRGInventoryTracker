import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRight, Search, Truck, Package, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Transfer, InventoryItem, Location as LocationType } from "@shared/schema";

export default function TransfersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [notes, setNotes] = useState("");
  const [shipDialog, setShipDialog] = useState<Transfer | null>(null);
  const [receiveDialog, setReceiveDialog] = useState<Transfer | null>(null);
  const [receivedQty, setReceivedQty] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Transfer | null>(null);
  const { toast } = useToast();

  const { data: transfersList, isLoading } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  const { data: items } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  const { data: locationsList } = useQuery<LocationType[]>({
    queryKey: ["/api/locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transfers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Transfer requested" });
      setCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const shipMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/transfers/${id}/ship`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Transfer shipped", description: "Stock moved to Transit." });
      setShipDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({ id, quantityReceived }: { id: number; quantityReceived: number }) => {
      const res = await apiRequest("POST", `/api/transfers/${id}/receive`, { quantityReceived });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Transfer received", description: "Stock delivered." });
      setReceiveDialog(null);
      setReceivedQty("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/transfers/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Transfer cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/transfers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Transfer deleted", description: "Transfer removed and stock returned if applicable." });
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => { setSku(""); setQty(""); setFromLoc(""); setToLoc(""); setNotes(""); };

  const filtered = transfersList?.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.sku.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const physicalLocations = locationsList?.filter((l) => l.locationId !== "TRANSIT") || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Transfers" />

      <div className="sticky top-16 z-30 bg-background border-b">
        <div className="p-3 space-y-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search transfers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-transfers" />
            </div>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-new-transfer">
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "Requested", "In Transit", "Received", "Cancelled"].map((s) => (
              <Badge
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setStatusFilter(s)}
                data-testid={`filter-transfer-${s}`}
              >
                {s === "all" ? "All" : s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          {filtered?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No transfers found</div>
          ) : (
            filtered?.map((transfer) => (
              <Card key={transfer.id} data-testid={`card-transfer-${transfer.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-semibold">{transfer.sku}</span>
                        <StatusBadge status={transfer.status} type="transfer" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <span>{transfer.fromLocation}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{transfer.toLocation}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold tabular-nums">{transfer.quantity}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {transfer.requestDate ? new Date(transfer.requestDate).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }) : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    {transfer.status === "Requested" && (
                      <>
                        <Button size="sm" onClick={() => setShipDialog(transfer)} data-testid={`button-ship-${transfer.id}`}>
                          <Truck className="h-3.5 w-3.5 mr-1" /> Ship
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(transfer.id)} data-testid={`button-cancel-transfer-${transfer.id}`}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {transfer.status === "In Transit" && (
                      <Button size="sm" onClick={() => { setReceiveDialog(transfer); setReceivedQty(String(transfer.quantity)); }} data-testid={`button-receive-${transfer.id}`}>
                        <Package className="h-3.5 w-3.5 mr-1" /> Receive
                      </Button>
                    )}
                    <div className="ml-auto">
                      <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(transfer)} data-testid={`button-delete-transfer-${transfer.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>SKU</Label>
              <Select value={sku} onValueChange={setSku}>
                <SelectTrigger data-testid="select-transfer-sku">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.sku} value={item.sku}>{item.sku} - {item.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} data-testid="input-transfer-qty" />
            </div>
            <div>
              <Label>From Location</Label>
              <Select value={fromLoc} onValueChange={setFromLoc}>
                <SelectTrigger data-testid="select-transfer-from">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {physicalLocations.map((loc) => (
                    <SelectItem key={loc.locationId} value={loc.locationId}>{loc.locationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Location</Label>
              <Select value={toLoc} onValueChange={setToLoc}>
                <SelectTrigger data-testid="select-transfer-to">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {physicalLocations.filter((l) => l.locationId !== fromLoc).map((loc) => (
                    <SelectItem key={loc.locationId} value={loc.locationId}>{loc.locationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-transfer-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ sku, quantity: parseInt(qty), fromLocation: fromLoc, toLocation: toLoc, notes: notes || undefined })}
              disabled={!sku || !qty || !fromLoc || !toLoc || createMutation.isPending}
              data-testid="button-save-transfer"
            >
              {createMutation.isPending ? "Creating..." : "Request Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!shipDialog} onOpenChange={(open) => { if (!open) setShipDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Shipment</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Ship <strong>{shipDialog?.quantity}</strong> of <strong className="font-mono">{shipDialog?.sku}</strong> from <strong>{shipDialog?.fromLocation}</strong>?</p>
          <p className="text-xs text-muted-foreground">Stock will move from the source to Transit.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialog(null)}>Cancel</Button>
            <Button onClick={() => shipDialog && shipMutation.mutate(shipDialog.id)} disabled={shipMutation.isPending} data-testid="button-confirm-ship">
              {shipMutation.isPending ? "Shipping..." : "Confirm Ship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiveDialog} onOpenChange={(open) => { if (!open) setReceiveDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receive Transfer</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Receiving <strong className="font-mono">{receiveDialog?.sku}</strong> at <strong>{receiveDialog?.toLocation}</strong></p>
          <div>
            <Label>Quantity Received</Label>
            <Input type="number" min="0" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} data-testid="input-received-qty" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialog(null)}>Cancel</Button>
            <Button onClick={() => receiveDialog && receiveMutation.mutate({ id: receiveDialog.id, quantityReceived: parseInt(receivedQty) })} disabled={receiveMutation.isPending} data-testid="button-confirm-receive">
              {receiveMutation.isPending ? "Receiving..." : "Confirm Receive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transfer of <span className="font-mono font-semibold">{deleteConfirm?.sku}</span> ({deleteConfirm?.quantity} pcs).
              {deleteConfirm?.status === "In Transit" && " Stock currently in transit will be returned to the source location."}
              {" "}This action is recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-transfer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-transfer"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
