import { useLocation, Link } from "wouter";
import { LayoutDashboard, Package, ClipboardList, Truck, MoreHorizontal, ArrowLeft } from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { path: "/inventory", label: "Inventory", icon: Package, testId: "nav-inventory" },
  { path: "/projects", label: "Products", icon: ClipboardList, testId: "nav-projects" },
  { path: "/transfers", label: "Transfers", icon: Truck, testId: "nav-transfers" },
  { path: "/more", label: "More", icon: MoreHorizontal, testId: "nav-more" },
];

export function BottomNav({ showBack, backTo }: { showBack?: boolean; backTo?: string } = {}) {
  const [location, navigate] = useLocation();

  return (
    <nav className="sticky top-20 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" data-testid="bottom-navigation">
      <div className="flex items-center justify-around">
        {showBack && (
          <button
            onClick={() => navigate(backTo || "/more")}
            className="flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[40px] transition-colors text-muted-foreground"
            data-testid="nav-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {navItems.map((item) => {
          const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <button
                data-testid={item.testId}
                className={`flex flex-col items-center gap-0.5 py-1.5 ${showBack ? "px-2 min-w-[52px]" : "px-3 min-w-[64px]"} transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
