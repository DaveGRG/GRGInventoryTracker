import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { seedDatabase } from "./seed";
import { z } from "zod";
import { insertInventoryItemSchema, stockLevels, transfers, auditLog, allocations, pickLists } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

const stockAdjustSchema = z.object({
  sku: z.string().min(1),
  locationId: z.string().min(1),
  newQuantity: z.number().int().min(0),
  reason: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const createTransferSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1),
  fromLocation: z.string().min(1),
  toLocation: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const createProjectSchema = z.object({
  projectName: z.string().min(1),
  client: z.string().min(1),
  assignedHub: z.enum(["Farm", "MKE"]),
  projectLead: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createAllocationSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1),
  sourceLocation: z.string().min(1),
});

const confirmPickSchema = z.object({
  quantityPicked: z.number().int().min(0),
});

const bulkAllocationRowSchema = z.object({
  sku: z.string(),
  quantity: z.union([z.string(), z.number()]),
  sourceLocation: z.string(),
});

const bulkAllocationsSchema = z.object({
  allocations: z.array(bulkAllocationRowSchema).min(1),
});

const updateParLevelsSchema = z.object({
  farmParLevel: z.number().int().min(0),
  mkeParLevel: z.number().int().min(0),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  displayName: z.string().min(1),
  role: z.enum(["Admin", "Shop Lead", "Project Admin", "Field Crew"]).optional(),
  assignedHub: z.enum(["All", "Farm", "MKE"]).optional(),
});

function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.errors.map(e => e.message).join(", ") });
    }
    req.body = result.data;
    next();
  };
}

