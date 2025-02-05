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
  X,
  User,
  ChevronLeft,
  ChevronRight,
  Upload,
  ShieldAlert,
  UserCog,
  Loader2,
  Settings2Icon
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
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Initialize state from localStorage or default to true
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // Load system settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .single();

        if (error) throw error;
        setSettings(data);
      } catch (err) {
        console.error('Error loading system settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard'},
    { icon: LayoutDashboard, label: 'My Tasks', path: '/userdashboard'},
    { icon: Folders, label: 'Clusters', path: '/clusters' },
    { 
      icon: Target, 
      label: 'Interventions', 
      path: '/interventions'
    },
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Settings, label: 'Settings', path: '/settings' , subItems: [
      { icon: User, label: 'User Management', path: '/settings/users' },
      { icon: UserCog, label: 'Role Management', path: '/settings/roles' },
      { icon: ShieldAlert, label: 'Security Settings', path: '/settings/security' },
      { icon: Settings2Icon, label: 'Systems Settings', path: '/settings/system' },
      { icon: Upload, label: 'Data Import', path: '/settings/import' },
    ]},
  ];

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
          isSidebarOpen ? 'w-64' : 'w-20'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-6 border-b">
            <div className="flex items-center justify-between">
              {settings?.logo_url ? (
                <div className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center w-full'}`}>
                  <img 
                    src={settings.logo_url} 
                    alt={settings.app_name}
                    className="h-10 w-10 object-contain"
                  />
                  {isSidebarOpen && (
                    <div>
                      <h1 className="text-lg font-bold text-gray-800">
                        {settings.app_name}
                      </h1>
                      {settings.tagline && (
                        <p className="text-xs text-gray-500">{settings.tagline}</p>
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
            {navItems.map((item) => (
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