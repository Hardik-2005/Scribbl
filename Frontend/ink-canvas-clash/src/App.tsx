import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import Lobby from "./pages/Lobby";
import Index from "./pages/Index";
import JoinRoom from "./pages/JoinRoom";
import NotFound from "./pages/NotFound";
import LoginPage from "./components/auth/LoginPage";
import { getToken } from "./services/auth";

const queryClient = new QueryClient();

/** Redirects unauthenticated users to /login */
const ProtectedRoute = ({ children }: { children: ReactNode }) =>
  getToken() ? <>{children}</> : <Navigate to="/login" replace />;

/** Redirects already-logged-in users straight to /lobby */
const PublicRoute = ({ children }: { children: ReactNode }) =>
  getToken() ? <Navigate to="/lobby" replace /> : <>{children}</>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Root: go to lobby if logged in, otherwise login */}
          <Route path="/" element={<Navigate to={getToken() ? "/lobby" : "/login"} replace />} />
          {/* Login page — skip if already authenticated */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          {/* Lobby — requires auth */}
          <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
          {/* Invite link — requires auth so username is available */}
          <Route path="/join/:roomId" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
          {/* Game — requires auth */}
          <Route path="/game" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
