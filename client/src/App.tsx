import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import PropertyDetail from "@/pages/property-detail";
import CreateListing from "@/pages/create-listing";

import MyListings from "@/pages/my-listings";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/bolig/:id" component={PropertyDetail} />
        <Route path="/opret-bolig" component={CreateListing} />
        <Route path="/rediger-bolig/:id" component={CreateListing} />
        <Route path="/mine-boliger" component={MyListings} />
        <Route path="/beskeder" component={Chat} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
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
