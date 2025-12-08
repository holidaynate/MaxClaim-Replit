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
import { SkipLink } from "@/components/SkipLink";
import Home from "@/pages/home";
import AttributionsPage from "@/pages/AttributionsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import MyClaims from "@/pages/MyClaims";
import SignIn from "@/pages/SignIn";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import AgentDashboard from "@/pages/AgentDashboard";
import PartnerDashboard from "@/pages/PartnerDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/agent-dashboard" component={AgentDashboard} />
      <Route path="/partner-dashboard" component={PartnerDashboard} />
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
          <SkipLink targetId="main-content" />
          <main id="main-content" tabIndex={-1} className="outline-none">
            <Toaster />
            <Router />
          </main>
        </TooltipProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}

export default App;
