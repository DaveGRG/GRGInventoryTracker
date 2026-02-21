import { useState, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Calendar, User, MapPin, Search, Upload, ChevronDown, Check, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, InventoryItem } from "@shared/schema";

interface CsvRow {
  catalogId: string;
  productName: string;
  sku: string;
  qty: number;
  valid?: boolean;
}

function parseCsvLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "details">("upload");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [productName, setProductName] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [client, setClient] = useState("");
  const [assignedHub, setAssignedHub] = useState("Farm");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });
  const validSkus = new Set(inventoryItems?.map((i) => i.sku) || []);

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
      toast({ title: "Product created", description: `${project.projectName} has been created with ${csvRows.length} material(s).` });
      setCreateOpen(false);
      resetForm();
      navigate(`/projects/${project.projectId}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setStep("upload");
    setCsvRows([]);
    setCsvErrors([]);
    setProductName("");
    setCatalogId("");
    setClient("");
    setAssignedHub("Farm");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setCsvErrors(["CSV must have a header row and at least one data row."]);
      return;
    }

    const headerLine = lines[0];
    const sep = headerLine.includes("\t") ? "\t" : ",";
    const headers = parseCsvLine(headerLine, sep).map((h) => h.toLowerCase().replace(/['"]/g, ""));

    const catalogIdx = headers.findIndex((h) => h.includes("catalog") && h.includes("id"));
    const nameIdx = headers.findIndex((h) =>
      (h.includes("product") && h.includes("name")) || h === "name" || h === "product"
    );
    const skuIdx = headers.findIndex((h) => h === "sku" || h === "item" || h === "material");
    const qtyIdx = headers.findIndex((h) => h === "qty" || h === "quantity" || h === "amount");

    const missing: string[] = [];
    if (skuIdx === -1) missing.push("SKU");
    if (qtyIdx === -1) missing.push("QTY");

    if (missing.length > 0) {
      setCsvErrors([`Missing required columns: ${missing.join(", ")}. CSV must have SKU and QTY columns.`]);
      return;
    }

    const rows: CsvRow[] = [];
    const errors: string[] = [];
    let foundProductName = "";
    let foundCatalogId = "";

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i], sep);

      if (nameIdx >= 0 && !foundProductName) {
        const val = cols[nameIdx]?.trim();
        if (val) foundProductName = val;
      }
      if (catalogIdx >= 0 && !foundCatalogId) {
        const val = cols[catalogIdx]?.trim();
        if (val) foundCatalogId = val;
      }

      const sku = cols[skuIdx]?.trim();
      const rawQty = cols[qtyIdx]?.trim();
      const qty = parseInt(rawQty, 10);

      if (!sku) continue;
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Row ${i + 1}: Invalid quantity "${rawQty}" for SKU "${sku}"`);
        continue;
      }

      const skuValid = validSkus.has(sku);
      if (!skuValid) {
        errors.push(`Row ${i + 1}: SKU "${sku}" not found in inventory`);
      }

      rows.push({
        catalogId: foundCatalogId,
        productName: foundProductName,
        sku,
        qty,
        valid: skuValid,
      });
    }

    if (rows.length === 0) {
      setCsvErrors(["No valid rows found in CSV."]);
      return;
    }

    setCsvRows(rows);
    setCsvErrors(errors);

    if (foundProductName) setProductName(foundProductName);
    if (foundCatalogId) setCatalogId(foundCatalogId);

    setStep("details");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const validRows = csvRows.filter((r) => r.valid !== false);
  const hasErrors = csvErrors.length > 0 && validRows.length === 0;

  const handleCreate = () => {
    const allocations = validRows.map((r) => ({ sku: r.sku, quantity: r.qty }));
    createMutation.mutate({
      projectName: productName,
      catalogId: catalogId || undefined,
      client,
      assignedHub,
      allocations: allocations.length > 0 ? allocations : undefined,
    });
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
    <div className="min-h-screen bg-background">
      <AppHeader title="Products" />
      <BottomNav />

      <div className="sticky top-[7.5rem] z-30 bg-background border-b">
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
            <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-1.5" />
              New
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
              <p className="text-sm">No products found</p>
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

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{step === "upload" ? "Upload Product CSV" : "Complete Product Setup"}</DialogTitle>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Upload a CSV file</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required columns: Catalog ID, Product name, SKU, QTY
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-csv-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select CSV File
                </Button>
              </div>
              {csvErrors.length > 0 && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                  {csvErrors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "details" && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">CSV Preview</span>
                  <Badge variant="outline" className="text-xs">{validRows.length}/{csvRows.length} valid</Badge>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {csvRows.map((row, i) => (
                    <div key={i} className={`flex justify-between text-xs ${row.valid === false ? "text-destructive line-through opacity-60" : ""}`}>
                      <span className="font-mono">{row.sku}</span>
                      <span className="tabular-nums">{row.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {csvErrors.length > 0 && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                  {csvErrors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}

              <div>
                <Label>Product Name</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  data-testid="input-product-name"
                />
              </div>

              <div>
                <Label>Catalog ID</Label>
                <Input
                  value={catalogId}
                  onChange={(e) => setCatalogId(e.target.value)}
                  placeholder="From CSV"
                  data-testid="input-catalog-id"
                />
              </div>

              <div>
                <Label>Location</Label>
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

              <div className="relative">
                <Label>Job Name</Label>
                <div className="relative">
                  <Input
                    value={client}
                    onChange={(e) => {
                      setClient(e.target.value);
                      setClientDropdownOpen(true);
                    }}
                    onFocus={() => setClientDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                    placeholder="Select or type a job name"
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

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setStep("upload"); setCsvRows([]); setCsvErrors([]); }}>
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!productName || !client || hasErrors || createMutation.isPending}
                  data-testid="button-create-product"
                >
                  {createMutation.isPending ? "Creating..." : "Create Product"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
