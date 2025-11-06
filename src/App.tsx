import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginForm } from './components/auth/LoginForm';
import { PasswordReset } from './components/auth/PasswordReset';
import { UpdatePassword } from './components/auth/UpdatePassword';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { TooltipProvider } from './components/ui/tooltip';
import { useAuth } from './lib/auth.tsx';

// Lazy load route components for code splitting
// Helper to handle both default and named exports
const lazyNamed = (importFn: () => Promise<{ [key: string]: React.ComponentType<unknown> }>, exportName: string) =>
  lazy(() => importFn().then(module => ({ default: module[exportName] || module.default })));

const Clusters = lazyNamed(() => import('./pages/Clusters'), 'Clusters');
const NewCluster = lazyNamed(() => import('./pages/NewCluster'), 'NewCluster');
const ViewCluster = lazyNamed(() => import('./pages/ViewCluster'), 'ViewCluster');
const EditCluster = lazyNamed(() => import('./pages/EditCluster'), 'EditCluster');
const InterventionDashboard = lazyNamed(() => import('./pages/interventions/InterventionDashboard'), 'InterventionDashboard');
const NewIntervention = lazyNamed(() => import('./pages/interventions/NewIntervention'), 'NewIntervention');
const InterventionDetails = lazyNamed(() => import('./pages/interventions/InterventionDetails'), 'InterventionDetails');
const EditIntervention = lazyNamed(() => import('./pages/interventions/EditIntervention'), 'EditIntervention');
const ActionDetails = lazyNamed(() => import('./pages/actions/ActionDetails'), 'ActionDetails');
const ActionReports = lazyNamed(() => import('./pages/reports/ActionReports'), 'ActionReports');
const ReportTemplates = lazyNamed(() => import('./pages/reports/ReportTemplates'), 'ReportTemplates');
const Settings = lazyNamed(() => import('./pages/settings/Settings'), 'Settings');
const Profile = lazyNamed(() => import('./pages/settings/Profile'), 'Profile');
const Assignments = lazyNamed(() => import('./pages/settings/Assignments'), 'Assignments');
const EditTemplate = lazyNamed(() => import('./pages/reports/EditTemplate'), 'EditTemplate');
const GenerateReport = lazyNamed(() => import('./pages/reports/GenerateReport'), 'GenerateReport');
const Import = lazyNamed(() => import('./pages/settings/Import'), 'Import');
const Roles = lazyNamed(() => import('./pages/settings/Role'), 'Roles');
const System = lazyNamed(() => import('./pages/settings/System'), 'System');
const Security = lazyNamed(() => import('./pages/settings/Security'), 'Security');
const Users = lazyNamed(() => import('./pages/settings/Users'), 'Users');
const MyDashboard = lazyNamed(() => import('./pages/UserDashboard'), 'MyDashboard');
const ProjectsPartners = lazyNamed(() => import('./pages/settings/ProjectsPartners'), 'ProjectsPartners');
const Issue = lazyNamed(() => import('./pages/issues'), 'Issue');
const Help = lazy(() => import('./pages/Help'));
const TargetTracking = lazy(() => import('./pages/targets/TargetTracking'));
const ActionDashboard = lazyNamed(() => import('./pages/actions/ActionDashboard'), 'ActionDashboard');
const Jobs = lazyNamed(() => import('./pages/jobs'), 'Jobs');
const UserActivity = lazy(() => import('./pages/admin/UserActivity'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const IframePage = lazyNamed(() => import('./pages/IframePage'), 'IframePage');
const CircuitBreakerTest = lazyNamed(() => import('./pages/CircuitBreakerTest'), 'CircuitBreakerTest');

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

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
        <Suspense fallback={<LoadingFallback />}>
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
            element={<UpdatePassword />}/>
          
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
                  <ProjectsPartners />
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
                  <TargetTracking />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/targets/tracking"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TargetTracking />
                </DashboardLayout>
              </ProtectedRoute>
            }
          /> */}
          {/* <Route
            path="/targets/new"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NewTarget />
                </DashboardLayout>
              </ProtectedRoute>
            }
          /> */}
          {/* <Route
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
          /> */}
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
        </Suspense>
      </Router>
    </TooltipProvider>
  );
}