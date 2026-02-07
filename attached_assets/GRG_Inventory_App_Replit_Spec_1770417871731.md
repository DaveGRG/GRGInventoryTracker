# GRG Playscapes — Inventory Management App

## Build me a mobile-first inventory management web app for a playground construction company called GRG Playscapes.

The app tracks lumber inventory across two hubs (a rural Farm with 4 storage zones, and a Milwaukee city shop) and handles project allocation, inter-hub transfers, field crew pick lists, and audit logging. It needs to work great on phones since field crews will use it on job sites.

---

## Tech Stack

- **Frontend**: React with Tailwind CSS, mobile-first responsive design
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (use Replit's built-in PostgreSQL)
- **Auth**: Simple email + password authentication (no OAuth needed)
- **PWA**: Make it installable on phones (add manifest.json and service worker)

---

## User Roles & Permissions

There are 4 roles. Each user has an assigned hub.

| Role | Can Do | Sees |
|------|--------|------|
| **Admin** | Everything — manage users, all locations, all projects, run reports, edit par levels | Global view of all hubs |
| **Shop Lead** | Manage inventory at their hub, approve transfers, run audits for their hub | Only their assigned hub's data |
| **Project Admin** | Create projects, upload build lists, create allocations, create pick lists | Projects they manage + relevant inventory |
| **Field Crew** | Confirm pick lists, do box audits, update counts at their location | Pick lists assigned to them, inventory at their location |

---

## Data Model

### Inventory_Items (Master SKU list)
```
SKU              (text, primary key, e.g., "CDR-2x6x12")
description      (text, e.g., "2x6x12' Cedar")
category         (enum: "Lumber", "Hardware", "Ready-Made")
species          (text, e.g., "Cedar", "Cedar Tone", "Douglas Fir")
thickness        (text, e.g., "2\"")
width            (text, e.g., "6\"")
length           (text, e.g., "12'")
farm_par_level   (integer, default 0)
mke_par_level    (integer, default 0)
status           (enum: "Active", "Discontinuing", "Discontinued")
notes            (text, nullable)
created_at       (timestamp)
updated_at       (timestamp)
```

### Locations
```
location_id      (text, primary key, e.g., "FARM-WS")
location_name    (text, e.g., "Woodshop")
hub              (enum: "Farm", "MKE", "Transit")
zone_type        (enum: "Storage Zone", "Virtual")
notes            (text, nullable)
```

### Stock_Levels (quantity of each SKU at each location)
```
id               (auto-increment primary key)
sku              (foreign key → Inventory_Items)
location_id      (foreign key → Locations)
quantity         (integer, >= 0)
last_counted     (date)
counted_by       (text, nullable)
```
**Unique constraint on (sku, location_id)** — one row per SKU per location.

### Projects
```
project_id       (text, primary key, e.g., "PRJ-001")
project_name     (text)
client           (text)
assigned_hub     (enum: "Farm", "MKE")
status           (enum: "Planning", "Active", "Complete", "On Hold")
start_date       (date, nullable)
end_date         (date, nullable)
project_lead     (text, nullable)
notes            (text, nullable)
created_at       (timestamp)
```

### Allocations (Pre-Pull / Job Holds)
```
id               (auto-increment primary key)
project_id       (foreign key → Projects)
sku              (foreign key → Inventory_Items)
quantity         (integer)
source_location  (foreign key → Locations)
status           (enum: "Reserved", "Pulled", "Cancelled")
allocated_by     (text)
allocated_date   (date)
notes            (text, nullable)
```

### Transfers (inter-hub material movement)
```
id               (auto-increment primary key)
sku              (foreign key → Inventory_Items)
quantity         (integer)
from_location    (foreign key → Locations)
to_location      (foreign key → Locations)
status           (enum: "Requested", "In Transit", "Received", "Cancelled")
requested_by     (text)
request_date     (date)
shipped_date     (date, nullable)
received_by      (text, nullable)
received_date    (date, nullable)
notes            (text, nullable)
```

### Pick_Lists (field crew depletion)
```
id               (auto-increment primary key)
project_id       (foreign key → Projects)
sku              (foreign key → Inventory_Items)
quantity_requested (integer)
pick_from_location (foreign key → Locations)
quantity_picked  (integer, default 0)
status           (enum: "Pending", "In Progress", "Completed", "Cancelled")
picked_by        (text, nullable)
pick_date        (date, nullable)
notes            (text, nullable)
```

### Audit_Log (append-only change history)
```
id               (auto-increment primary key)
timestamp        (timestamp, auto-set)
user_email       (text)
action_type      (enum: "Stock Adjustment", "Transfer", "Allocation", "Pick", "Physical Count", "Item Created", "Item Updated")
sku              (text, nullable)
location_id      (text, nullable)
quantity_before  (integer, nullable)
quantity_after   (integer, nullable)
reason           (text)
notes            (text, nullable)
```

### Users
```
id               (auto-increment primary key)
email            (text, unique)
password_hash    (text)
display_name     (text)
role             (enum: "Admin", "Shop Lead", "Project Admin", "Field Crew")
assigned_hub     (enum: "All", "Farm", "MKE")
active           (boolean, default true)
```

---

## Seed Data

Pre-populate the database with the following on first run:

### Locations:
- FARM-WS | Woodshop | Farm | Storage Zone
- FARM-SS | Storage Shed | Farm | Storage Zone
- FARM-CC | Corn Crib | Farm | Storage Zone
- FARM-GR | Garage | Farm | Storage Zone
- MKE-SHOP | MKE Shop | MKE | Storage Zone
- TRANSIT | In Transit | Transit | Virtual

### Default Admin User:
- Email: admin@grgplayscapes.com / Password: changeme123

### Inventory Items & Stock Levels:

**CEDAR:**

| SKU | Description | Species | Dimensions | Farm Par | MKE Par | Status | Woodshop Qty | Storage Shed Qty | Corn Crib Qty | Garage Qty | MKE Qty | Notes |
|-----|-------------|---------|------------|----------|---------|--------|-------------|-----------------|--------------|-----------|---------|-------|
| CDR-1x10x12 | 1x10x12' Cedar | Cedar | 1"x10"x12' | 0 | 0 | Active | 5 | 0 | 2 | 0 | 0 | |
| CDR-1x12x12 | 1x12x12' Cedar | Cedar | 1"x12"x12' | 8 | 4 | Active | 21 | 0 | 0 | 0 | 0 | |
| CDR-1x6x12 | 1x6x12' Cedar | Cedar | 1"x6"x12' | 50 | 25 | Active | 0 | 123 | 0 | 0 | 0 | |
| CDR-1x8x12 | 1x8x12' Cedar | Cedar | 1"x8"x12' | 50 | 25 | Active | 10 | 106 | 57 | 0 | 0 | |
| CDR-BVL-16 | CDR 1x8x5/8"x16' Bevel Siding | Cedar | 1"x8"x5/8"x16' | 0 | 0 | Active | 6 | 162 | 0 | 0 | 0 | Count per piece not per pack (packs of 6) |
| CDR-BVL-12 | CDR Beveled Siding 12' | Cedar | 1"x8"x5/8"x12' | 10 | 4 | Active | 0 | 0 | 0 | 0 | 0 | |
| CDR-2x10x14 | 2x10x14' Cedar | Cedar | 2"x10"x14' | 0 | 0 | Active | 8 | 0 | 0 | 0 | 0 | |
| CDR-2x4x10 | 2x4x10' Cedar | Cedar | 2"x4"x10' | 0 | 0 | Discontinuing | 0 | 100 | 0 | 0 | 0 | Not restocking once depleted |
| CDR-2x4x12 | 2x4x12' Cedar | Cedar | 2"x4"x12' | 0 | 0 | Active | 25 | 71 | 55 | 0 | 0 | Corn Crib: In-house use only |
| CDR-2x6x12 | 2x6x12' Cedar | Cedar | 2"x6"x12' | 50 | 25 | Active | 22 | 85 | 0 | 0 | 0 | Used for decking 2026 forward |
| CDR-2x6x16 | 2x6x16' Cedar | Cedar | 2"x6"x16' | 0 | 0 | Active | 12 | 0 | 0 | 0 | 0 | |
| CDR-2x8x12 | 2x8x12' Cedar | Cedar | 2"x8"x12' | 0 | 0 | Active | 4 | 25 | 2 | 0 | 0 | |
| CDR-4x4x10 | 4x4x10' Cedar | Cedar | 4"x4"x10' | 0 | 0 | Discontinuing | 0 | 10 | 0 | 0 | 0 | Not restocking once depleted |
| CDR-4x4x12 | 4x4x12' Cedar | Cedar | 4"x4"x12' | 16 | 8 | Active | 12 | 14 | 0 | 0 | 0 | |
| CDR-4x4x16 | 4x4x16' Cedar | Cedar | 4"x4"x16' | 0 | 0 | Active | 2 | 0 | 0 | 0 | 0 | |
| CDR-4x6x10 | 4x6x10' Cedar | Cedar | 4"x6"x10' | 0 | 0 | Discontinuing | 4 | 0 | 0 | 0 | 0 | Not restocking once depleted |
| CDR-4x6x12 | 4x6x12' Cedar | Cedar | 4"x6"x12' | 0 | 0 | Discontinuing | 6 | 0 | 0 | 0 | 0 | Not restocking once depleted |
| CDR-DK-5/4x6x12 | 5/4x6x12' Decking Cedar | Cedar | 5/4"x6"x12' | 0 | 0 | Active | 0 | 136 | 0 | 0 | 0 | |
| CDR-DK-5/4x6x16 | 5/4x6x16' Decking Cedar | Cedar | 5/4"x6"x16' | 0 | 0 | Discontinuing | 6 | 0 | 0 | 0 | 0 | Not restocking once depleted |
| CDR-6x6x12 | 6x6x12' Cedar | Cedar | 6"x6"x12' | 0 | 0 | Active | 0 | 4 | 0 | 0 | 0 | |
| CDR-6x8x10 | 6x8x10' Cedar | Cedar | 6"x8"x10' | 0 | 0 | Discontinuing | 2 | 0 | 0 | 0 | 0 | Not restocking once depleted |
| CDR-6x8x12 | 6x8x12' Cedar | Cedar | 6"x8"x12' | 0 | 0 | Discontinuing | 1 | 0 | 0 | 0 | 0 | Not restocking once depleted |

**CEDAR TONE** (all have 0 par levels, Active status, most have 0 stock except noted):

| SKU | Description | Species | Dimensions | Stock |
|-----|-------------|---------|------------|-------|
| CT-2x10x08 | 2x10x08' Cedar Tone | Cedar Tone | 2"x10"x8' | All 0 |
| CT-2x10x12 | 2x10x12' Cedar Tone | Cedar Tone | 2"x10"x12' | All 0 |
| CT-2x12x08 | 2x12x08' Cedar Tone | Cedar Tone | 2"x12"x8' | Storage Shed: 13 |
| CT-2x12x12 | 2x12x12' Cedar Tone | Cedar Tone | 2"x12"x12' | All 0 |
| CT-2x4x08 | 2x4x08' Cedar Tone | Cedar Tone | 2"x4"x8' | All 0 |
| CT-2x4x12 | 2x4x12' Cedar Tone | Cedar Tone | 2"x4"x12' | All 0 |
| CT-2x6x08 | 2x6x08' Cedar Tone | Cedar Tone | 2"x6"x8' | All 0 |
| CT-2x6x12 | 2x6x12' Cedar Tone | Cedar Tone | 2"x6"x12' | All 0 |
| CT-2x8x08 | 2x8x08' Cedar Tone | Cedar Tone | 2"x8"x8' | All 0 |
| CT-2x8x12 | 2x8x12' Cedar Tone | Cedar Tone | 2"x8"x12' | All 0 |
| CT-4x4x08 | 4x4x08' Cedar Tone | Cedar Tone | 4"x4"x8' | All 0 |
| CT-4x4x12 | 4x4x12' Cedar Tone | Cedar Tone | 4"x4"x12' | Storage Shed: 2 |
| CT-6x6x08 | 6x6x08' Cedar Tone | Cedar Tone | 6"x6"x8' | All 0 |
| CT-6x6x12 | 6x6x12' Cedar Tone | Cedar Tone | 6"x6"x12' | Storage Shed: 2 |

---

## App Screens & Navigation

### Bottom Navigation Bar (mobile — always visible):
1. **Dashboard** (home icon)
2. **Inventory** (boxes icon)
3. **Projects** (clipboard icon)
4. **Transfers** (truck icon)
5. **More** (menu icon → Audit Log, Users, Settings)

---

### 1. DASHBOARD SCREEN

The first thing users see after login. Show a summary that's relevant to their role.

**For Admin:**
- Total SKUs across all locations
- Items below par level (highlighted in red/orange) — show as a card list: SKU, current total, par level, deficit
- Recent activity feed (last 10 audit log entries)
- Quick action buttons: "New Transfer", "New Project", "Run Audit"

**For Shop Lead:**
- Same as admin but filtered to their hub only
- Their hub's items below par level

**For Field Crew:**
- Pending pick lists assigned to them
- Quick "Confirm Pick" button

### 2. INVENTORY SCREEN

This is the core screen. It shows stock levels.

**Default View: By Hub**
- Two tabs at top: **FARM** | **MKE**
- Under Farm tab, show sub-tabs or collapsible sections for each zone: Woodshop, Storage Shed, Corn Crib, Garage
- Each section shows a table/list:

```
SKU          | Description        | Qty | Par | Status
CDR-2x6x12  | 2x6x12' Cedar     | 85  | 50  | ✅
CDR-1x6x12  | 1x6x12' Cedar     | 123 | 50  | ✅
CDR-4x4x12  | 4x4x12' Cedar     | 14  | 16  | ⚠️ Below Par
```

- Color code: Green if at/above par, Orange/Red if below par, Gray if no par level set
- Tapping a row opens the **Item Detail** view

**Global View Toggle** (Admin only):
- Shows totals across ALL locations in one table:

```
SKU          | Description      | Total On Hand | Allocated | Available | Farm Par | MKE Par
CDR-2x6x12  | 2x6x12' Cedar   | 107           | 0         | 107       | 50       | 25
```

- "Total On Hand" = sum of all Stock_Levels for that SKU
- "Allocated" = sum of all Allocations with status "Reserved" for that SKU
- "Available" = Total On Hand - Allocated

**Search & Filter:**
- Search bar at top (searches SKU and description)
- Filter chips: Species (Cedar, Cedar Tone, etc.), Status (Active, Discontinuing), Below Par Only

**Item Detail View** (tap any item):
- Shows SKU, description, species, dimensions, notes
- Breakdown by location with quantities
- Allocated amounts (which projects)
- Par levels (editable by Admin/Shop Lead)
- Action buttons: "Adjust Count", "Create Transfer", "Allocate to Project"
- History: recent audit log entries for this SKU

**Adjust Count** (from Item Detail):
- Select location
- Enter new count
- Required: Reason dropdown (Physical Count, Received Shipment, Damaged/Waste, Correction, Other)
- Optional: Notes field
- On save: updates Stock_Levels, writes to Audit_Log

### 3. PROJECTS SCREEN

**Project List:**
- Cards showing: Project Name, Client, Hub, Status badge, date
- Filter by status (Planning, Active, Complete, On Hold)
- "New Project" button (Admin/Project Admin only)

**Project Detail:**
- Project info (name, client, hub, lead, dates, notes)
- **Materials Tab**: List of all allocations for this project
  - Shows SKU, quantity allocated, source location, status
  - "Add Material" button to create new allocation
  - "Generate Pick List" button — converts Reserved allocations into Pick List items
- **Pick Lists Tab**: All pick list items for this project
  - Grouped by location (so a crew member knows: "Go to Storage Shed, pull these 5 items")
  - Each item shows: SKU, description, quantity needed, pick location
  - "Confirm Pick" button per item (enters quantity actually picked, updates stock)

**Create Allocation Flow:**
1. Select SKU (searchable dropdown)
2. Enter quantity needed
3. App shows available stock by location and auto-suggests source location based on assigned hub
4. User confirms or overrides location
5. App checks: is there enough "Available" stock (Total - already Allocated)?
   - If yes: creates allocation, shows confirmation
   - If no: shows warning with available quantity, user can allocate partial or cancel

### 4. TRANSFERS SCREEN

**Transfer List:**
- Cards showing: SKU, quantity, from → to, status badge, date
- Filter by status (Requested, In Transit, Received, Cancelled)

**New Transfer Flow:**
1. Select SKU
2. Enter quantity
3. Select From location and To location
4. App validates quantity is available at source
5. Creates transfer with status "Requested"

**Transfer Status Workflow:**
- **Requested** → Shop Lead at source location sees it and taps "Ship" → status becomes "In Transit", stock moves from source to TRANSIT location
- **In Transit** → Shop Lead at destination taps "Receive" → enters quantity received → status becomes "Received", stock moves from TRANSIT to destination
- At any point before "In Transit", either party can "Cancel"

### 5. AUDIT & REPORTING (under More menu)

**Audit Log:**
- Scrollable list of all changes, most recent first
- Each entry shows: timestamp, user, action type, SKU, location, before/after quantity, reason
- Filter by: date range, user, action type, SKU
- Admin can export as CSV

**Par Level Report:**
- Table showing all items with par levels set
- Columns: SKU, Description, Current Farm Total, Farm Par, Farm Deficit, Current MKE Total, MKE Par, MKE Deficit
- Highlight rows where deficit > 0
- "Export Reorder List" button — generates a list of just the items that need reordering

**Quarterly Audit Feature:**
- Admin/Shop Lead starts an audit for a specific location
- App shows every SKU that should be at that location (based on Stock_Levels)
- User enters actual physical count for each
- On completion, app shows a reconciliation report:
  - SKU | System Count | Physical Count | Difference
- User can "Accept" the audit which updates Stock_Levels and logs all changes to Audit_Log with reason "Quarterly Audit"

---

## Design & UI Requirements

### Color Palette:
- Primary: Forest green (#2D5F2D) — matches GRG's outdoor/playground brand
- Secondary: Warm amber (#D4A017)
- Background: Light gray (#F5F5F5)
- Cards: White with subtle shadow
- Danger/Below Par: Red (#DC3545)
- Warning: Orange (#FD7E14)
- Success/In Stock: Green (#28A745)

### Mobile-First Principles:
- All tap targets minimum 44x44px
- Bottom navigation bar, not hamburger menu
- Cards over tables on small screens (tables on desktop/tablet)
- Pull-to-refresh on list screens
- Large, clear status badges
- Search always accessible at top of list screens

### Typography:
- Clean sans-serif (Inter or system fonts)
- SKU codes in monospace for readability
- Large quantity numbers (easy to read at a glance in the field)

---

## Key Business Logic

### "Available" Calculation:
```
Available = Total On Hand - Sum of Active Allocations
Total On Hand = Sum of Stock_Levels across all locations for that SKU
Active Allocations = Sum of Allocations where status = "Reserved"
```

### Par Level Alerts:
- Calculate per hub: sum Stock_Levels for all locations in that hub
- Compare to the hub's par level
- If below: show alert on Dashboard and highlight in Inventory view

### Transfer Stock Movement:
- When shipped: subtract from source location, add to TRANSIT
- When received: subtract from TRANSIT, add to destination location
- All movements logged to Audit_Log

### Pick List Confirmation:
- When crew confirms a pick: subtract picked quantity from the source location's Stock_Levels
- Update the corresponding Allocation status from "Reserved" to "Pulled"
- Log to Audit_Log

### Preventing Over-Allocation:
- Before creating an allocation, check: Available (Total On Hand - existing Reserved allocations) >= requested quantity
- If not enough, show the user what IS available and let them allocate a partial amount

---

## Important Notes

- Every change to stock quantities MUST write to the Audit_Log. No silent changes.
- The app should be fast. Inventory queries should be optimized with proper indexes on (sku, location_id).
- Use database transactions for any operation that changes stock levels (transfer, pick, allocation) to prevent race conditions.
- Show loading spinners during data fetches. Show toast notifications for successful actions.
- All dates should display in Central Time (America/Chicago).
- ID generation: Project IDs as "PRJ-001" incrementing, Transfer IDs as "TRF-001", etc. Auto-generate these.
