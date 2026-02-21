import { useLocation, Link } from "wouter";
import { LayoutDashboard, Package, ClipboardList, Truck, MoreHorizontal } from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { path: "/inventory", label: "Inventory", icon: Package, testId: "nav-inventory" },
  { path: "/projects", label: "Products", icon: ClipboardList, testId: "nav-projects" },
  { path: "/transfers", label: "Transfers", icon: Truck, testId: "nav-transfers" },
  { path: "/more", label: "More", icon: MoreHorizontal, testId: "nav-more" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" data-testid="bottom-navigation">
      <div className="max-w-2xl mx-auto" style={{ borderLeft: '6px solid #5c4a1e', borderRight: '6px solid #5c4a1e' }}>
        <div className="flex items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {navItems.map((item) => {
            const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <button
                  data-testid={item.testId}
                  className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px] min-h-[56px] transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
