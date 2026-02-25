/**
 * Layout Component - ALMoheat Accounting System
 * Modern Sidebar with Professional Styling
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  FileText,
  BarChart3,
  Wallet,
  Menu,
  Calculator,
  ChevronRight,
  TrendingUp,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from 'sonner';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'المنتجات', path: '/products', icon: Package },
    { name: 'العملاء', path: '/clients', icon: Users },
    { name: 'الفواتير', path: '/invoices', icon: FileText },
    { name: 'المصروفات', path: '/expenses', icon: Wallet },
    { name: 'التقارير', path: '/reports', icon: BarChart3 },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">ALMoheat</h1>
            <p className="text-xs text-slate-500">نظام المحاسبة المتكامل</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-right ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <ChevronRight className="h-4 w-4 mr-auto" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span>النظام يعمل بكفاءة</span>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 mt-3">
          ALMoheat v2.0
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Sidebar */}
        <aside className="w-72 h-screen bg-white border-l border-slate-200 fixed right-0 top-0 z-40">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 mr-72 min-h-screen p-6">
          {children}
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">ALMoheat</h1>
          </div>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                <Menu className="h-6 w-6 text-slate-600" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 border-l border-slate-200">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Mobile Main Content */}
        <main className="min-h-screen p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;