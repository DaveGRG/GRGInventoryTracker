import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import InventoryPage from "@/pages/inventory";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import TransfersPage from "@/pages/transfers";
import MorePage from "@/pages/more";
import AuditLogPage from "@/pages/audit-log";
import UsersPage from "@/pages/users";
import ParReportPage from "@/pages/par-report";
import PhysicalCountPage from "@/pages/physical-count";
import ParLevelsPage from "@/pages/par-levels";
import ClientsPage from "@/pages/clients";
import ManageSkusPage from "@/pages/manage-skus";
import NotificationsPage from "@/pages/notifications";
import NotFound from "@/pages/not-found";
import logoImg from "@assets/image_1771694966878.png";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/transfers" component={TransfersPage} />
      <Route path="/transfers/new" component={TransfersPage} />
      <Route path="/more" component={MorePage} />
      <Route path="/more/audit" component={AuditLogPage} />
      <Route path="/more/users" component={UsersPage} />
      <Route path="/more/par-report" component={ParReportPage} />
      <Route path="/physical-count" component={PhysicalCountPage} />
      <Route path="/more/par-levels" component={ParLevelsPage} />
      <Route path="/more/manage-skus" component={ManageSkusPage} />
      <Route path="/more/notifications" component={NotificationsPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="GRG" className="h-10 w-10 object-contain" />
          <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
