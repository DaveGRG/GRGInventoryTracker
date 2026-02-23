import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Bell, Building2, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";

const menuItems = [
  { href: "/more/users", label: "User Management", desc: "Manage app users and roles", icon: Users, testId: "link-users" },
  { href: "/more/reconciliation-reports", label: "Reconciliation Reports", desc: "Monthly inventory count vs system comparison", icon: ClipboardCheck, testId: "link-reconciliation" },
  { href: "/more/notifications", label: "Notifications", desc: "Manage email alert recipients", icon: Bell, testId: "link-notifications" },
  { href: "/more/vendors", label: "Vendor Contacts", desc: "Manage vendors for quote requests", icon: Building2, testId: "link-vendors" },
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
