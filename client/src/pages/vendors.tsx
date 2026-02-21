import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@shared/schema";

export default function VendorsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const { toast } = useToast();

  const { data: vendorList, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; company: string; email: string; phone: string; active: boolean }) => {
      const res = await apiRequest("POST", "/api/vendors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor added" });
      setAddOpen(false);
      setNewName("");
      setNewCompany("");
      setNewEmail("");
      setNewPhone("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Vendor Contacts" />
      <BottomNav showBack backTo="/more" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Vendors</h2>
            <p className="text-xs text-muted-foreground">Manage vendor contacts for purchase orders</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-vendor">
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : vendorList && vendorList.length > 0 ? (
          <div className="space-y-2">
            {vendorList.map((v) => (
              <Card key={v.id} data-testid={`vendor-${v.id}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    {v.company && <p className="text-xs text-muted-foreground truncate">{v.company}</p>}
                    <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(v.id)}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`delete-vendor-${v.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No vendors added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add vendors to send them purchase orders</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contact Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Smith"
                data-testid="input-vendor-name"
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="e.g. Lumber Co."
                data-testid="input-vendor-company"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="vendor@example.com"
                data-testid="input-vendor-email"
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(555) 123-4567"
                data-testid="input-vendor-phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate({ name: newName, company: newCompany, email: newEmail, phone: newPhone, active: true })}
              disabled={!newName || !newEmail || addMutation.isPending}
              data-testid="button-save-vendor"
            >
              {addMutation.isPending ? "Adding..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
