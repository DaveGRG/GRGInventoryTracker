import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Minus, ArrowRight, Search, Truck, Package, Trash2, CalendarIcon, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Transfer, InventoryItem, Location as LocationType } from "@shared/schema";

export default function TransfersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuSearchOpen, setSkuSearchOpen] = useState(false);
  const [transferItems, setTransferItems] = useState<{ sku: string; description: string; quantity: number }[]>([]);
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [notes, setNotes] = useState("");
  const [transferDate, setTransferDate] = useState<Date>(new Date());
  const skuInputRef = useRef<HTMLInputElement>(null);
  const skuDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skuDropdownRef.current && !skuDropdownRef.current.contains(e.target as Node) &&
          skuInputRef.current && !skuInputRef.current.contains(e.target as Node)) {
        setSkuSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [shipDialog, setShipDialog] = useState<Transfer | null>(null);
  const [receiveDialog, setReceiveDialog] = useState<Transfer | null>(null);
  const [receivedQty, setReceivedQty] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Transfer | null>(null);
  const { toast } = useToast();

  const { data: transfersList, isLoading } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  const { data: inventoryData } = useQuery<(InventoryItem & { stockLevels: { locationId: string; quantity: number }[] })[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: locationsList } = useQuery<LocationType[]>({
    queryKey: ["/api/locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transfers/batch", data);
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

  const resetForm = () => { setSkuSearch(""); setTransferItems([]); setFromLoc(""); setToLoc(""); setNotes(""); setTransferDate(new Date()); setSkuSearchOpen(false); };

  const filteredItems = inventoryData?.filter((item) => {
    if (!skuSearch) return false;
    const q = skuSearch.toLowerCase();
    return item.sku.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  }).map((item) => {
    const stockAtSource = fromLoc ? (item.stockLevels.find((sl) => sl.locationId === fromLoc)?.quantity || 0) : null;
    return { ...item, availableQty: stockAtSource };
  }).slice(0, 20);

  const addItem = (item: InventoryItem & { availableQty: number | null }) => {
    const existing = transferItems.find((t) => t.sku === item.sku);
    if (existing) {
      setTransferItems(transferItems.map((t) => t.sku === item.sku ? { ...t, quantity: t.quantity + 1 } : t));
    } else {
      setTransferItems([...transferItems, { sku: item.sku, description: item.description, quantity: 1 }]);
    }
    setSkuSearch("");
    setSkuSearchOpen(false);
  };

  const updateItemQty = (sku: string, delta: number) => {
    setTransferItems(transferItems.map((t) => {
      if (t.sku !== sku) return t;
      const newQty = Math.max(1, t.quantity + delta);
      return { ...t, quantity: newQty };
    }));
  };

  const removeItem = (sku: string) => {
    setTransferItems(transferItems.filter((t) => t.sku !== sku));
  };

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
    <div className="min-h-screen bg-background">
      <AppHeader title="Transfers" />
      <BottomNav />

      <div className="sticky top-[7.5rem] z-30 bg-background border-b">
        <div className="p-3 space-y-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search transfers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-transfers" />
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-new-transfer">
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

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From</Label>
                <Select value={fromLoc} onValueChange={(v) => { setFromLoc(v); setTransferItems([]); }}>
                  <SelectTrigger data-testid="select-transfer-from">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {physicalLocations.map((loc) => (
                      <SelectItem key={loc.locationId} value={loc.locationId}>{loc.locationName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To</Label>
                <Select value={toLoc} onValueChange={setToLoc}>
                  <SelectTrigger data-testid="select-transfer-to">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {physicalLocations.filter((l) => l.locationId !== fromLoc).map((loc) => (
                      <SelectItem key={loc.locationId} value={loc.locationId}>{loc.locationName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Add Items</Label>
              {!fromLoc ? (
                <p className="text-xs text-muted-foreground mt-1">Select a "From" location first</p>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={skuInputRef}
                    type="text"
                    placeholder="Search SKU..."
                    value={skuSearch}
                    onChange={(e) => { setSkuSearch(e.target.value); setSkuSearchOpen(e.target.value.length > 0); }}
                    onFocus={() => { if (skuSearch) setSkuSearchOpen(true); }}
                    className="pl-9"
                    data-testid="input-transfer-sku-search"
                  />
                  {skuSearchOpen && filteredItems && filteredItems.length > 0 && (
                    <div ref={skuDropdownRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                      {filteredItems.map((item) => (
                        <button
                          key={item.sku}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                          onClick={() => addItem(item)}
                          data-testid={`sku-option-${item.sku}`}
                        >
                          <span className="font-mono text-xs flex-1">{item.sku}</span>
                          {item.availableQty !== null && (
                            <span className={cn("text-xs font-medium tabular-nums", item.availableQty > 0 ? "text-primary" : "text-destructive")}>
                              {item.availableQty} avail
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {transferItems.length > 0 && (
              <div className="border rounded-md divide-y">
                {transferItems.map((item) => (
                  <div key={item.sku} className="flex items-center gap-2 px-3 py-2" data-testid={`transfer-item-${item.sku}`}>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm">{item.sku}</span>
                    </div>
                    <button
                      onClick={() => updateItemQty(item.sku, -1)}
                      className="flex items-center justify-center h-10 w-10 rounded-md border bg-muted hover:bg-muted/80 active:scale-95 transition-transform touch-manipulation"
                      data-testid={`qty-minus-${item.sku}`}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="w-8 text-center font-bold text-lg tabular-nums" data-testid={`qty-value-${item.sku}`}>{item.quantity}</span>
                    <button
                      onClick={() => updateItemQty(item.sku, 1)}
                      className="flex items-center justify-center h-10 w-10 rounded-md border bg-muted hover:bg-muted/80 active:scale-95 transition-transform touch-manipulation"
                      data-testid={`qty-plus-${item.sku}`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <button onClick={() => removeItem(item.sku)} className="text-muted-foreground hover:text-destructive ml-1" data-testid={`remove-item-${item.sku}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground">
                  {transferItems.length} item{transferItems.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}

            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !transferDate && "text-muted-foreground")} data-testid="button-transfer-date">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transferDate ? format(transferDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={transferDate} onSelect={(d) => d && setTransferDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-transfer-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({
                items: transferItems.map((t) => ({ sku: t.sku, quantity: t.quantity })),
                fromLocation: fromLoc,
                toLocation: toLoc,
                requestDate: format(transferDate, "yyyy-MM-dd"),
                notes: notes || undefined,
              })}
              disabled={transferItems.length === 0 || !fromLoc || !toLoc || createMutation.isPending}
              data-testid="button-save-transfer"
            >
              {createMutation.isPending ? "Creating..." : `Request Transfer (${transferItems.length})`}
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

    </div>
  );
}
