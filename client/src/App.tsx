import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/pages/splash";
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
import VendorsPage from "@/pages/vendors";
import ReconciliationReportsPage from "@/pages/reconciliation-reports";
import NotFound from "@/pages/not-found";

function Routes() {
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
      <Route path="/more/vendors" component={VendorsPage} />
      <Route path="/more/reconciliation-reports" component={ReconciliationReportsPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("splashSeen");
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem("splashSeen", "1");
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Routes />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