async function upsertStockInTx(tx: any, sku: string, locationId: string, quantity: number, lastCounted?: string, countedBy?: string) {
  const existing = await tx.select().from(stockLevels).where(
    and(eq(stockLevels.sku, sku), eq(stockLevels.locationId, locationId))
  );
  if (existing.length > 0) {
    const updateData: any = { quantity };
    if (lastCounted !== undefined) updateData.lastCounted = lastCounted;
    if (countedBy !== undefined) updateData.countedBy = countedBy;
    await tx.update(stockLevels).set(updateData).where(eq(stockLevels.id, existing[0].id));
  } else {
    await tx.insert(stockLevels).values({ sku, locationId, quantity, lastCounted: lastCounted || null, countedBy: countedBy || null });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  await seedDatabase();

  app.get("/api/locations", isAuthenticated, async (_req, res) => {
    const locs = await storage.getLocations();
    res.json(locs);
  });

  app.get("/api/inventory/items", isAuthenticated, async (_req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });

  app.get("/api/inventory", isAuthenticated, async (_req, res) => {
    const items = await storage.getInventoryItems();
    const allStockLevels = await storage.getStockLevels();
    const locs = await storage.getLocations();
    const locMap = new Map(locs.map((l) => [l.locationId, l]));

    const result = items.map((item) => {
      const itemStocks = allStockLevels
        .filter((sl) => sl.sku === item.sku)
        .map((sl) => ({
          ...sl,
          locationName: locMap.get(sl.locationId)?.locationName || sl.locationId,
          hub: locMap.get(sl.locationId)?.hub || "",
        }));
      return { ...item, stockLevels: itemStocks };
    });

    res.json(result);
  });

  app.patch("/api/inventory/:sku/par-levels", isAuthenticated, validate(updateParLevelsSchema), async (req: any, res) => {
    const { sku } = req.params;
    const { farmParLevel, mkeParLevel } = req.body;

    const item = await storage.getInventoryItem(sku);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const updated = await storage.updateInventoryItem(sku, { farmParLevel, mkeParLevel });
    res.json(updated);
  });

  app.post("/api/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertInventoryItemSchema.parse(req.body);

      const existing = await storage.getInventoryItem(parsed.sku);
      if (existing) {
        return res.status(409).json({ message: `SKU "${parsed.sku}" already exists` });
      }

      const item = await storage.createInventoryItem(parsed);

      const locs = await storage.getLocations();
      for (const loc of locs) {
        if (loc.zoneType === "Virtual") continue;
        await storage.upsertStockLevel({
          sku: item.sku,
          locationId: loc.locationId,
          quantity: 0,
          lastCounted: null,
          countedBy: null,
        });
      }

      await storage.createAuditEntry({
        userEmail: req.user?.claims?.email || "system",
        actionType: "Item Created",
        sku: item.sku,
        locationId: null,
        quantityBefore: null,
        quantityAfter: null,
        reason: "New inventory item created",
        notes: `Description: ${item.description}`,
      });

      res.status(201).json(item);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.post("/api/stock/adjust", isAuthenticated, validate(stockAdjustSchema), async (req: any, res) => {
    const { sku, locationId, newQuantity, reason, notes } = req.body;

    const existing = await storage.getStockLevel(sku, locationId);
    const oldQty = existing?.quantity || 0;

    await storage.upsertStockLevel({
      sku,
      locationId,
      quantity: newQuantity,
      lastCounted: new Date().toISOString().split("T")[0],
      countedBy: req.user?.claims?.email || "system",
    });

    await storage.createAuditEntry({
      userEmail: req.user?.claims?.email || "system",
      actionType: "Stock Adjustment",
      sku,
      locationId,
      quantityBefore: oldQty,
      quantityAfter: newQuantity,
      reason,
      notes: notes || null,
    });

    res.json({ success: true });
  });

  app.get("/api/dashboard", isAuthenticated, async (_req, res) => {
    const items = await storage.getInventoryItems();
    const allStockLevels = await storage.getStockLevels();
    const locs = await storage.getLocations();
    const allTransfers = await storage.getTransfers();
    const allProjects = await storage.getProjects();
    const auditEntries = await storage.getAuditLog();

    const farmLocIds = locs.filter((l) => l.hub === "Farm").map((l) => l.locationId);
    const mkeLocIds = locs.filter((l) => l.hub === "MKE").map((l) => l.locationId);

    const belowParItems: any[] = [];
    for (const item of items) {
      if (item.farmParLevel > 0) {
        const farmTotal = allStockLevels
          .filter((sl) => sl.sku === item.sku && farmLocIds.includes(sl.locationId))
          .reduce((sum, sl) => sum + sl.quantity, 0);
        if (farmTotal < item.farmParLevel) {
          belowParItems.push({
            sku: item.sku,
            description: item.description,
            hub: "Farm",
            currentTotal: farmTotal,
            parLevel: item.farmParLevel,
            deficit: item.farmParLevel - farmTotal,
          });
        }
      }
      if (item.mkeParLevel > 0) {
        const mkeTotal = allStockLevels
          .filter((sl) => sl.sku === item.sku && mkeLocIds.includes(sl.locationId))
          .reduce((sum, sl) => sum + sl.quantity, 0);
        if (mkeTotal < item.mkeParLevel) {
          belowParItems.push({
            sku: item.sku,
            description: item.description,
            hub: "MKE",
            currentTotal: mkeTotal,
            parLevel: item.mkeParLevel,
            deficit: item.mkeParLevel - mkeTotal,
          });
        }
      }
    }

    belowParItems.sort((a, b) => b.deficit - a.deficit);

    const uniqueClients = new Set(allProjects.map((p) => p.client));
    const activeClients = new Set(
      allProjects.filter((p) => p.status === "Active" || p.status === "Planning").map((p) => p.client)
    );

    res.json({
      totalSkus: items.length,
      belowParItems,
      recentActivity: auditEntries.slice(0, 10),
      activeTransfers: allTransfers.filter((t) => t.status === "Requested" || t.status === "In Transit").length,
      activeProjects: allProjects.filter((p) => p.status === "Active" || p.status === "Planning").length,
      totalClients: uniqueClients.size,
      activeClients: activeClients.size,
      pendingPickLists: 0,
    });
  });

  app.get("/api/clients", isAuthenticated, async (_req, res) => {
    const allProjects = await storage.getProjects();
    const allocations = await storage.getAllocations();

    const clientMap = new Map<string, { 
      name: string; 
      products: typeof allProjects;
      activeCount: number;
      completedCount: number;
      totalAllocations: number;
    }>();

    for (const project of allProjects) {
      const clientName = project.client;
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, { name: clientName, products: [], activeCount: 0, completedCount: 0, totalAllocations: 0 });
      }
      const entry = clientMap.get(clientName)!;
      entry.products.push(project);
      if (project.status === "Active" || project.status === "Planning") entry.activeCount++;
      if (project.status === "Complete") entry.completedCount++;
    }

    for (const alloc of allocations) {
      const project = allProjects.find((p) => p.projectId === alloc.projectId);
      if (project) {
        const entry = clientMap.get(project.client);
        if (entry) entry.totalAllocations++;
      }
    }

    const clients = Array.from(clientMap.values()).map((c) => ({
      name: c.name,
      productCount: c.products.length,
      activeCount: c.activeCount,
      completedCount: c.completedCount,
      totalAllocations: c.totalAllocations,
      products: c.products.map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        status: p.status,
        assignedHub: p.assignedHub,
        startDate: p.startDate,
        endDate: p.endDate,
        projectLead: p.projectLead,
      })),
    }));

    clients.sort((a, b) => b.activeCount - a.activeCount || a.name.localeCompare(b.name));

    res.json(clients);
  });

  app.get("/api/reports/par-levels", isAuthenticated, async (_req, res) => {
    const items = await storage.getInventoryItems();
    const allStockLevels = await storage.getStockLevels();
    const locs = await storage.getLocations();

    const farmLocIds = locs.filter((l) => l.hub === "Farm").map((l) => l.locationId);
    const mkeLocIds = locs.filter((l) => l.hub === "MKE").map((l) => l.locationId);

    const alerts: any[] = [];
    for (const item of items) {
      if (item.farmParLevel > 0) {
        const farmTotal = allStockLevels
          .filter((sl) => sl.sku === item.sku && farmLocIds.includes(sl.locationId))
          .reduce((sum, sl) => sum + sl.quantity, 0);
        if (farmTotal < item.farmParLevel) {
          alerts.push({ sku: item.sku, description: item.description, hub: "Farm", currentTotal: farmTotal, parLevel: item.farmParLevel, deficit: item.farmParLevel - farmTotal });
        }
      }
      if (item.mkeParLevel > 0) {
        const mkeTotal = allStockLevels
          .filter((sl) => sl.sku === item.sku && mkeLocIds.includes(sl.locationId))
          .reduce((sum, sl) => sum + sl.quantity, 0);
        if (mkeTotal < item.mkeParLevel) {
          alerts.push({ sku: item.sku, description: item.description, hub: "MKE", currentTotal: mkeTotal, parLevel: item.mkeParLevel, deficit: item.mkeParLevel - mkeTotal });
        }
      }
    }

    alerts.sort((a: any, b: any) => b.deficit - a.deficit);
    res.json(alerts);
  });

  app.get("/api/projects", isAuthenticated, async (_req, res) => {
    const projs = await storage.getProjects();
    res.json(projs);
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    const project = await storage.getProject(req.params.id as string);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post("/api/projects", isAuthenticated, validate(createProjectSchema), async (req: any, res) => {
    const { projectName, client, assignedHub, projectLead, notes } = req.body;

    const projectId = await storage.getNextProjectId();
    const project = await storage.createProject({
      projectId,
      projectName,
      client,
      assignedHub,
      status: "Planning",
      projectLead: projectLead || null,
      notes: notes || null,
      startDate: null,
      endDate: null,
    });

    res.json(project);
  });

  app.get("/api/projects/:id/allocations", isAuthenticated, async (req, res) => {
    const allocs = await storage.getAllocationsByProject(req.params.id as string);
    res.json(allocs);
  });

  app.post("/api/projects/:id/allocations", isAuthenticated, validate(createAllocationSchema), async (req: any, res) => {
    const { sku, quantity, sourceLocation } = req.body;

    const stockLevel = await storage.getStockLevel(sku, sourceLocation);
    const currentQty = stockLevel?.quantity || 0;
    const activeAllocations = await storage.getActiveAllocationsForSku(sku);
    const allocatedAtLocation = activeAllocations
      .filter((a) => a.sourceLocation === sourceLocation)
      .reduce((sum, a) => sum + a.quantity, 0);
    const available = currentQty - allocatedAtLocation;

    if (quantity > available) {
      return res.status(400).json({ message: `Insufficient available stock. Available: ${available}, Requested: ${quantity}` });
    }

    const alloc = await storage.createAllocation({
      projectId: req.params.id,
      sku,
      quantity,
      sourceLocation,
      status: "Reserved",
      allocatedBy: req.user?.claims?.email || "system",
      allocatedDate: new Date().toISOString().split("T")[0],
      notes: null,
    });

    await storage.createAuditEntry({
      userEmail: req.user?.claims?.email || "system",
      actionType: "Allocation",
      sku,
      locationId: sourceLocation,
      quantityBefore: null,
      quantityAfter: null,
      reason: `Reserved ${quantity} for project ${req.params.id}`,
      notes: null,
    });

    res.json(alloc);
  });

  app.post("/api/projects/:id/allocations/bulk", isAuthenticated, validate(bulkAllocationsSchema), async (req: any, res) => {
    const { allocations: rows } = req.body;

    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const results: { row: number; sku: string; status: "success" | "error"; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sku = (row.sku || "").trim();
      const rawQty = String(row.quantity).trim();
      const quantity = Number(rawQty);
      const sourceLocation = (row.sourceLocation || "").trim();

      if (!sku || !sourceLocation || !Number.isInteger(quantity) || quantity < 1) {
        results.push({ row: i + 1, sku, status: "error", message: "Invalid data: SKU, quantity (>0), and source location are required" });
        continue;
      }

      const item = await storage.getInventoryItem(sku);
      if (!item) {
        results.push({ row: i + 1, sku, status: "error", message: `SKU "${sku}" not found in inventory` });
        continue;
      }

      const loc = await storage.getLocation(sourceLocation);
      if (!loc) {
        results.push({ row: i + 1, sku, status: "error", message: `Location "${sourceLocation}" not found` });
        continue;
      }

      const stockLevel = await storage.getStockLevel(sku, sourceLocation);
      const currentQty = stockLevel?.quantity || 0;
      const activeAllocations = await storage.getActiveAllocationsForSku(sku);
      const allocatedAtLocation = activeAllocations
        .filter((a: any) => a.sourceLocation === sourceLocation)
        .reduce((sum: number, a: any) => sum + a.quantity, 0);
      const available = currentQty - allocatedAtLocation;

      if (quantity > available) {
        results.push({ row: i + 1, sku, status: "error", message: `Insufficient stock. Available: ${available}, Requested: ${quantity}` });
        continue;
      }

      await storage.createAllocation({
        projectId: req.params.id,
        sku,
        quantity,
        sourceLocation,
        status: "Reserved",
        allocatedBy: req.user?.claims?.email || "system",
        allocatedDate: new Date().toISOString().split("T")[0],
        notes: "Bulk CSV import",
      });

      await storage.createAuditEntry({
        userEmail: req.user?.claims?.email || "system",
        actionType: "Allocation",
        sku,
        locationId: sourceLocation,
        quantityBefore: null,
        quantityAfter: null,
        reason: `Reserved ${quantity} for project ${req.params.id} (CSV import)`,
        notes: null,
      });

      results.push({ row: i + 1, sku, status: "success", message: `Allocated ${quantity} from ${sourceLocation}` });
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    res.json({ results, successCount, errorCount });
  });

  app.post("/api/projects/:id/generate-pick-list", isAuthenticated, async (req: any, res) => {
    const allocs = await storage.getAllocationsByProject(req.params.id);
    const reserved = allocs.filter((a) => a.status === "Reserved");
    if (reserved.length === 0) {
      return res.status(400).json({ message: "No reserved allocations to generate pick list from" });
    }

    const created: any[] = [];
    for (const alloc of reserved) {
      const pick = await storage.createPickList({
        projectId: req.params.id,
        sku: alloc.sku,
        quantityRequested: alloc.quantity,
        pickFromLocation: alloc.sourceLocation,
        quantityPicked: 0,
        status: "Pending",
        pickedBy: null,
        pickDate: null,
        notes: null,
      });
      created.push(pick);
    }

    res.json(created);
  });

  app.get("/api/projects/:id/pick-lists", isAuthenticated, async (req, res) => {
    const picks = await storage.getPickListsByProject(req.params.id as string);
    res.json(picks);
  });

  app.post("/api/pick-lists/:id/confirm", isAuthenticated, validate(confirmPickSchema), async (req: any, res) => {
    const pickId = parseInt(req.params.id);
    const { quantityPicked } = req.body;

    const pick = await storage.getPickList(pickId);
    if (!pick) return res.status(404).json({ message: "Pick list not found" });

    const stockLevel = await storage.getStockLevel(pick.sku, pick.pickFromLocation);
    const oldQty = stockLevel?.quantity || 0;

    if (quantityPicked > oldQty) {
      return res.status(400).json({ message: `Insufficient stock. Available: ${oldQty}, Requested: ${quantityPicked}` });
    }

    const newQty = oldQty - quantityPicked;
    const userEmail = req.user?.claims?.email || "system";
    const today = new Date().toISOString().split("T")[0];

    await storage.runTransaction(async (tx) => {
      await upsertStockInTx(tx, pick.sku, pick.pickFromLocation, newQty, today, userEmail);

      await tx.update(pickLists).set({
        quantityPicked,
        status: "Completed",
        pickedBy: userEmail,
        pickDate: today,
      }).where(eq(pickLists.id, pickId));

      const allocs = await tx.select().from(allocations).where(eq(allocations.projectId, pick.projectId));
      const matchingAlloc = allocs.find((a) => a.sku === pick.sku && a.sourceLocation === pick.pickFromLocation && a.status === "Reserved");
      if (matchingAlloc) {
        await tx.update(allocations).set({ status: "Pulled" }).where(eq(allocations.id, matchingAlloc.id));
      }

      await tx.insert(auditLog).values({
        userEmail,
        actionType: "Pick",
        sku: pick.sku,
        locationId: pick.pickFromLocation,
        quantityBefore: oldQty,
        quantityAfter: newQty,
        reason: `Picked ${quantityPicked} for project ${pick.projectId}`,
        notes: null,
      });
    });

    res.json({ success: true });
  });

  app.get("/api/transfers", isAuthenticated, async (_req, res) => {
    const t = await storage.getTransfers();
    res.json(t);
  });

  app.post("/api/transfers", isAuthenticated, validate(createTransferSchema), async (req: any, res) => {
    const { sku, quantity, fromLocation, toLocation, notes } = req.body;

    const stockLevel = await storage.getStockLevel(sku, fromLocation);
    if (!stockLevel || stockLevel.quantity < quantity) {
      return res.status(400).json({ message: `Insufficient stock at source. Available: ${stockLevel?.quantity || 0}` });
    }

    const transfer = await storage.createTransfer({
      sku,
      quantity,
      fromLocation,
      toLocation,
      status: "Requested",
      requestedBy: req.user?.claims?.email || "system",
      requestDate: new Date().toISOString().split("T")[0],
      shippedDate: null,
      receivedBy: null,
      receivedDate: null,
      notes: notes || null,
    });

    await storage.createAuditEntry({
      userEmail: req.user?.claims?.email || "system",
      actionType: "Transfer",
      sku,
      locationId: fromLocation,
      quantityBefore: null,
      quantityAfter: null,
      reason: `Transfer requested: ${quantity} from ${fromLocation} to ${toLocation}`,
      notes: null,
    });

    res.json(transfer);
  });

  app.post("/api/transfers/:id/ship", isAuthenticated, async (req: any, res) => {
    const transferId = parseInt(req.params.id);
    const transfer = await storage.getTransfer(transferId);
    if (!transfer) return res.status(404).json({ message: "Transfer not found" });
    if (transfer.status !== "Requested") return res.status(400).json({ message: "Transfer is not in Requested status" });

    const sourceStock = await storage.getStockLevel(transfer.sku, transfer.fromLocation);
    const oldSourceQty = sourceStock?.quantity || 0;

    if (oldSourceQty < transfer.quantity) {
      return res.status(400).json({ message: `Insufficient stock at source. Available: ${oldSourceQty}, Requested: ${transfer.quantity}` });
    }

    const newSourceQty = oldSourceQty - transfer.quantity;

    await storage.runTransaction(async (tx) => {
      await upsertStockInTx(tx, transfer.sku, transfer.fromLocation, newSourceQty);
      const transitExisting = await tx.select().from(stockLevels).where(
        and(eq(stockLevels.sku, transfer.sku), eq(stockLevels.locationId, "TRANSIT"))
      );
      const newTransitQty = (transitExisting[0]?.quantity || 0) + transfer.quantity;
      await upsertStockInTx(tx, transfer.sku, "TRANSIT", newTransitQty);

      await tx.update(transfers).set({ status: "In Transit", shippedDate: new Date().toISOString().split("T")[0] }).where(eq(transfers.id, transferId));

      await tx.insert(auditLog).values({
        userEmail: req.user?.claims?.email || "system",
        actionType: "Transfer",
        sku: transfer.sku,
        locationId: transfer.fromLocation,
        quantityBefore: oldSourceQty,
        quantityAfter: newSourceQty,
        reason: `Shipped: ${transfer.quantity} from ${transfer.fromLocation} to Transit`,
        notes: null,
      });
    });

    res.json({ success: true });
  });

  app.post("/api/transfers/:id/receive", isAuthenticated, async (req: any, res) => {
    const transferId = parseInt(req.params.id);
    const { quantityReceived } = req.body;
    const transfer = await storage.getTransfer(transferId);
    if (!transfer) return res.status(404).json({ message: "Transfer not found" });
    if (transfer.status !== "In Transit") return res.status(400).json({ message: "Transfer is not In Transit" });

    const qty = quantityReceived ?? transfer.quantity;
    const transitStock = await storage.getStockLevel(transfer.sku, "TRANSIT");
    const oldTransitQty = transitStock?.quantity || 0;

    if (qty > oldTransitQty) {
      return res.status(400).json({ message: `Insufficient stock in transit. Available: ${oldTransitQty}, Attempting to receive: ${qty}` });
    }

    const destStock = await storage.getStockLevel(transfer.sku, transfer.toLocation);
    const oldDestQty = destStock?.quantity || 0;

    await storage.runTransaction(async (tx) => {
      const transitExisting = await tx.select().from(stockLevels).where(
        and(eq(stockLevels.sku, transfer.sku), eq(stockLevels.locationId, "TRANSIT"))
      );
      const currentTransit = transitExisting[0]?.quantity || 0;
      await upsertStockInTx(tx, transfer.sku, "TRANSIT", Math.max(0, currentTransit - qty));

      const destExisting = await tx.select().from(stockLevels).where(
        and(eq(stockLevels.sku, transfer.sku), eq(stockLevels.locationId, transfer.toLocation))
      );
      const currentDest = destExisting[0]?.quantity || 0;
      await upsertStockInTx(tx, transfer.sku, transfer.toLocation, currentDest + qty);

      await tx.update(transfers).set({
        status: "Received",
        receivedBy: req.user?.claims?.email || "system",
        receivedDate: new Date().toISOString().split("T")[0],
      }).where(eq(transfers.id, transferId));

      await tx.insert(auditLog).values({
        userEmail: req.user?.claims?.email || "system",
        actionType: "Transfer",
        sku: transfer.sku,
        locationId: transfer.toLocation,
        quantityBefore: oldDestQty,
        quantityAfter: oldDestQty + qty,
        reason: `Received: ${qty} at ${transfer.toLocation} from Transit`,
        notes: null,
      });
    });

    res.json({ success: true });
  });

  app.post("/api/transfers/:id/cancel", isAuthenticated, async (req: any, res) => {
    const transferId = parseInt(req.params.id);
    const transfer = await storage.getTransfer(transferId);
    if (!transfer) return res.status(404).json({ message: "Transfer not found" });
    if (transfer.status === "Received" || transfer.status === "Cancelled") {
      return res.status(400).json({ message: "Cannot cancel this transfer" });
    }

    const wasInTransit = transfer.status === "In Transit";

    await storage.runTransaction(async (tx) => {
      if (wasInTransit) {
        const transitExisting = await tx.select().from(stockLevels).where(
          and(eq(stockLevels.sku, transfer.sku), eq(stockLevels.locationId, "TRANSIT"))
        );
        const currentTransit = transitExisting[0]?.quantity || 0;
        await upsertStockInTx(tx, transfer.sku, "TRANSIT", Math.max(0, currentTransit - transfer.quantity));

        const sourceExisting = await tx.select().from(stockLevels).where(
          and(eq(stockLevels.sku, transfer.sku), eq(stockLevels.locationId, transfer.fromLocation))
        );
        const currentSource = sourceExisting[0]?.quantity || 0;
        await upsertStockInTx(tx, transfer.sku, transfer.fromLocation, currentSource + transfer.quantity);
      }

      await tx.update(transfers).set({ status: "Cancelled" }).where(eq(transfers.id, transferId));

      await tx.insert(auditLog).values({
        userEmail: req.user?.claims?.email || "system",
        actionType: "Transfer",
        sku: transfer.sku,
        locationId: transfer.fromLocation,
        quantityBefore: null,
        quantityAfter: null,
        reason: `Transfer cancelled: ${transfer.sku} from ${transfer.fromLocation} to ${transfer.toLocation}${wasInTransit ? " (stock returned from Transit)" : ""}`,
        notes: null,
      });
    });

    res.json({ success: true });
  });

  app.get("/api/audit-log", isAuthenticated, async (_req, res) => {
    const entries = await storage.getAuditLog();
    res.json(entries);
  });

  app.get("/api/app-users", isAuthenticated, async (_req, res) => {
    const users = await storage.getAppUsers();
    const safe = users.map(({ passwordHash, ...rest }) => rest);
    res.json(safe);
  });

  app.post("/api/app-users", isAuthenticated, validate(createUserSchema), async (req: any, res) => {
    const { email, password, displayName, role, assignedHub } = req.body;

    const existing = await storage.getAppUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createAppUser({
      email,
      passwordHash: hashedPassword,
      displayName,
      role: role || "Field Crew",
      assignedHub: assignedHub || "All",
      active: true,
    });

    const { passwordHash, ...safe } = user;
    res.json(safe);
  });

  return httpServer;
}
