import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trackEvent } from "@/lib/analytics";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import ResultPage from "./pages/ResultPage";
import NeighborhoodPage from "./pages/NeighborhoodPage";
import ComparePage from "./pages/ComparePage";
import HousingPage from "./pages/HousingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PageViewTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackEvent("page_view", { path: location.pathname });
  }, [location.pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
        >
          본문으로 건너뛰기
        </a>
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <ErrorBoundary>
            <main id="main-content" className="flex-1">
              <PageViewTracker />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/result" element={<ResultPage />} />
                <Route path="/neighborhood/:id" element={<NeighborhoodPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/housing/:neighborhoodId" element={<HousingPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </ErrorBoundary>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
