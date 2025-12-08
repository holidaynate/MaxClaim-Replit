/**
 * MaxClaim – Frontend UI
 * https://github.com/holidaynate/MaxClaim-Replit
 *
 * © 2023–2025 Nate Chacon (InfiN8 / HolidayNate). All rights reserved.
 *
 * Original design and UX by Nate Chacon.
 * External CSS/JS frameworks used only as utilities; see THIRD_PARTY_NOTICES.md.
 */

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import Home from "@/pages/home";
import AttributionsPage from "@/pages/AttributionsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import MyClaims from "@/pages/MyClaims";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/attributions" component={AttributionsPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/my-claims" component={MyClaims} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}

export default App;
