import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShoppingCart, Send, Plus, Minus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ParLevelAlert } from "@/lib/types";
import type { Vendor } from "@shared/schema";

interface PoItem {
  sku: string;
  quantity: number;
  hub: string;
  deficit: number;
}

export default function ParReportPage() {
  const [selectedItems, setSelectedItems] = useState<Map<string, PoItem>>(new Map());
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [poItems, setPoItems] = useState<PoItem[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [poNotes, setPoNotes] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery<ParLevelAlert[]>({
    queryKey: ["/api/reports/par-levels"],
  });

  const { data: vendorList } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const parseDimensions = (sku: string): [number, number, number] => {
    const match = sku.match(/(\d+)x(\d+)x(\d+)/i);
    if (match) return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    return [9999, 9999, 9999];
  };
  const sortAlerts = (list: ParLevelAlert[]) =>
    [...list].sort((a, b) => {
      const aBS = a.sku.includes(" BS ") ? 1 : 0;
      const bBS = b.sku.includes(" BS ") ? 1 : 0;
      if (aBS !== bBS) return aBS - bBS;
      const [aT, aW, aL] = parseDimensions(a.sku);
      const [bT, bW, bL] = parseDimensions(b.sku);
      if (aT !== bT) return aT - bT;
      if (aW !== bW) return aW - bW;
      if (aL !== bL) return aL - bL;
      return a.sku.localeCompare(b.sku);
    });
  const farmAlerts = sortAlerts(alerts?.filter((a) => a.hub === "Farm") || []);
  const mkeAlerts = sortAlerts(alerts?.filter((a) => a.hub === "MKE") || []);

  const toggleItem = (item: ParLevelAlert) => {
    const key = `${item.sku}-${item.hub}`;
    const next = new Map(selectedItems);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.set(key, { sku: item.sku, quantity: 0, hub: item.hub, deficit: item.deficit });
    }
    setSelectedItems(next);
  };

  const openPoDialog = async () => {
    const items = Array.from(selectedItems.values());
    setPoItems(items);
    try {
      const res = await fetch("/api/purchase-orders/next-number", { credentials: "include" });
      const data = await res.json();
      setPoNumber(data.poNumber);
    } catch {
      setPoNumber("QR#0001");
    }
    setPoDialogOpen(true);
  };

  const updatePoItemQty = (index: number, delta: number) => {
    setPoItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(0, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  };

  const setPoItemQty = (index: number, value: number) => {
    setPoItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, quantity: Math.max(0, value) };
    }));
  };

  const removePoItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const sendPoMutation = useMutation({
    mutationFn: async (data: { vendorId: number; orderDate: string; notes: string | null; items: { sku: string; quantity: number; hub: string }[] }) => {
      const res = await apiRequest("POST", "/api/purchase-orders", data);
      return res.json();
    },
    onSuccess: (data) => {
      const emailNote = data.emailSent ? " and emailed to the vendor" : " (email not sent - Gmail not configured)";
      toast({ title: `${data.poNumber} sent`, description: `Purchase order created${emailNote}` });
      setPoDialogOpen(false);
      setSelectedItems(new Map());
      setPoItems([]);
      setSelectedVendorId("");
      setPoNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSendPo = () => {
    if (!selectedVendorId || poItems.length === 0) return;
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    sendPoMutation.mutate({
      vendorId: parseInt(selectedVendorId),
      orderDate: dateStr,
      notes: poNotes || null,
      items: poItems.map((item) => ({ sku: item.sku, quantity: item.quantity, hub: item.hub })),
    });
  };

  const renderAlertItem = (item: ParLevelAlert) => {
    const key = `${item.sku}-${item.hub}`;
    const isSelected = selectedItems.has(key);
    return (
      <div
        key={key}
        className={`flex items-center justify-between py-2 border-b last:border-0 ${isSelected ? "bg-primary/5" : ""}`}
        data-testid={`par-alert-${item.hub.toLowerCase()}-${item.sku}`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-mono font-medium">{item.sku}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-2 flex items-center gap-2">
          <div>
            <p className="text-sm tabular-nums">
              <span className="text-red-600 dark:text-red-400 font-semibold">{item.currentTotal}</span>
              <span className="text-muted-foreground"> / {item.parLevel}</span>
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Need {item.deficit}</p>
          </div>
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => toggleItem(item)}
            data-testid={`button-send-to-po-${item.sku}-${item.hub}`}
          >
            {isSelected ? (
              <>
                <ShoppingCart className="h-3 w-3 mr-1" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-3 w-3 mr-1" />
                Quote Request
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <AppHeader title="Par Report" />
      <BottomNav showBack backTo="/" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <>
            {alerts?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">All items are at or above par levels.</p>
              </div>
            ) : (
              <>
                {farmAlerts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Farm - Below Par ({farmAlerts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {farmAlerts.map(renderAlertItem)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mkeAlerts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        MKE - Below Par ({mkeAlerts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {mkeAlerts.map(renderAlertItem)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>

      {selectedItems.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 p-4 bg-background border-t shadow-lg">
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full"
              size="lg"
              onClick={openPoDialog}
              data-testid="button-generate-po"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Generate Quote Request ({selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""})
            </Button>
          </div>
        </div>
      )}

      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Quote Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted/50 rounded-md p-3">
              <div>
                <p className="text-xs text-muted-foreground">Quote Request</p>
                <p className="text-base font-mono font-bold">{poNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            <div>
              <Label>Vendor</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger data-testid="select-vendor">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorList?.filter(v => v.active).map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.company ? `${v.company} (${v.name})` : v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!vendorList || vendorList.length === 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  No vendors yet. Add vendors from the More page.
                </p>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Items</Label>
              <div className="space-y-2">
                {poItems.map((item, index) => (
                  <div
                    key={`${item.sku}-${item.hub}`}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-md"
                    data-testid={`po-item-${item.sku}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium">{item.sku}</p>
                      <p className="text-xs text-muted-foreground">{item.hub}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePoItemQty(index, -1)}
                        disabled={item.quantity <= 0}
                        data-testid={`button-decrease-${item.sku}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="w-14 h-8 text-center text-sm font-mono tabular-nums font-semibold px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={item.quantity}
                        onChange={(e) => setPoItemQty(index, parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        data-testid={`qty-${item.sku}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePoItemQty(index, 1)}
                        data-testid={`button-increase-${item.sku}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePoItem(index)}
                      data-testid={`button-remove-po-item-${item.sku}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="Any notes for the vendor..."
                rows={2}
                data-testid="input-po-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSendPo}
              disabled={!selectedVendorId || poItems.length === 0 || sendPoMutation.isPending}
              data-testid="button-send-po"
            >
              {sendPoMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Send Quote Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
