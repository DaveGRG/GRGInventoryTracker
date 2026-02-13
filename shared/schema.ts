export * from "./models/auth";

import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  date,
  timestamp,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categoryEnum = ["Lumber", "Hardware", "Ready-Made"] as const;
export const itemStatusEnum = ["Active", "Discontinuing", "Discontinued"] as const;
export const hubEnum = ["Farm", "MKE", "Transit"] as const;
export const zoneTypeEnum = ["Storage Zone", "Virtual"] as const;
export const projectStatusEnum = ["Planning", "Active", "Complete", "On Hold"] as const;
export const allocationStatusEnum = ["Reserved", "Pulled", "Cancelled"] as const;
export const transferStatusEnum = ["Requested", "In Transit", "Received", "Cancelled"] as const;
export const pickListStatusEnum = ["Pending", "In Progress", "Completed", "Cancelled"] as const;
export const actionTypeEnum = [
  "Stock Adjustment", "Transfer", "Allocation", "Pick",
  "Physical Count", "Item Created", "Item Updated",
] as const;
export const userRoleEnum = ["Admin", "Shop Lead", "Project Admin", "Field Crew"] as const;
export const assignedHubEnum = ["All", "Farm", "MKE"] as const;

export const inventoryItems = pgTable("inventory_items", {
  sku: text("sku").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull().default("Lumber"),
  species: text("species"),
  thickness: text("thickness"),
  width: text("width"),
  length: text("length"),
  farmParLevel: integer("farm_par_level").notNull().default(0),
  mkeParLevel: integer("mke_par_level").notNull().default(0),
  status: text("status").notNull().default("Active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locations = pgTable("locations", {
  locationId: text("location_id").primaryKey(),
  locationName: text("location_name").notNull(),
  hub: text("hub").notNull(),
  zoneType: text("zone_type").notNull(),
  notes: text("notes"),
});

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: serial("id").primaryKey(),
    sku: text("sku").notNull().references(() => inventoryItems.sku),
    locationId: text("location_id").notNull().references(() => locations.locationId),
    quantity: integer("quantity").notNull().default(0),
    lastCounted: date("last_counted"),
    countedBy: text("counted_by"),
  },
  (table) => [uniqueIndex("stock_levels_sku_location_idx").on(table.sku, table.locationId)]
);

export const projects = pgTable("projects", {
  projectId: text("project_id").primaryKey(),
  projectName: text("project_name").notNull(),
  client: text("client").notNull(),
  assignedHub: text("assigned_hub").notNull(),
  status: text("status").notNull().default("Planning"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  projectLead: text("project_lead"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const allocations = pgTable("allocations", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.projectId),
  sku: text("sku").notNull().references(() => inventoryItems.sku),
  quantity: integer("quantity").notNull(),
  sourceLocation: text("source_location").references(() => locations.locationId),
  status: text("status").notNull().default("Reserved"),
  allocatedBy: text("allocated_by").notNull(),
  allocatedDate: date("allocated_date").notNull(),
  notes: text("notes"),
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().references(() => inventoryItems.sku),
  quantity: integer("quantity").notNull(),
  fromLocation: text("from_location").notNull().references(() => locations.locationId),
  toLocation: text("to_location").notNull().references(() => locations.locationId),
  status: text("status").notNull().default("Requested"),
  requestedBy: text("requested_by").notNull(),
  requestDate: date("request_date").notNull(),
  shippedDate: date("shipped_date"),
  receivedBy: text("received_by"),
  receivedDate: date("received_date"),
  notes: text("notes"),
});

export const pickLists = pgTable("pick_lists", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.projectId),
  sku: text("sku").notNull().references(() => inventoryItems.sku),
  quantityRequested: integer("quantity_requested").notNull(),
  pickFromLocation: text("pick_from_location").notNull().references(() => locations.locationId),
  quantityPicked: integer("quantity_picked").notNull().default(0),
  status: text("status").notNull().default("Pending"),
  pickedBy: text("picked_by"),
  pickDate: date("pick_date"),
  notes: text("notes"),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  userEmail: text("user_email").notNull(),
  actionType: text("action_type").notNull(),
  sku: text("sku"),
  locationId: text("location_id"),
  quantityBefore: integer("quantity_before"),
  quantityAfter: integer("quantity_after"),
  reason: text("reason").notNull(),
  notes: text("notes"),
});

export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("Field Crew"),
  assignedHub: text("assigned_hub").notNull().default("All"),
  active: boolean("active").notNull().default(true),
});

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  stockLevels: many(stockLevels),
  allocations: many(allocations),
  transfers: many(transfers),
  pickLists: many(pickLists),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  stockLevels: many(stockLevels),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  item: one(inventoryItems, { fields: [stockLevels.sku], references: [inventoryItems.sku] }),
  location: one(locations, { fields: [stockLevels.locationId], references: [locations.locationId] }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  allocations: many(allocations),
  pickLists: many(pickLists),
}));

export const allocationsRelations = relations(allocations, ({ one }) => ({
  project: one(projects, { fields: [allocations.projectId], references: [projects.projectId] }),
  item: one(inventoryItems, { fields: [allocations.sku], references: [inventoryItems.sku] }),
  location: one(locations, { fields: [allocations.sourceLocation], references: [locations.locationId] }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  item: one(inventoryItems, { fields: [transfers.sku], references: [inventoryItems.sku] }),
  fromLoc: one(locations, { fields: [transfers.fromLocation], references: [locations.locationId] }),
  toLoc: one(locations, { fields: [transfers.toLocation], references: [locations.locationId] }),
}));

export const pickListsRelations = relations(pickLists, ({ one }) => ({
  project: one(projects, { fields: [pickLists.projectId], references: [projects.projectId] }),
  item: one(inventoryItems, { fields: [pickLists.sku], references: [inventoryItems.sku] }),
  location: one(locations, { fields: [pickLists.pickFromLocation], references: [locations.locationId] }),
}));

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertLocationSchema = createInsertSchema(locations);
export const insertStockLevelSchema = createInsertSchema(stockLevels).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ createdAt: true });
export const insertAllocationSchema = createInsertSchema(allocations).omit({ id: true });
export const insertTransferSchema = createInsertSchema(transfers).omit({ id: true });
export const insertPickListSchema = createInsertSchema(pickLists).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, timestamp: true });
export const insertAppUserSchema = createInsertSchema(appUsers).omit({ id: true });

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type StockLevel = typeof stockLevels.$inferSelect;
export type InsertStockLevel = z.infer<typeof insertStockLevelSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Allocation = typeof allocations.$inferSelect;
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type PickList = typeof pickLists.$inferSelect;
export type InsertPickList = z.infer<typeof insertPickListSchema>;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = z.infer<typeof insertAuditLogSchema>;
export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
