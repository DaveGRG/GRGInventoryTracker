import {
  inventoryItems, locations, stockLevels, projects, allocations,
  transfers, pickLists, auditLog, appUsers,
  type InventoryItem, type InsertInventoryItem,
  type Location, type InsertLocation,
  type StockLevel, type InsertStockLevel,
  type Project, type InsertProject,
  type Allocation, type InsertAllocation,
  type Transfer, type InsertTransfer,
  type PickList, type InsertPickList,
  type AuditLogEntry, type InsertAuditLogEntry,
  type AppUser, type InsertAppUser,
} from "@shared/schema";
import { db, pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { eq, and, sql, desc, inArray, like, or } from "drizzle-orm";

export interface IStorage {
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(sku: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(sku: string, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;

  deleteInventoryItem(sku: string): Promise<void>;
  deleteStockLevelsByItem(sku: string): Promise<void>;

  getLocations(): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(loc: InsertLocation): Promise<Location>;

  getStockLevels(): Promise<StockLevel[]>;
  getStockLevel(sku: string, locationId: string): Promise<StockLevel | undefined>;
  upsertStockLevel(data: InsertStockLevel): Promise<StockLevel>;
  getStockLevelsByItem(sku: string): Promise<StockLevel[]>;

  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(proj: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  getNextProjectId(): Promise<string>;

  getAllocations(): Promise<Allocation[]>;
  getAllocationsByProject(projectId: string): Promise<Allocation[]>;
  createAllocation(alloc: InsertAllocation): Promise<Allocation>;
  updateAllocation(id: number, data: Partial<InsertAllocation>): Promise<Allocation | undefined>;
  getActiveAllocationsForSku(sku: string): Promise<Allocation[]>;

  deleteProject(id: string): Promise<void>;
  deleteAllocationsByProject(projectId: string): Promise<void>;
  deletePickListsByProject(projectId: string): Promise<void>;

  getTransfers(): Promise<Transfer[]>;
  getTransfer(id: number): Promise<Transfer | undefined>;
  createTransfer(t: InsertTransfer): Promise<Transfer>;
  updateTransfer(id: number, data: Partial<InsertTransfer>): Promise<Transfer | undefined>;

  deleteTransfer(id: number): Promise<void>;

  getPickLists(): Promise<PickList[]>;
  getPickListsByProject(projectId: string): Promise<PickList[]>;
  getPickList(id: number): Promise<PickList | undefined>;
  createPickList(pl: InsertPickList): Promise<PickList>;
  updatePickList(id: number, data: Partial<InsertPickList>): Promise<PickList | undefined>;

  getAuditLog(): Promise<AuditLogEntry[]>;
  createAuditEntry(entry: InsertAuditLogEntry): Promise<AuditLogEntry>;

  getAppUsers(): Promise<AppUser[]>;
  getAppUser(id: number): Promise<AppUser | undefined>;
  getAppUserByEmail(email: string): Promise<AppUser | undefined>;
  createAppUser(user: InsertAppUser): Promise<AppUser>;
  updateAppUser(id: number, data: Partial<InsertAppUser>): Promise<AppUser | undefined>;

  runTransaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T>;
}

export class DatabaseStorage implements IStorage {
  async getInventoryItems(): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).orderBy(inventoryItems.sku);
  }

  async getInventoryItem(sku: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.sku, sku));
    return item || undefined;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [created] = await db.insert(inventoryItems).values(item).returning();
    return created;
  }

  async updateInventoryItem(sku: string, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db.update(inventoryItems).set({ ...data, updatedAt: new Date() }).where(eq(inventoryItems.sku, sku)).returning();
    return updated || undefined;
  }

  async deleteInventoryItem(sku: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.sku, sku));
  }

  async deleteStockLevelsByItem(sku: string): Promise<void> {
    await db.delete(stockLevels).where(eq(stockLevels.sku, sku));
  }

  async getLocations(): Promise<Location[]> {
    return db.select().from(locations);
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const [loc] = await db.select().from(locations).where(eq(locations.locationId, id));
    return loc || undefined;
  }

  async createLocation(loc: InsertLocation): Promise<Location> {
    const [created] = await db.insert(locations).values(loc).returning();
    return created;
  }

  async getStockLevels(): Promise<StockLevel[]> {
    return db.select().from(stockLevels);
  }

  async getStockLevel(sku: string, locationId: string): Promise<StockLevel | undefined> {
    const [sl] = await db.select().from(stockLevels).where(
      and(eq(stockLevels.sku, sku), eq(stockLevels.locationId, locationId))
    );
    return sl || undefined;
  }

  async upsertStockLevel(data: InsertStockLevel): Promise<StockLevel> {
    const existing = await this.getStockLevel(data.sku, data.locationId);
    if (existing) {
      const [updated] = await db.update(stockLevels)
        .set({ quantity: data.quantity, lastCounted: data.lastCounted, countedBy: data.countedBy })
        .where(eq(stockLevels.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(stockLevels).values(data).returning();
    return created;
  }

  async getStockLevelsByItem(sku: string): Promise<StockLevel[]> {
    return db.select().from(stockLevels).where(eq(stockLevels.sku, sku));
  }

  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [proj] = await db.select().from(projects).where(eq(projects.projectId, id));
    return proj || undefined;
  }

  async createProject(proj: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(proj).returning();
    return created;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(data).where(eq(projects.projectId, id)).returning();
    return updated || undefined;
  }

  async getNextProjectId(): Promise<string> {
    const result = await db.select({ maxId: sql<string>`max(project_id)` }).from(projects);
    const maxId = result[0]?.maxId;
    let num = 1;
    if (maxId) {
      const match = maxId.match(/PRJ-(\d+)/);
      if (match) {
        num = parseInt(match[1], 10) + 1;
      }
    }
    return `PRJ-${String(num).padStart(3, "0")}`;
  }

  async getAllocations(): Promise<Allocation[]> {
    return db.select().from(allocations).orderBy(desc(allocations.id));
  }

  async getAllocationsByProject(projectId: string): Promise<Allocation[]> {
    return db.select().from(allocations).where(eq(allocations.projectId, projectId)).orderBy(desc(allocations.id));
  }

  async createAllocation(alloc: InsertAllocation): Promise<Allocation> {
    const [created] = await db.insert(allocations).values(alloc).returning();
    return created;
  }

  async updateAllocation(id: number, data: Partial<InsertAllocation>): Promise<Allocation | undefined> {
    const [updated] = await db.update(allocations).set(data).where(eq(allocations.id, id)).returning();
    return updated || undefined;
  }

  async getActiveAllocationsForSku(sku: string): Promise<Allocation[]> {
    return db.select().from(allocations).where(
      and(eq(allocations.sku, sku), eq(allocations.status, "Reserved"))
    );
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.projectId, id));
  }

  async deleteAllocationsByProject(projectId: string): Promise<void> {
    await db.delete(allocations).where(eq(allocations.projectId, projectId));
  }

  async deletePickListsByProject(projectId: string): Promise<void> {
    await db.delete(pickLists).where(eq(pickLists.projectId, projectId));
  }

  async getTransfers(): Promise<Transfer[]> {
    return db.select().from(transfers).orderBy(desc(transfers.id));
  }

  async getTransfer(id: number): Promise<Transfer | undefined> {
    const [t] = await db.select().from(transfers).where(eq(transfers.id, id));
    return t || undefined;
  }

  async createTransfer(t: InsertTransfer): Promise<Transfer> {
    const [created] = await db.insert(transfers).values(t).returning();
    return created;
  }

  async updateTransfer(id: number, data: Partial<InsertTransfer>): Promise<Transfer | undefined> {
    const [updated] = await db.update(transfers).set(data).where(eq(transfers.id, id)).returning();
    return updated || undefined;
  }

  async deleteTransfer(id: number): Promise<void> {
    await db.delete(transfers).where(eq(transfers.id, id));
  }

  async getPickLists(): Promise<PickList[]> {
    return db.select().from(pickLists).orderBy(desc(pickLists.id));
  }

  async getPickListsByProject(projectId: string): Promise<PickList[]> {
    return db.select().from(pickLists).where(eq(pickLists.projectId, projectId)).orderBy(desc(pickLists.id));
  }

  async getPickList(id: number): Promise<PickList | undefined> {
    const [pl] = await db.select().from(pickLists).where(eq(pickLists.id, id));
    return pl || undefined;
  }

  async createPickList(pl: InsertPickList): Promise<PickList> {
    const [created] = await db.insert(pickLists).values(pl).returning();
    return created;
  }

  async updatePickList(id: number, data: Partial<InsertPickList>): Promise<PickList | undefined> {
    const [updated] = await db.update(pickLists).set(data).where(eq(pickLists.id, id)).returning();
    return updated || undefined;
  }

  async getAuditLog(): Promise<AuditLogEntry[]> {
    return db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(500);
  }

  async createAuditEntry(entry: InsertAuditLogEntry): Promise<AuditLogEntry> {
    const [created] = await db.insert(auditLog).values(entry).returning();
    return created;
  }

  async getAppUsers(): Promise<AppUser[]> {
    return db.select().from(appUsers).orderBy(appUsers.displayName);
  }

  async getAppUser(id: number): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return user || undefined;
  }

  async getAppUserByEmail(email: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email));
    return user || undefined;
  }

  async createAppUser(user: InsertAppUser): Promise<AppUser> {
    const [created] = await db.insert(appUsers).values(user).returning();
    return created;
  }

  async updateAppUser(id: number, data: Partial<InsertAppUser>): Promise<AppUser | undefined> {
    const [updated] = await db.update(appUsers).set(data).where(eq(appUsers.id, id)).returning();
    return updated || undefined;
  }

  async runTransaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });
      const result = await fn(txDb as unknown as typeof db);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const storage = new DatabaseStorage();
