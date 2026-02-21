import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { ProjectListSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Calendar, User, MapPin, Search, ChevronDown, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [assignedHub, setAssignedHub] = useState("Farm");
  const [projectLead, setProjectLead] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const existingClients = Array.from(
    new Set(projects?.map((p) => p.client).filter(Boolean) || [])
  ).sort();
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const filteredClients = existingClients.filter((c) =>
    c.toLowerCase().includes(client.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Product created", description: `${project.projectName} has been created.` });
      setCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setProjectName("");
    setClient("");
    setAssignedHub("Farm");
    setProjectLead("");
    setNotes("");
  };

  const filtered = projects?.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.projectName.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q) && !p.projectId.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Products" />

      <div className="sticky top-20 z-30 bg-background border-b">
        <div className="p-3 space-y-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-projects"
              />
            </div>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-1.5" />
              New Product
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "Planning", "Active", "On Hold", "Complete"].map((s) => (
              <Badge
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                className="cursor-pointer text-xs capitalize"
                onClick={() => setStatusFilter(s)}
                data-testid={`filter-project-${s}`}
              >
                {s === "all" ? "All" : s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <ProjectListSkeleton />
      ) : (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          {filtered?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No projects found</p>
            </div>
          ) : (
            filtered?.map((project) => (
              <Link key={project.projectId} href={`/projects/${project.projectId}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-project-${project.projectId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{project.projectName}</span>
                          <StatusBadge status={project.status} type="project" />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{project.projectId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {project.client}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.assignedHub}
                      </span>
                      {project.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.startDate).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} data-testid="input-project-name" />
            </div>
            <div className="relative">
              <Label>Client</Label>
              <div className="relative">
                <Input
                  value={client}
                  onChange={(e) => {
                    setClient(e.target.value);
                    setClientDropdownOpen(true);
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                  placeholder="Select or type a client name"
                  data-testid="input-project-client"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {clientDropdownOpen && filteredClients.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto" data-testid="dropdown-client-list">
                  {filteredClients.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover-elevate cursor-pointer text-left"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setClient(c);
                        setClientDropdownOpen(false);
                      }}
                      data-testid={`option-client-${c}`}
                    >
                      {client === c && <Check className="h-3.5 w-3.5 text-foreground" />}
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Assigned Hub</Label>
              <Select value={assignedHub} onValueChange={setAssignedHub}>
                <SelectTrigger data-testid="select-project-hub">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Farm">Farm</SelectItem>
                  <SelectItem value="MKE">MKE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project Lead (optional)</Label>
              <Input value={projectLead} onChange={(e) => setProjectLead(e.target.value)} data-testid="input-project-lead" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-project-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ projectName, client, assignedHub, projectLead: projectLead || undefined, notes: notes || undefined })}
              disabled={!projectName || !client || createMutation.isPending}
              data-testid="button-save-project"
            >
              {createMutation.isPending ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
