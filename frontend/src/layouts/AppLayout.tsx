import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Clock,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['administrator', 'manager', 'cashier', 'inventory_clerk', 'accountant'] },
    { label: 'POS / Sales', path: '/pos', icon: ShoppingCart, roles: ['administrator', 'manager', 'cashier'] },
    { label: 'Products', path: '/products', icon: Package, roles: ['administrator', 'manager', 'cashier', 'inventory_clerk'] },
    { label: 'Inventory', path: '/inventory', icon: Boxes, roles: ['administrator', 'manager', 'inventory_clerk'] },
    { label: 'Customers', path: '/customers', icon: Users, roles: ['administrator', 'manager', 'cashier', 'accountant'] },
    { label: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['administrator', 'manager', 'inventory_clerk', 'accountant'] },
    { label: 'Expenses', path: '/expenses', icon: Receipt, roles: ['administrator', 'manager', 'accountant'] },
    { label: 'Register Shifts', path: '/shifts', icon: Clock, roles: ['administrator', 'manager', 'cashier', 'accountant'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['administrator', 'manager', 'accountant', 'inventory_clerk'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['administrator', 'manager'] },
  ];

  const userRole = (user?.role || '').toLowerCase();
  const allowedNav = navItems.filter((item) => item.roles.includes(userRole) || userRole === 'administrator');

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">SBMS</h1>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Business Suite</span>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-emerald-400 font-medium capitalize truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 hidden sm:block">
              Small Business Management System
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-mono border border-slate-200">
              API: Online
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
