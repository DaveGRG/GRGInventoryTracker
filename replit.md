# GRG Playscapes Inventory Management System

## Overview
A mobile-first Progressive Web App for GRG Playscapes to track lumber inventory across Farm and MKE hubs. Features project allocation, transfer management between locations, pick list generation for field crews, comprehensive audit logging, and role-based access control.

## Recent Changes
- 2026-02-21: CSV-first product creation workflow
  - Product creation starts with CSV upload (Catalog ID, Product name, SKU, QTY columns)
  - Step 2 shows CSV preview and asks for Location (hub) and Job Name
  - Product name and Catalog ID auto-populated from CSV data
  - Backend creates product with inline allocations in one request
  - catalogId field added to projects schema for external reference
  - After creation, navigates directly to product detail page
- 2026-02-21: Purchase Order generation from Par Report
  - vendors table (name, company, email, phone, active) with CRUD API
  - purchase_orders table (po_number auto-increment PO#0001, vendor_id, status, order_date, sent_by)
  - purchase_order_items table (po_id, sku, quantity, hub)
  - Vendor Contacts management page at /more/vendors
  - "Add to PO" button on each below-par item on Par Report page
  - "Generate PO" sticky button at bottom when items selected
  - PO dialog: auto PO number, today's date, vendor dropdown, +/- qty controls, notes, Send button
  - PO email sent to vendor via Gmail with professional HTML template
  - Email appears from GRG Playscapes Gmail account (vendor replies go to Gmail)
  - API: GET/POST/PATCH/DELETE /api/vendors, GET /api/purchase-orders/next-number, POST/GET /api/purchase-orders
- 2026-02-21: Email notifications for transfers
  - Nodemailer integration with Gmail App Password authentication
  - Notification recipients management page at /more/notifications (add, toggle active, delete)
  - notification_recipients table in database with name, email, active fields
  - Automatic email sent to active recipients when batch transfer is created
  - HTML-formatted email with transfer details, items table, requestor info
  - Graceful fallback when Gmail credentials not configured (no crash)
  - API: GET/POST/PATCH/DELETE /api/notifications/recipients
- 2026-02-16: Replaced pick list workflow with inline checkbox pull system
  - Each material allocation line item on product detail page now has a checkbox
  - "Select all" checkbox and "Submit Pulled" button for batch stock deduction
  - POST /api/projects/:id/allocations/pull-batch endpoint with aggregated stock validation
  - Removed Generate Pick List button and Pick Lists tab from product detail page
  - Validates combined quantities per SKU/location to prevent over-pulling
  - Only Reserved and Pending allocations with assigned source locations are pullable
- 2026-02-13: Delete functionality for inventory items, products, and transfers
  - DELETE /api/inventory/:sku with cascading deletes for allocations, transfers, pick lists, stock levels
  - DELETE /api/projects/:id returns Pulled allocation stock to source locations (physical stock return with audit trail)
  - DELETE /api/transfers/:id returns In Transit stock from Transit to source location
  - All deletes wrapped in database transactions with audit trail logging
  - Confirmation dialogs (AlertDialog) on inventory detail, product detail, and transfers pages
  - Action types added to schema: "Item Deleted", "Product Deleted", "Transfer Deleted"
- 2026-02-13: Location simplification
  - Merged 4 Farm zones (FARM-SS, FARM-LB, FARM-YD, FARM-CC) into single "FARM" location
  - Renamed MKE-SHOP to "MKE"
  - Only 3 locations remain: FARM, MKE, TRANSIT (virtual)
  - Removed zoneType field from locations table schema
  - Inventory page now shows flat item list per hub (no zone groupings)
  - All frontend location filters use `locationId !== "TRANSIT"` instead of `zoneType !== "Virtual"`
  - Database migration merged all zone stock levels into FARM
- 2026-02-13: CSV import simplified
  - CSV upload only requires SKU and Quantity columns
  - Source location auto-assigned from product's hub (Farm or MKE)
  - All CSV-imported allocations get status "Reserved" and are immediately pullable
  - allocations.sourceLocation is nullable in the database schema
- 2026-02-07: Code review and security hardening
  - Password hashing with bcrypt for app user creation
  - Database transactions for transfer ship/receive/cancel and pick list confirmation
  - Stock availability validation before shipping, receiving, and picking
  - Transfer cancel returns stock from Transit to source when In Transit
  - Fixed LSP type errors (zoneType, quantityBefore/After, string assertions)
  - Added Black Locust as lumber species option
- 2026-02-07: Added New Inventory Item creation
  - "New Item" button on Inventory page opens creation dialog
  - POST /api/inventory endpoint with duplicate SKU validation (409)
  - Auto-initializes stock levels at 0 for all non-virtual locations
  - Audit log entry created for new items
  - "No Stock" collapsible section shows items with 0 quantity (auto-expands after creation or when searching)
- 2026-02-07: Added Client Directory feature
  - New /clients page with searchable client directory grouping products by client
  - Expandable client cards showing product count, active/completed status
  - GET /api/clients endpoint aggregating projects by client field
  - Dashboard updated with Active Clients stat card linking to /clients
  - View Clients quick action button on dashboard
- 2026-02-07: Added Par Levels management page
  - New page at /more/par-levels to view and edit Farm/MKE par levels for all items
  - PATCH /api/inventory/:sku/par-levels endpoint with Zod validation
  - Inline editing with change tracking, search, and batch save
- 2026-02-07: Added Physical Count, Product rename, CSV import features
  - Physical Count page: Select location, enter counted quantities, bulk submit with audit logging
  - Renamed "Project Name" to "Product Name" throughout UI (bottom nav, forms, detail pages, dashboard)
  - CSV upload on product detail page for bulk material list import with preview and results summary
  - Bulk allocation API endpoint: POST /api/projects/:id/allocations/bulk
- 2026-02-07: Initial build of complete inventory management system
  - Database schema with 9 entity types pushed to PostgreSQL
  - All 36 Cedar and Cedar Tone lumber items seeded with stock levels
  - 6 locations (4 Farm zones, 1 MKE zone, 1 Transit virtual)
  - Complete frontend with mobile-first bottom nav, forest green theme
  - Full backend API with stock adjustments, transfers, picks, audit logging
  - Replit Auth integration for authentication

## User Preferences
- Bright GRG green theme (HSL 93 72% 38%) matching grgplayscapes.com branding
- Mobile-first design with bottom navigation (not hamburger menu)
- Inter font for body text, JetBrains Mono for SKU codes
- Central Time Zone (America/Chicago) for date displays
- No Douglas Fir items (user clarification)

## Project Architecture

### Stack
- Frontend: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- Backend: Express.js + TypeScript
- Database: PostgreSQL (Neon-backed via Replit)
- ORM: Drizzle ORM
- Auth: Replit Auth

### Key Files
- `shared/schema.ts` - All Drizzle table definitions, insert schemas, types
- `server/storage.ts` - IStorage interface + DatabaseStorage implementation
- `server/routes.ts` - All API endpoints with business logic
- `server/seed.ts` - Database seeding with lumber items and locations
- `client/src/App.tsx` - Route definitions and auth gate
- `client/src/pages/` - All page components
- `client/src/components/` - Shared components (bottom-nav, app-header, status-badge, loading-skeleton)

### Data Model
- **inventoryItems**: SKU-based lumber catalog with par levels per hub
- **locations**: FARM + MKE + TRANSIT (virtual) - simplified from multiple zones
- **stockLevels**: Quantity per SKU per location (unique index)
- **projects**: Client jobs with status tracking
- **allocations**: Material reservations for projects
- **transfers**: Hub-to-hub movements with Requested → In Transit → Received workflow
- **pickLists**: Field crew pick confirmation with automatic stock deduction
- **auditLog**: Every stock change logged with before/after quantities
- **appUsers**: Role-based users (Admin, Shop Lead, Project Admin, Field Crew)

### Design Decisions
- Virtual "Transit" location tracks items during transfer workflow
- Pick list confirmation automatically deducts stock and creates audit entry
- Transfer "Ship" moves stock from source to Transit; "Receive" moves from Transit to destination
- All stock changes write to audit log - no silent changes
- Bottom navigation with 5 tabs: Dashboard, Inventory, Products, Transfers, More
- "More" page provides access to Audit Log, User Management, Par Level Report, Par Levels, Physical Count
- CSV import accepts columns: SKU (or Item/Material) and Quantity (or Qty/Amount); source location auto-assigned from product hub
- User refers to "Projects" as "Products" - labels updated throughout UI, database columns unchanged
