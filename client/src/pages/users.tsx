import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, User, Shield, MapPin } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AppUser } from "@shared/schema";

export default function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("Field Crew");
  const [assignedHub, setAssignedHub] = useState("All");
  const { toast } = useToast();

  const { data: usersList, isLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/app-users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/app-users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-users"] });
      toast({ title: "User created" });
      setCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("Field Crew");
    setAssignedHub("All");
  };

  const roleColors: Record<string, string> = {
    Admin: "bg-primary text-primary-foreground",
    "Shop Lead": "bg-blue-600 text-white",
    "Project Admin": "bg-amber-500 text-white",
    "Field Crew": "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Users" showBack />
      <BottomNav />

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-new-user">
            <Plus className="h-4 w-4 mr-1" /> Add User
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {usersList?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No users found</div>
            ) : (
              usersList?.map((u) => (
                <Card key={u.id} data-testid={`card-user-${u.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{u.displayName}</span>
                          <Badge variant="default" className={`no-default-hover-elevate no-default-active-elevate text-[10px] border-transparent ${roleColors[u.role] || ""}`}>
                            {u.role}
                          </Badge>
                          {!u.active && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>{u.email}</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> {u.assignedHub}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-user-email" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-user-password" />
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="input-user-display-name" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Shop Lead">Shop Lead</SelectItem>
                  <SelectItem value="Project Admin">Project Admin</SelectItem>
                  <SelectItem value="Field Crew">Field Crew</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Hub</Label>
              <Select value={assignedHub} onValueChange={setAssignedHub}>
                <SelectTrigger data-testid="select-user-hub">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Farm">Farm</SelectItem>
                  <SelectItem value="MKE">MKE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ email, password, displayName, role, assignedHub })}
              disabled={!email || !password || !displayName || createMutation.isPending}
              data-testid="button-save-user"
            >
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
