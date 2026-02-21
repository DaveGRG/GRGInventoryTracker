import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Package, ClipboardList, Truck, MoreHorizontal, ArrowLeft } from "lucide-react";
import type { DashboardData } from "@/lib/types";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { path: "/inventory", label: "Inventory", icon: Package, testId: "nav-inventory" },
  { path: "/projects", label: "Products", icon: ClipboardList, testId: "nav-projects" },
  { path: "/transfers", label: "Transfers", icon: Truck, testId: "nav-transfers" },
  { path: "/more", label: "More", icon: MoreHorizontal, testId: "nav-more" },
];

export function BottomNav({ showBack, backTo }: { showBack?: boolean; backTo?: string } = {}) {
  const [location, navigate] = useLocation();

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const activeTransfers = dashboard?.activeTransfers || 0;

  return (
    <>
      <nav className="sticky top-20 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" data-testid="bottom-navigation">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
            const Icon = item.icon;
            const showBadge = item.path === "/transfers" && activeTransfers > 0;
            return (
              <Link key={item.path} href={item.path}>
                <button
                  data-testid={item.testId}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[64px] transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-4 w-4" />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-2.5 text-[10px] font-bold leading-none text-foreground" data-testid="badge-active-transfers">
                        {activeTransfers}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
      {showBack && (
        <div className="sticky top-[5.25rem] z-30 bg-background border-b">
          <button
            onClick={() => navigate(backTo || "/")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="nav-back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        </div>
      )}
    </>
  );
}
