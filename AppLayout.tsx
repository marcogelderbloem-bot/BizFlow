import { useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  CreditCard,
  Truck,
  FileBarChart,
  Settings,
  Bell,
  ScrollText,
  Building2,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'quotes'
  | 'invoices'
  | 'payments'
  | 'delivery-notes'
  | 'statements'
  | 'reports'
  | 'notifications'
  | 'audit'
  | 'settings';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'customers', label: 'Customers', icon: Users, roles: ['owner', 'admin', 'sales', 'accounts'] },
  { key: 'products', label: 'Products', icon: Package, roles: ['owner', 'admin', 'sales'] },
  { key: 'quotes', label: 'Quotes', icon: FileText, roles: ['owner', 'admin', 'sales'] },
  { key: 'invoices', label: 'Invoices', icon: Receipt, roles: ['owner', 'admin', 'sales', 'accounts'] },
  { key: 'payments', label: 'Payments', icon: CreditCard, roles: ['owner', 'admin', 'accounts'] },
  { key: 'delivery-notes', label: 'Delivery Notes', icon: Truck, roles: ['owner', 'admin', 'delivery'] },
  { key: 'statements', label: 'Statements', icon: FileBarChart, roles: ['owner', 'admin', 'accounts'] },
  { key: 'reports', label: 'Reports', icon: FileBarChart, roles: ['owner', 'admin', 'accounts'] },
  { key: 'notifications', label: 'Notifications', icon: Bell, roles: ['owner', 'admin'] },
  { key: 'audit', label: 'Audit Log', icon: ScrollText, roles: ['owner', 'admin'] },
  { key: 'settings', label: 'Settings', icon: Settings, roles: ['owner', 'admin'] },
];

export function AppLayout({
  current,
  onNavigate,
  children,
}: {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}) {
  const { profile, company, signOut, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !item.roles || hasRole(...item.roles));

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-700">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-display">StoicWare</p>
            <p className="text-xs text-slate-500 truncate max-w-[150px]">{company?.name || '...'}</p>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-0.5 overflow-y-auto h-[calc(100%-4rem)]">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 font-display">StoicWare</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-700">{profile?.full_name}</p>
                <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-20 animate-scale-in">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-700">{profile?.full_name}</p>
                    <p className="text-xs text-slate-400">{profile?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
