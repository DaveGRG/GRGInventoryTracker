export interface StockSummary {
  sku: string;
  description: string;
  category: string;
  species: string | null;
  thickness: string | null;
  width: string | null;
  length: string | null;
  farmParLevel: number;
  mkeParLevel: number;
  status: string;
  notes: string | null;
  totalOnHand: number;
  allocated: number;
  available: number;
  locations: { locationId: string; locationName: string; hub: string; quantity: number }[];
}

export interface ParLevelAlert {
  sku: string;
  description: string;
  hub: string;
  currentTotal: number;
  parLevel: number;
  deficit: number;
}

export interface DashboardData {
  totalSkus: number;
  belowParItems: ParLevelAlert[];
  recentActivity: any[];
  pendingPickLists: number;
  activeTransfers: number;
  activeProjects: number;
  totalClients: number;
  activeClients: number;
}

export interface ClientProduct {
  projectId: string;
  projectName: string;
  status: string;
  assignedHub: string;
  startDate: string | null;
  endDate: string | null;
  projectLead: string | null;
}

export interface ClientSummary {
  name: string;
  productCount: number;
  activeCount: number;
  completedCount: number;
  totalAllocations: number;
  products: ClientProduct[];
}
