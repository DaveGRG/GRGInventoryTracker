import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, ClipboardList, BarChart3, Shield, Smartphone } from "lucide-react";
import logoImg from "@assets/image_1771694966878.png";

const features = [
  {
    icon: Package,
    title: "Real-Time Inventory",
    desc: "Track lumber across multiple storage zones and hubs with live stock levels and par alerts.",
  },
  {
    icon: Truck,
    title: "Transfer Management",
    desc: "Move materials between Farm and MKE with full tracking from request to receipt.",
  },
  {
    icon: ClipboardList,
    title: "Project Allocation",
    desc: "Reserve materials for jobs, generate pick lists, and track field crew pulls.",
  },
  {
    icon: BarChart3,
    title: "Audit Trail",
    desc: "Every stock change is logged. Run quarterly audits and par level reports with ease.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Admins, Shop Leads, Project Admins, and Field Crew each see exactly what they need.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First",
    desc: "Built for phones. Field crews can confirm picks and count stock right from the job site.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 md:px-8 h-14">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="GRG Playscapes" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-base">GRG Playscapes</span>
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
              Inventory Management
              <br />
              <span className="text-primary">Built for the Field</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Track lumber across Farm and MKE hubs, manage project allocations,
              coordinate transfers, and keep your crew moving with mobile-first pick lists.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="px-4 md:px-8 pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <Card key={f.title} className="hover-elevate">
                    <CardContent className="p-5 space-y-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>GRG Playscapes Inventory</span>
          <span>Built for playground builders</span>
        </div>
      </footer>
    </div>
  );
}
