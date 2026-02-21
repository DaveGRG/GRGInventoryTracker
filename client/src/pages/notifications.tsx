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
import { Plus, Trash2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NotificationRecipient } from "@shared/schema";

export default function NotificationsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();

  const { data: recipients, isLoading } = useQuery<NotificationRecipient[]>({
    queryKey: ["/api/notifications/recipients"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; active: boolean }) => {
      const res = await apiRequest("POST", "/api/notifications/recipients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/recipients"] });
      toast({ title: "Recipient added" });
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/notifications/recipients/${id}`, { active });
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
            <p className="text-xs text-muted-foreground">People who get notified when a transfer is created</p>
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
                <CardContent className="p-4 flex items-center gap-3">
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
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No recipients added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add team members to notify them when transfers are created</p>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate({ name: newName, email: newEmail, active: true })}
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
