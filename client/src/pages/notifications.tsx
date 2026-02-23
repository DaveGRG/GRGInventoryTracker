import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Mail, ArrowLeftRight, ClipboardCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NotificationRecipient } from "@shared/schema";

export default function NotificationsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotifyTransfers, setNewNotifyTransfers] = useState(true);
  const [newNotifyReconciliation, setNewNotifyReconciliation] = useState(true);
  const { toast } = useToast();

  const { data: recipients, isLoading } = useQuery<NotificationRecipient[]>({
    queryKey: ["/api/notifications/recipients"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; active: boolean; notifyTransfers?: boolean; notifyReconciliation?: boolean }) => {
      const res = await apiRequest("POST", "/api/notifications/recipients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/recipients"] });
      toast({ title: "Recipient added" });
      setAddOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; active?: boolean; notifyTransfers?: boolean; notifyReconciliation?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/notifications/recipients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/recipients"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notifications/recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/recipients"] });
      toast({ title: "Recipient removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Notifications" />
      <BottomNav showBack backTo="/more" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Email Recipients</h2>
            <p className="text-xs text-muted-foreground">Manage who gets notified for transfers and reconciliation reports</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-recipient">
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recipients && recipients.length > 0 ? (
          <div className="space-y-2">
            {recipients.map((r) => (
              <Card key={r.id} data-testid={`recipient-${r.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <Switch
                      checked={r.active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: r.id, active: checked })}
                      data-testid={`toggle-recipient-${r.id}`}
                    />
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="text-muted-foreground hover:text-destructive"
                      data-testid={`delete-recipient-${r.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {r.active && (
                    <div className="flex gap-4 pl-[52px]">
                      <label className="flex items-center gap-1.5 cursor-pointer" data-testid={`toggle-transfers-${r.id}`}>
                        <Switch
                          checked={r.notifyTransfers}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: r.id, notifyTransfers: checked })}
                          className="scale-75"
                        />
                        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Transfers</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer" data-testid={`toggle-reconciliation-${r.id}`}>
                        <Switch
                          checked={r.notifyReconciliation}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: r.id, notifyReconciliation: checked })}
                          className="scale-75"
                        />
                        <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Reconciliation</span>
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No recipients added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add team members to notify them about transfers and reconciliation reports</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Email notifications require Gmail credentials to be configured. Ask your account administrator to generate a Gmail App Password and provide it to the system.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) { setNewName(""); setNewEmail(""); setNewNotifyTransfers(true); setNewNotifyReconciliation(true); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Recipient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Smith"
                data-testid="input-recipient-name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="john@grgplayscapes.com"
                data-testid="input-recipient-email"
              />
            </div>
            <div>
              <Label className="mb-2 block">Notification Types</Label>
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer" data-testid="toggle-new-transfers">
                  <Switch checked={newNotifyTransfers} onCheckedChange={setNewNotifyTransfers} />
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Transfers</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer" data-testid="toggle-new-reconciliation">
                  <Switch checked={newNotifyReconciliation} onCheckedChange={setNewNotifyReconciliation} />
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Reconciliation Reports</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate({ name: newName, email: newEmail, active: true, notifyTransfers: newNotifyTransfers, notifyReconciliation: newNotifyReconciliation })}
              disabled={!newName || !newEmail || addMutation.isPending}
              data-testid="button-save-recipient"
            >
              {addMutation.isPending ? "Adding..." : "Add Recipient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
