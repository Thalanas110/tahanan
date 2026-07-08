import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Switch, Route, Router as WouterRouter } from "wouter";
import NotFound from "./pages/not-found";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/useAuth';

// Pages
import Login from "./pages/login";
import Signup from "./pages/signup";
import Onboarding from "./pages/onboarding";
import Dashboard from "./pages/dashboard";
import Checkins from "./pages/check-ins";
import Settings from "./pages/settings";
import LoveNotes from "./pages/love-notes";
import Tasks from "./pages/tasks";
import Emergency from "./pages/emergency";
import Health from "./pages/health";
import CalendarPage from "./pages/calendar";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/check-ins">
        <ProtectedRoute>
          <AppLayout>
            <Checkins />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/love-notes">
        <ProtectedRoute>
          <AppLayout>
            <LoveNotes />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/tasks">
        <ProtectedRoute>
          <AppLayout>
            <Tasks />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/emergency">
        <ProtectedRoute>
          <AppLayout>
            <Emergency />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/health">
        <ProtectedRoute>
          <AppLayout>
            <Health />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/calendar">
        <ProtectedRoute>
          <AppLayout>
            <CalendarPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout>
            <Settings />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
