import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Folders,
  Target,
  BarChart2, 
  Settings, 
  LogOut,
  Menu,
  Plus,
  ListChecks,
  X,
  User,
  FileArchive,
  UserCheck2Icon,
  FileArchiveIcon,
  FileBadge2Icon,
  Link,
  ChevronLeft,
  ChevronRight,
  Upload,
  ShieldAlert,
  UserCog,
  Loader2,
  Settings2Icon,
  AmbulanceIcon,
  ActivityIcon,
  UserCheck2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSystemSettings } from '../../hooks/useSystemSettingsQueries';

interface DashboardLayoutProps {
  children: React.ReactNode;
}



interface NavItem {
  icon: any;
  label: string;
  path: string;
  subItems?: NavItem[];
  roles?: string[];
}

// Move navItems outside component to prevent recreation on every render
const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] },
  
  { icon: Folders, label: 'Clusters', path: '/clusters', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] },
  { 
    icon: FileArchiveIcon, 
    label: 'Interventions', 
    path: '/interventions',
    roles: ['leadership', 'super_admin', 'supporting_staff', 'lead']
  },
  { 
    icon: ActivityIcon, 
    label: 'Actions', 
    path: '/actions',
    roles: ['leadership', 'super_admin', 'supporting_staff', 'lead']
  },
  { icon: UserCheck2Icon, label: 'My Tasks', path: '/userdashboard', roles: ['supporting_staff', 'lead', 'super_admin', 'leadership']},
  { icon: FileBadge2Icon, label: 'Reports', path: '/reports', roles: ['lead', 'super_admin', 'leadership'] },
  { icon: BarChart2, label: 'Metrics Dashboard', path: '/iframe', roles: ['lead', 'super_admin', 'leadership'] },
  // { icon: Briefcase, label: 'Jobs', path: '/jobs', roles: ['lead', 'super_admin', 'leadership'] },
  { 
    icon: Target,
    label: 'Targets',
    path: '/targets',
    roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'],
    // subItems: [
    //   { icon: LayoutDashboard, label: 'Dashboard', path: '/targets', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] },
    //   { icon: ListChecks, label: 'Target Tracking', path: '/targets/tracking', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] },
    //   { icon: Plus, label: 'New Target', path: '/targets/new', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] }
    // ]
  },
  
  { icon: ShieldAlert, label: 'Issue Registry', path: '/issue', roles: ['supporting_staff','super_admin','leadership', 'lead']},
  { 
    icon: Settings, 
    label: 'Settings', 
    path: '/settings',
    roles: ['super_admin', 'lead'],
    subItems: [
      { icon: User, label: 'User Management', path: '/settings/users', roles: ['super_admin'] },
      { icon: UserCog, label: 'Role Management', path: '/settings/roles', roles: ['super_admin'] },
      {icon: UserCheck2, label: 'User Activity', path: '/settings/user-activity', roles: ['super_admin']},
      { icon: UserCheck2Icon, label: 'Batch Assignment', path: '/settings/assignment', roles: ['super_admin'] },
      { icon: Link, label: 'Projects/partners', path: '/settings/projectspartners', roles: ['super_admin', 'lead'] },
      { icon: ShieldAlert, label: 'Security Settings', path: '/settings/security', roles: ['super_admin'] },
      { icon: Settings2Icon, label: 'Systems Settings', path: '/settings/system', roles: ['super_admin'] },
      { icon: Upload, label: 'Data Import', path: '/settings/import', roles: ['super_admin'] },
    ]
  },
  { icon: AmbulanceIcon, label: 'Help', path: '/help', roles: ['lead', 'super_admin', 'leadership', 'supporting_staff'] },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // Load user role - optimized to prevent unnecessary re-fetching
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.role) {
          setUserRole(user.user_metadata.role);
        }
      } catch (err) {
        console.error('Error loading user:', err);
      }
    };

    loadUser();
  }, []); // Empty dependency array to prevent re-fetching

  // Memoized event handlers to prevent recreation on every render
  const handleLogout = useCallback(async () => {
    const {error } = await supabase.auth.signOut();
    // Redirect to login page after sign out
    // You can use the navigate function from react-router-dom to do this
    if(error) throw error;

    navigate('/login');
  }, [navigate]);

  // Memoized filtered navigation items to prevent recalculation on every render
  const filteredNavItems = useMemo(() => {
    if (!userRole) return [];
    
    return NAV_ITEMS.filter(item => {
      if (!item.roles) return false;
      if (item.roles.includes(userRole)) {
        if (item.subItems) {
          // Create a new object to avoid mutating the original
          const filteredItem = { ...item };
          filteredItem.subItems = item.subItems.filter(subItem => 
            subItem.roles && subItem.roles.includes(userRole)
          );
          return filteredItem;
        }
        return true;
      }
      return false;
    }).map(item => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(subItem => 
            subItem.roles && subItem.roles.includes(userRole)
          )
        };
      }
      return item;
    });
  }, [userRole]);

  // Memoized isActivePath function to prevent recreation
  const isActivePath = useCallback((path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Add state for expanded menu items
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Memoized toggleSubmenu function
  const toggleSubmenu = useCallback((path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  }, []);

  // Update the navigation section
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="fixed top-0 right-0 left-0 bg-white shadow-sm z-50 h-16">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>

            {/* App name */}
            {settings?.app_name && (
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
                {settings.app_name}
              </h1>
            )}
          </div>

          {/* User actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/settings/profile')}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center space-x-2"
            >
              <User className="h-5 w-5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center space-x-2"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white shadow-lg transition-all duration-300 ease-in-out mt-16 overflow-y-auto max-h-[calc(100vh-4rem)] ${
          isSidebarOpen ? 'w-64' : 'w-24'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              {settings?.logo_url ? (
                <div className={`flex ${isSidebarOpen ? 'flex-col items-center' : 'justify-center w-full'}`}>
                  <img 
                    src={settings.logo_url} 
                    alt={settings.app_name}
                    className="w-full h-full object-contain transition-all duration-200" 
                  />
                </div>
              ) : settingsLoading ? (
                <div className={`${isSidebarOpen ? 'w-full' : 'mx-auto'}`}>
                  <Loader2 className="h-16 w-16 animate-spin text-gray-400" />
                </div>
              ) : null}
              {/* Toggle button - only show on desktop */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:block p-2 rounded-md hover:bg-gray-100"
              >
                {isSidebarOpen ? (
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-2 w-2 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavItems.map((item) => (
              <div key={item.path} className="relative group">
                <button
                  onClick={() => item.subItems ? toggleSubmenu(item.path) : navigate(item.path)}
                  className={`flex items-center w-full px-4 py-2 text-gray-700 rounded-md transition-colors ${
                    isActivePath(item.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                  title={!isSidebarOpen ? item.label : undefined}
                >
                  <item.icon className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                  <span className={`transition-opacity duration-300 flex-1 text-left ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                  }`}>
                    {item.label}
                  </span>
                  {item.subItems && isSidebarOpen && (
                    <ChevronRight className={`h-4 w-4 transition-transform ${
                      expandedItems.includes(item.path) ? 'rotate-90' : ''
                    }`} />
                  )}
                </button>
                
                {item.subItems && (
                  <div className={`ml-4 mt-1 space-y-1 ${expandedItems.includes(item.path) ? 'block' : 'hidden'} ${!isSidebarOpen ? 'absolute left-full top-0 w-48 bg-white border rounded-md shadow-lg group-hover:block z-50' : ''}`}>
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => navigate(subItem.path)}
                        className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 rounded-md transition-colors ${
                          isActivePath(subItem.path)
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <subItem.icon className="h-4 w-4 mr-3" />
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className={`transition-all duration-300 pt-14 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}>
        <div className="p-2">{children}</div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}