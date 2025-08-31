import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginForm } from './components/auth/LoginForm';
import { PasswordReset } from './components/auth/PasswordReset';
import { UpdatePassword } from './components/auth/UpdatePassword';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { Clusters } from './pages/Clusters';
import { NewCluster } from './pages/NewCluster';
import { ViewCluster } from './pages/ViewCluster';
import { EditCluster } from './pages/EditCluster';
import { InterventionDashboard } from './pages/interventions/InterventionDashboard';
import { NewIntervention } from './pages/interventions/NewIntervention';
import { InterventionDetails } from './pages/interventions/InterventionDetails';
import { EditIntervention } from './pages/interventions/EditIntervention';
import { ActionDetails } from './pages/actions/ActionDetails';
import { ActionReports } from "./pages/reports/ActionReports";
import { ReportTemplates } from './pages/reports/ReportTemplates';
import { Settings } from './pages/settings/Settings';
import { Profile } from './pages/settings/Profile';
import { Assignments } from './pages/settings/Assignments';
import { EditTemplate } from './pages/reports/EditTemplate';
import { GenerateReport } from './pages/reports/GenerateReport';
import { Import } from './pages/settings/Import';
import { Roles } from './pages/settings/Role';
import { System } from './pages/settings/System';
import { Security } from './pages/settings/Security';
import { Users } from './pages/settings/Users'
import { useAuth } from './lib/auth.tsx';
import { MyDashboard } from './pages/UserDashboard';
import { PojectsPartners } from './pages/settings/PojectsPartners';
import { Issue } from './pages/issues';
import Help from './pages/Help';
import TargetTracking from './pages/targets/TargetTracking';
import NewTarget from './pages/targets/NewTarget';
import TargetDetail from './pages/targets/TargetDetail';
import TargetsIndex from './pages/targets/index';
import { ActionDashboard } from './pages/actions/ActionDashboard';
import { Jobs } from './pages/jobs';
import UserActivity from './pages/admin/UserActivity';
import Reports from './pages/admin/Reports';
import { IframePage } from './pages/IframePage';
import { CircuitBreakerTest } from './pages/CircuitBreakerTest';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  const { user } = useAuth();

  return (
    <TooltipProvider>
      <Router>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Auth routes - no layout needed */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <LoginForm />} />
          
          <Route 
            path="/reset-password" 
            element={user ? <Navigate to="/" replace /> : <PasswordReset /> }/>

          <Route 
            path="/update-password" 
            element={user ? <Navigate to="/" replace /> : <UpdatePassword /> }/>
          
          {/* Protected routes with persistent DashboardLayout */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Jobs />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/jobs" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Jobs />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clusters" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Clusters />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clusters/new" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NewCluster />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clusters/:id" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ViewCluster />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clusters/:id/edit" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EditCluster />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/interventions" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <InterventionDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/interventions/new" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NewIntervention />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/interventions/:id" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <InterventionDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/interventions/:id/edit" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EditIntervention />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/interventions/:interventionId/actions/:id" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ActionDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
           <Route 
            path="/actions" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ActionDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ActionReports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/actions"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ActionReports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/templates"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ReportTemplates />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/templates/new"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EditTemplate />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/templates/:id/edit"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EditTemplate />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/generate/:templateId/:interventionId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <GenerateReport />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
           <Route
            path="/settings/users"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Users />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/import"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Import />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/settings/assignment"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Assignments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/roles"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Roles />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/system"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <System />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
           <Route
            path="/settings/security"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Security />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/projectspartners"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PojectsPartners />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/user-activity"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <UserActivity />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/404"
            element={<Navigate to="/" replace />}
          />

          <Route
            path="/userdashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
           <Route
            path="/issue"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Issue />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
           <Route
            path="/help"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Help />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/targets"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TargetsIndex />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/targets/tracking"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TargetTracking />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/targets/new"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NewTarget />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/targets/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TargetDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/targets/edit/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TargetDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/iframe"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <IframePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/circuit-breaker"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CircuitBreakerTest />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </Router>
    </TooltipProvider>
  );
}