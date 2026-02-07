import { storage } from "./storage";
import { db } from "./db";
import { inventoryItems, locations, stockLevels, appUsers } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingLocations = await storage.getLocations();
  if (existingLocations.length > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  console.log("Seeding database...");

  await storage.createLocation({ locationId: "FARM-WS", locationName: "Woodshop", hub: "Farm", zoneType: "Storage Zone" });
  await storage.createLocation({ locationId: "FARM-SS", locationName: "Storage Shed", hub: "Farm", zoneType: "Storage Zone" });
  await storage.createLocation({ locationId: "FARM-CC", locationName: "Corn Crib", hub: "Farm", zoneType: "Storage Zone" });
  await storage.createLocation({ locationId: "FARM-GR", locationName: "Garage", hub: "Farm", zoneType: "Storage Zone" });
  await storage.createLocation({ locationId: "MKE-SHOP", locationName: "MKE Shop", hub: "MKE", zoneType: "Storage Zone" });
  await storage.createLocation({ locationId: "TRANSIT", locationName: "In Transit", hub: "Transit", zoneType: "Virtual" });

  const existing = await storage.getAppUserByEmail("admin@grgplayscapes.com");
  if (!existing) {
    await storage.createAppUser({
      email: "admin@grgplayscapes.com",
      passwordHash: "$2b$10$placeholder",
      displayName: "Admin User",
      role: "Admin",
      assignedHub: "All",
      active: true,
    });
  }

  const cedarItems: { sku: string; desc: string; t: string; w: string; l: string; fp: number; mp: number; status: string; notes?: string; stocks: Record<string, number> }[] = [
    { sku: "CDR-1x10x12", desc: "1x10x12' Cedar", t: '1"', w: '10"', l: "12'", fp: 0, mp: 0, status: "Active", stocks: { "FARM-WS": 5, "FARM-CC": 2 } },
    { sku: "CDR-1x12x12", desc: "1x12x12' Cedar", t: '1"', w: '12"', l: "12'", fp: 8, mp: 4, status: "Active", stocks: { "FARM-WS": 21 } },
    { sku: "CDR-1x6x12", desc: "1x6x12' Cedar", t: '1"', w: '6"', l: "12'", fp: 50, mp: 25, status: "Active", stocks: { "FARM-SS": 123 } },
    { sku: "CDR-1x8x12", desc: "1x8x12' Cedar", t: '1"', w: '8"', l: "12'", fp: 50, mp: 25, status: "Active", stocks: { "FARM-WS": 10, "FARM-SS": 106, "FARM-CC": 57 } },
    { sku: "CDR-BVL-16", desc: "CDR 1x8x5/8\"x16' Bevel Siding", t: '1"', w: '8"x5/8"', l: "16'", fp: 0, mp: 0, status: "Active", notes: "Count per piece not per pack (packs of 6)", stocks: { "FARM-WS": 6, "FARM-SS": 162 } },
    { sku: "CDR-BVL-12", desc: "CDR Beveled Siding 12'", t: '1"', w: '8"x5/8"', l: "12'", fp: 10, mp: 4, status: "Active", stocks: {} },
    { sku: "CDR-2x10x14", desc: "2x10x14' Cedar", t: '2"', w: '10"', l: "14'", fp: 0, mp: 0, status: "Active", stocks: { "FARM-WS": 8 } },
    { sku: "CDR-2x4x10", desc: "2x4x10' Cedar", t: '2"', w: '4"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", stocks: { "FARM-SS": 100 } },
    { sku: "CDR-2x4x12", desc: "2x4x12' Cedar", t: '2"', w: '4"', l: "12'", fp: 0, mp: 0, status: "Active", notes: "Corn Crib: In-house use only", stocks: { "FARM-WS": 25, "FARM-SS": 71, "FARM-CC": 55 } },
    { sku: "CDR-2x6x12", desc: "2x6x12' Cedar", t: '2"', w: '6"', l: "12'", fp: 50, mp: 25, status: "Active", notes: "Used for decking 2026 forward", stocks: { "FARM-WS": 22, "FARM-SS": 85 } },
    { sku: "CDR-2x6x16", desc: "2x6x16' Cedar", t: '2"', w: '6"', l: "16'", fp: 0, mp: 0, status: "Active", stocks: { "FARM-WS": 12 } },
    { sku: "CDR-2x8x12", desc: "2x8x12' Cedar", t: '2"', w: '8"', l: "12'", fp: 0, mp: 0, status: "Active", stocks: { "FARM-WS": 4, "FARM-SS": 25, "FARM-CC": 2 } },
    { sku: "CDR-4x4x10", desc: "4x4x10' Cedar", t: '4"', w: '4"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", stocks: { "FARM-SS": 10 } },
    { sku: "CDR-4x4x12", desc: "4x4x12' Cedar", t: '4"', w: '4"', l: "12'", fp: 16, mp: 8, status: "Active", stocks: { "FARM-WS": 12, "FARM-SS": 14 } },
    { sku: "CDR-4x4x16", desc: "4x4x16' Cedar", t: '4"', w: '4"', l: "16'", fp: 0, mp: 0, status: "Active", stocks: { "FARM-WS": 2 } },
    { sku: "CDR-4x6x10", desc: "4x6x10' Cedar", t: '4"', w: '6"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", stocks: { "FARM-WS": 4 } },
    { sku: "CDR-4x6x12", desc: "4x6x12' Cedar", t: '4"', w: '6"', l: "12'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", stocks: { "FARM-WS": 6 } },
    { sku: "CDR-DK-5/4x6x12", desc: "5/4x6x12' Decking Cedar", t: '5/4"', w: '6"', l: "12'", fp: 0, mp: 0, status: "Active", stocks: { "FARM-SS": 136 } },
    { sku: "CDR-DK-5/4x6x16", desc: "5/4x6x16' Decking Cedar", t: '5/4"', w: '6"', l: "16'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", stocks: { "FARM-WS": 6 } },
    { sku: "CDR-6x6x12", desc: "6x6x12' Cedar", t: '6"', w: '6"', l: "12'", fp: 0, mp: 0, status: "Active", stocks: { "FARM-SS": 4 } },
    { sku: "CDR-6x8x10", desc: "6x8x10' Cedar", t: '6"', w: '8"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", stocks: { "FARM-WS": 2 } },
    { sku: "CDR-6x8x12", desc: "6x8x12' Cedar", t: '6"', w: '8"', l: "12'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", stocks: { "FARM-WS": 1 } },
  ];

  const cedarToneItems: { sku: string; desc: string; t: string; w: string; l: string; stocks: Record<string, number> }[] = [
    { sku: "CT-2x10x08", desc: "2x10x08' Cedar Tone", t: '2"', w: '10"', l: "8'", stocks: {} },
    { sku: "CT-2x10x12", desc: "2x10x12' Cedar Tone", t: '2"', w: '10"', l: "12'", stocks: {} },
    { sku: "CT-2x12x08", desc: "2x12x08' Cedar Tone", t: '2"', w: '12"', l: "8'", stocks: { "FARM-SS": 13 } },
    { sku: "CT-2x12x12", desc: "2x12x12' Cedar Tone", t: '2"', w: '12"', l: "12'", stocks: {} },
    { sku: "CT-2x4x08", desc: "2x4x08' Cedar Tone", t: '2"', w: '4"', l: "8'", stocks: {} },
    { sku: "CT-2x4x12", desc: "2x4x12' Cedar Tone", t: '2"', w: '4"', l: "12'", stocks: {} },
    { sku: "CT-2x6x08", desc: "2x6x08' Cedar Tone", t: '2"', w: '6"', l: "8'", stocks: {} },
    { sku: "CT-2x6x12", desc: "2x6x12' Cedar Tone", t: '2"', w: '6"', l: "12'", stocks: {} },
    { sku: "CT-2x8x08", desc: "2x8x08' Cedar Tone", t: '2"', w: '8"', l: "8'", stocks: {} },
    { sku: "CT-2x8x12", desc: "2x8x12' Cedar Tone", t: '2"', w: '8"', l: "12'", stocks: {} },
    { sku: "CT-4x4x08", desc: "4x4x08' Cedar Tone", t: '4"', w: '4"', l: "8'", stocks: {} },
    { sku: "CT-4x4x12", desc: "4x4x12' Cedar Tone", t: '4"', w: '4"', l: "12'", stocks: { "FARM-SS": 2 } },
    { sku: "CT-6x6x08", desc: "6x6x08' Cedar Tone", t: '6"', w: '6"', l: "8'", stocks: {} },
    { sku: "CT-6x6x12", desc: "6x6x12' Cedar Tone", t: '6"', w: '6"', l: "12'", stocks: { "FARM-SS": 2 } },
  ];

  for (const item of cedarItems) {
    await storage.createInventoryItem({
      sku: item.sku,
      description: item.desc,
      category: "Lumber",
      species: "Cedar",
      thickness: item.t,
      width: item.w,
      length: item.l,
      farmParLevel: item.fp,
      mkeParLevel: item.mp,
      status: item.status,
      notes: item.notes || null,
    });
    for (const [locId, qty] of Object.entries(item.stocks)) {
      if (qty > 0) {
        await storage.upsertStockLevel({ sku: item.sku, locationId: locId, quantity: qty });
      }
    }
  }

  for (const item of cedarToneItems) {
    await storage.createInventoryItem({
      sku: item.sku,
      description: item.desc,
      category: "Lumber",
      species: "Cedar Tone",
      thickness: item.t,
      width: item.w,
      length: item.l,
      farmParLevel: 0,
      mkeParLevel: 0,
      status: "Active",
      notes: null,
    });
    for (const [locId, qty] of Object.entries(item.stocks)) {
      if (qty > 0) {
        await storage.upsertStockLevel({ sku: item.sku, locationId: locId, quantity: qty });
      }
    }
  }

  console.log("Database seeded successfully.");
}
