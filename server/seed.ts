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

  await storage.createLocation({ locationId: "FARM", locationName: "Farm", hub: "Farm" });
  await storage.createLocation({ locationId: "MKE", locationName: "MKE", hub: "MKE" });
  await storage.createLocation({ locationId: "TRANSIT", locationName: "In Transit", hub: "Transit" });

  const existing = await storage.createAppUser({
    email: "admin@grgplayscapes.com",
    passwordHash: "$2b$10$placeholder",
    displayName: "Admin User",
    role: "Admin",
    assignedHub: "All",
    active: true,
  });

  const cedarItems: { sku: string; desc: string; t: string; w: string; l: string; fp: number; mp: number; status: string; notes?: string; farmStock: number; mkeStock: number }[] = [
    { sku: "CDR 1x10x12", desc: "1x10x12' Cedar", t: '1"', w: '10"', l: "12'", fp: 0, mp: 0, status: "Active", farmStock: 7, mkeStock: 0 },
    { sku: "CDR 1x12x12", desc: "1x12x12' Cedar", t: '1"', w: '12"', l: "12'", fp: 8, mp: 4, status: "Active", farmStock: 21, mkeStock: 0 },
    { sku: "CDR 1x6x12", desc: "1x6x12' Cedar", t: '1"', w: '6"', l: "12'", fp: 50, mp: 25, status: "Active", farmStock: 123, mkeStock: 0 },
    { sku: "CDR 1x8x12", desc: "1x8x12' Cedar", t: '1"', w: '8"', l: "12'", fp: 50, mp: 25, status: "Active", farmStock: 173, mkeStock: 0 },
    { sku: "CDR BVL 16", desc: "CDR 1x8x5/8\"x16' Bevel Siding", t: '1"', w: '8"x5/8"', l: "16'", fp: 0, mp: 0, status: "Active", notes: "Count per piece not per pack (packs of 6)", farmStock: 168, mkeStock: 0 },
    { sku: "CDR BVL 12", desc: "CDR Beveled Siding 12'", t: '1"', w: '8"x5/8"', l: "12'", fp: 10, mp: 4, status: "Active", farmStock: 0, mkeStock: 0 },
    { sku: "CDR 2x10x14", desc: "2x10x14' Cedar", t: '2"', w: '10"', l: "14'", fp: 0, mp: 0, status: "Active", farmStock: 8, mkeStock: 0 },
    { sku: "CDR 2x4x10", desc: "2x4x10' Cedar", t: '2"', w: '4"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", farmStock: 100, mkeStock: 0 },
    { sku: "CDR 2x4x12", desc: "2x4x12' Cedar", t: '2"', w: '4"', l: "12'", fp: 0, mp: 0, status: "Active", notes: "Corn Crib: In-house use only", farmStock: 151, mkeStock: 0 },
    { sku: "CDR 2x6x12", desc: "2x6x12' Cedar", t: '2"', w: '6"', l: "12'", fp: 50, mp: 25, status: "Active", notes: "Used for decking 2026 forward", farmStock: 107, mkeStock: 0 },
    { sku: "CDR 2x6x16", desc: "2x6x16' Cedar", t: '2"', w: '6"', l: "16'", fp: 0, mp: 0, status: "Active", farmStock: 12, mkeStock: 0 },
    { sku: "CDR 2x8x12", desc: "2x8x12' Cedar", t: '2"', w: '8"', l: "12'", fp: 0, mp: 0, status: "Active", farmStock: 31, mkeStock: 0 },
    { sku: "CDR 4x4x10", desc: "4x4x10' Cedar", t: '4"', w: '4"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", farmStock: 10, mkeStock: 0 },
    { sku: "CDR 4x4x12", desc: "4x4x12' Cedar", t: '4"', w: '4"', l: "12'", fp: 16, mp: 8, status: "Active", farmStock: 26, mkeStock: 0 },
    { sku: "CDR 4x4x16", desc: "4x4x16' Cedar", t: '4"', w: '4"', l: "16'", fp: 0, mp: 0, status: "Active", farmStock: 2, mkeStock: 0 },
    { sku: "CDR 4x6x10", desc: "4x6x10' Cedar", t: '4"', w: '6"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", farmStock: 4, mkeStock: 0 },
    { sku: "CDR 4x6x12", desc: "4x6x12' Cedar", t: '4"', w: '6"', l: "12'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", farmStock: 6, mkeStock: 0 },
    { sku: "CDR DK 5/4x6x12", desc: "5/4x6x12' Decking Cedar", t: '5/4"', w: '6"', l: "12'", fp: 0, mp: 0, status: "Active", farmStock: 136, mkeStock: 0 },
    { sku: "CDR DK 5/4x6x16", desc: "5/4x6x16' Decking Cedar", t: '5/4"', w: '6"', l: "16'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", farmStock: 6, mkeStock: 0 },
    { sku: "CDR 6x6x12", desc: "6x6x12' Cedar", t: '6"', w: '6"', l: "12'", fp: 0, mp: 0, status: "Active", farmStock: 4, mkeStock: 0 },
    { sku: "CDR 6x8x10", desc: "6x8x10' Cedar", t: '6"', w: '8"', l: "10'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", farmStock: 2, mkeStock: 0 },
    { sku: "CDR 6x8x12", desc: "6x8x12' Cedar", t: '6"', w: '8"', l: "12'", fp: 0, mp: 0, status: "Discontinuing", notes: "Not restocking once depleted", farmStock: 1, mkeStock: 0 },
  ];

  const cedarToneItems: { sku: string; desc: string; t: string; w: string; l: string; farmStock: number; mkeStock: number }[] = [
    { sku: "CT 2x10x08", desc: "2x10x08' Cedar Tone", t: '2"', w: '10"', l: "8'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x10x12", desc: "2x10x12' Cedar Tone", t: '2"', w: '10"', l: "12'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x12x08", desc: "2x12x08' Cedar Tone", t: '2"', w: '12"', l: "8'", farmStock: 13, mkeStock: 0 },
    { sku: "CT 2x12x12", desc: "2x12x12' Cedar Tone", t: '2"', w: '12"', l: "12'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x4x08", desc: "2x4x08' Cedar Tone", t: '2"', w: '4"', l: "8'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x4x12", desc: "2x4x12' Cedar Tone", t: '2"', w: '4"', l: "12'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x6x08", desc: "2x6x08' Cedar Tone", t: '2"', w: '6"', l: "8'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x6x12", desc: "2x6x12' Cedar Tone", t: '2"', w: '6"', l: "12'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x8x08", desc: "2x8x08' Cedar Tone", t: '2"', w: '8"', l: "8'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 2x8x12", desc: "2x8x12' Cedar Tone", t: '2"', w: '8"', l: "12'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 4x4x08", desc: "4x4x08' Cedar Tone", t: '4"', w: '4"', l: "8'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 4x4x12", desc: "4x4x12' Cedar Tone", t: '4"', w: '4"', l: "12'", farmStock: 2, mkeStock: 0 },
    { sku: "CT 6x6x08", desc: "6x6x08' Cedar Tone", t: '6"', w: '6"', l: "8'", farmStock: 0, mkeStock: 0 },
    { sku: "CT 6x6x12", desc: "6x6x12' Cedar Tone", t: '6"', w: '6"', l: "12'", farmStock: 2, mkeStock: 0 },
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
    if (item.farmStock > 0) {
      await storage.upsertStockLevel({ sku: item.sku, locationId: "FARM", quantity: item.farmStock });
    }
    if (item.mkeStock > 0) {
      await storage.upsertStockLevel({ sku: item.sku, locationId: "MKE", quantity: item.mkeStock });
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
    if (item.farmStock > 0) {
      await storage.upsertStockLevel({ sku: item.sku, locationId: "FARM", quantity: item.farmStock });
    }
    if (item.mkeStock > 0) {
      await storage.upsertStockLevel({ sku: item.sku, locationId: "MKE", quantity: item.mkeStock });
    }
  }

  console.log("Database seeded successfully.");
}
