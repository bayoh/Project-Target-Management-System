import React from 'react';
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
  UserCheck2Icon,
  FileArchiveIcon,
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
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface SystemSettings {
  app_name: string;
  tagline: string;
  logo_url: string | null;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
  subItems?: NavItem[];
  roles?: string[];
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // Load user role and system settings
  useEffect(() => {
    const loadUserAndSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.role) {
          setUserRole(user.user_metadata.role);
        }

        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .single();

        if (error) throw error;
        setSettings(data);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndSettings();
  }, []);

  const handleLogout = async () => {
    const {error } = await supabase.auth.signOut();
    // Redirect to login page after sign out
    // You can use the navigate function from react-router-dom to do this
    if(error) throw error;

    navigate('/login');
  };

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['supporting_staff', 'lead', 'super_admin', 'leadership']},
    { icon: Folders, label: 'Clusters', path: '/clusters', roles: ['supporting_staff', 'lead', 'super_admin', 'leadership'] },
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
    { icon: BarChart2, label: 'Reports', path: '/reports', roles: ['lead', 'super_admin', 'leadership'] },
    { 
      icon: Target,
      label: 'Targets',
      path: '/targets',
      roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'],
      subItems: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/targets', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] },
        { icon: ListChecks, label: 'Target Tracking', path: '/targets/tracking', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] },
        { icon: Plus, label: 'New Target', path: '/targets/new', roles: ['leadership', 'super_admin', 'supporting_staff', 'lead'] }
      ]
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
        { icon: UserCheck2Icon, label: 'Batch Assignment', path: '/settings/assignment', roles: ['super_admin'] },
        { icon: Link, label: 'Projects/partners', path: '/settings/projectspartners', roles: ['super_admin', 'lead'] },
        { icon: ShieldAlert, label: 'Security Settings', path: '/settings/security', roles: ['super_admin'] },
        { icon: Settings2Icon, label: 'Systems Settings', path: '/settings/system', roles: ['super_admin'] },
        { icon: Upload, label: 'Data Import', path: '/settings/import', roles: ['super_admin'] },
      ]
    },
    { icon: AmbulanceIcon, label: 'Help', path: '/help', roles: ['lead', 'super_admin', 'leadership', 'supporting_staff'] },
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!userRole || !item.roles) return false;
    if (item.roles.includes(userRole)) {
      if (item.subItems) {
        item.subItems = item.subItems.filter(subItem => 
          subItem.roles && subItem.roles.includes(userRole)
        );
      }
      return true;
    }
    return false;
  });

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Add state for expanded menu items
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleSubmenu = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  // Update the navigation section
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md bg-white shadow-md"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white shadow-lg transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-24'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              {settings?.logo_url ? (
                <div className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center w-full'}`}>
                  <div className='row-span-3'>
                  <img 
                    src={settings.logo_url} 
                    alt={settings.app_name}
                    className="h-62 w-62 object-contain" 
                  />
                  </div>
                  {isSidebarOpen && (
                    <div>
                      <h1 className="text-[12px] font-semibold text-gray-800">
                        {settings.app_name}
                      </h1>
                      {settings.tagline && (
                        <p className="col-span-2 text-[8px] text-gray-500">{settings.tagline}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : loading ? (
                <div className={`${isSidebarOpen ? 'w-full' : 'mx-auto'}`}>
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
              <div key={item.path}>
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
                
                {item.subItems && expandedItems.includes(item.path) && isSidebarOpen && (
                  <div className="ml-4 mt-1 space-y-1">
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

          <div className={`p-4 border-t space-y-2 ${isSidebarOpen ? '' : 'px-2'}`}>
            <button
              onClick={() => navigate('/settings/profile')}
              className={`flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors`}
              title={!isSidebarOpen ? 'Profile' : undefined}
            >
              <User className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} />
              <span className={`transition-opacity duration-300 ${
                isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              }`}>
                Profile
              </span>
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors`}
              title={!isSidebarOpen ? 'Sign out' : undefined}
            >
              <LogOut className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} />
              <span className={`transition-opacity duration-300 ${
                isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              }`}>
                Sign out
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}>
        <div className="p-6">{children}</div>
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