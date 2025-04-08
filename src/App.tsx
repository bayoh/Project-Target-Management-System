import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginForm } from './components/auth/LoginForm';
import { PasswordReset } from './components/auth/PasswordReset';
import { UpdatePassword } from './components/auth/UpdatePassword';
import { Dashboard } from './pages/Dashboard';
import { Clusters } from './pages/Clusters';
import { NewCluster } from './pages/NewCluster';
import { ViewCluster } from './pages/ViewCluster';
import { EditCluster } from './pages/EditCluster';
import { InterventionDashboard } from './pages/interventions/InterventionDashboard';
import { NewIntervention } from './pages/interventions/NewIntervention';
import { InterventionDetails } from './pages/interventions/InterventionDetails';
import { EditIntervention } from './pages/interventions/EditIntervention';
import { ActionDetails } from './pages/actions/ActionDetails';
import { Reports } from "./pages/reports/Reports";
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
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { User } from './types/auth';
import { MyDashboard } from './pages/UserDashboard';
import { PojectsPartners } from './pages/settings/PojectsPartners';
import { Issue } from './pages/issues';
import Help from './pages/Help';
import TargetTracking from './pages/targets/TargetTracking';
import NewTarget from './pages/targets/NewTarget';
import TargetDetail from './pages/targets/TargetDetail';
import TargetsIndex from './pages/targets/index';
import Actions, { ActionDashboard } from './pages/actions/ActionDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user as User || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(event);
      if (event === 'PASSWORD_RECOVERY') {
        // Don't update user state for password recovery
        return;
      }
      setUser(session?.user as User || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
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
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <LoginForm />} />
          
        <Route 
          path="/reset-password" 
          element={user ? <Navigate to="/" replace /> : <PasswordReset /> }/>

        <Route 
          path="/update-password" 
          element={user ? <Navigate to="/" replace /> : <UpdatePassword /> }/>
        <Route 
          path="/" 
          element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/clusters" 
          element={user ? <Clusters /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/clusters/new" 
          element={user ? <NewCluster /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/clusters/:id" 
          element={user ? <ViewCluster /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/clusters/:id/edit" 
          element={user ? <EditCluster /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/interventions" 
          element={user ? <InterventionDashboard /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/interventions/new" 
          element={user ? <NewIntervention /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/interventions/:id" 
          element={user ? <InterventionDetails /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/interventions/:id/edit" 
          element={user ? <EditIntervention /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/interventions/:interventionId/actions/:id" 
          element={user ? <ActionDetails /> : <Navigate to="/login" replace />} 
        />
         <Route 
          path="/actions" 
          element={user ? <ActionDashboard /> : <Navigate to="/login" replace />} 
        />
        <Route
          path="/reports"
          element={user ? <ActionReports /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/reports/actions"
          element={user ? <ActionReports /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/reports/templates"
          element={user ? <ReportTemplates /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/reports/templates/new"
          element={user ? <EditTemplate /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/reports/templates/:id/edit"
          element={user ? <EditTemplate /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/reports/generate/:templateId/:interventionId"
          element={user ? <GenerateReport /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={user ? <Settings /> : <Navigate to="/login" replace />}
        />
         <Route
          path="/settings/users"
          element={user ? <Users /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/import"
          element={user ? <Import /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/assignment"
          element={user ? <Assignments /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/roles"
          element={user ? <Roles /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/system"
          element={user ? <System /> : <Navigate to="/login" replace />}
        />
         <Route
          path="/settings/security"
          element={user ? <Security /> : <Navigate to="/login" replace />}
        />
        
        <Route
          path="/settings/profile"
          element={user ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/projectspartners"
          element={user ? <PojectsPartners /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/404"
          element={<Navigate to="/" replace />}
        />

        <Route
          path="/userdashboard"
          element={ user ? <MyDashboard/> : <Navigate to="/" replace />}

        />
         <Route
          path="/issue"
          element={ user ? <Issue/> : <Navigate to="/" replace />}

        />
         <Route
          path="/help"
          element={ user ? <Help/> : <Navigate to="/" replace />}

        />

        <Route
          path="/targets"
          element={user ? <TargetsIndex /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/targets/tracking"
          element={user ? <TargetTracking /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/targets/new"
          element={user ? <NewTarget /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/targets/:id"
          element={user ? <TargetDetail /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/targets/edit/:id"
          element={user ? <TargetDetail /> : <Navigate to="/login" replace />}
        />

        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  );
}