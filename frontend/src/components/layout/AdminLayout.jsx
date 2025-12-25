import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Smartphone,
  Users,
  Package,
  Ticket,
  Activity,
  BarChart3,
  Settings,
  Bell,
  FileText,
  LogOut,
  Menu,
  X,
  Wifi,
  User,
  ChevronDown
} from "lucide-react";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Detect mobile screen
  useState(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const menuItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Payments", path: "/admin/payments", icon: CreditCard },
    { name: "Devices", path: "/admin/devices", icon: Smartphone },
    { name: "Customers", path: "/admin/customers", icon: Users },
    { name: "Packages", path: "/admin/packages", icon: Package },
    { name: "Vouchers", path: "/admin/vouchers", icon: Ticket },
    { name: "Sessions", path: "/admin/sessions", icon: Activity },
    { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { name: "Audit Logs", path: "/admin/audit-logs", icon: FileText },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile 
            ? "w-64 " + (sidebarOpen ? "translate-x-0" : "-translate-x-full")
            : (sidebarOpen ? "w-64" : "w-20")
        } bg-gradient-to-b from-blue-900 to-indigo-900 text-white transition-all duration-300 fixed h-screen z-30 shadow-2xl`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <Wifi className="w-8 h-8 text-blue-300" />
                <span className="font-bold text-lg">Oneal WiFi</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-blue-800 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-blue-800 rounded transition-colors mx-auto"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-blue-100 hover:bg-blue-800"
                }`}
                title={!sidebarOpen ? item.name : ""}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate">{adminUser.username || 'Admin'}</p>
                <p className="text-xs text-blue-300 capitalize">{adminUser.role || 'admin'}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 ${
          isMobile ? "ml-0" : sidebarOpen ? "ml-64" : "ml-20"
        } transition-all duration-300 min-h-screen flex flex-col overflow-x-hidden max-w-full`}
      >
        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-20 w-full overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            )}
            <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 truncate">
              {menuItems.find((item) => item.path === location.pathname)?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="font-semibold text-sm">{adminUser.username}</p>
                    <p className="text-xs text-gray-500">{adminUser.email}</p>
                  </div>
                  <Link
                    to="/admin/profile"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Profile</span>
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 w-full overflow-x-hidden">
          <div className="max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
