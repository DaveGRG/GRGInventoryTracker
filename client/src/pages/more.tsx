import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, ScrollText, ClipboardCheck, Package, Bell } from "lucide-react";
import { Link } from "wouter";

const menuItems = [
  { href: "/more/manage-skus", label: "Manage SKUs", desc: "View, add SKUs & set par levels", icon: Package, testId: "link-manage-skus" },
  { href: "/more/audit", label: "Audit Log", desc: "View all inventory changes", icon: ScrollText, testId: "link-audit-log" },
  { href: "/more/users", label: "User Management", desc: "Manage app users and roles", icon: Users, testId: "link-users" },
  { href: "/more/par-report", label: "Par Level Report", desc: "View reorder recommendations", icon: FileText, testId: "link-par-report" },
  { href: "/physical-count", label: "Physical Count", desc: "Count and adjust inventory", icon: ClipboardCheck, testId: "link-physical-count" },
  { href: "/more/notifications", label: "Notifications", desc: "Manage email alert recipients", icon: Bell, testId: "link-notifications" },
];

export default function MorePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="More" />
      <BottomNav />
      <div className="p-4 space-y-2 max-w-2xl mx-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover-elevate cursor-pointer" data-testid={item.testId}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
