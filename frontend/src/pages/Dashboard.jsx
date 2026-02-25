/**
 * Dashboard Page - ALMoheat Accounting System
 * Professional UI with Modern Styling
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Users,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Calculator,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { getProducts, getClients, getInvoices, getExpenses } from '../lib/api';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalClients: 0,
    totalInvoices: 0,
    totalSales: 0,
    totalExpenses: 0,
    totalIncome: 0,
    netProfit: 0,
    lowStockProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [productsRes, clientsRes, invoicesRes, expensesRes] = await Promise.all([
        getProducts(),
        getClients(),
        getInvoices(),
        getExpenses(),
      ]);

      const products = productsRes.data;
      const clients = clientsRes.data;
      const invoices = invoicesRes.data;
      const expenses = expensesRes.data;

      // Calculate totals
      const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalExpenses = expenses
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalIncome = expenses
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Find low stock products (less than 5)
      const lowStockProducts = products.filter(p => (p.stock_count || 0) < 5).slice(0, 5);

      setStats({
        totalProducts: products.length,
        totalClients: clients.length,
        totalInvoices: invoices.length,
        totalSales,
        totalExpenses,
        totalIncome,
        netProfit: totalSales - totalExpenses + totalIncome,
        lowStockProducts,
      });
    } catch (error) {
      toast.error('فشل في تحميل بيانات لوحة التحكم');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-';
    return parseFloat(num).toLocaleString('ar-SA', { maximumFractionDigits: 2 });
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick, subtitle, bgColor }) => (
    <div 
      className={`stat-card cursor-pointer ${onClick ? 'hover:border-indigo-200' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>
            {loading ? (
              <div className="w-6 h-4 bg-slate-200 rounded animate-pulse" />
            ) : value}
          </p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`stat-card-icon ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="section-header">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Calculator className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">لوحة التحكم</h1>
            <p className="text-sm text-slate-500">نظرة عامة على نظام المحاسبة</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المنتجات"
          value={stats.totalProducts}
          icon={Package}
          color="text-blue-600"
          bgColor="bg-blue-100"
          onClick={() => navigate('/products')}
          subtitle="اضغط للإدارة"
        />
        <StatCard
          title="إجمالي العملاء"
          value={stats.totalClients}
          icon={Users}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
          onClick={() => navigate("/clients")}
          subtitle="اضغط للإدارة"
        />
        <StatCard
          title="إجمالي الفواتير"
          value={stats.totalInvoices}
          icon={FileText}
          color="text-purple-600"
          bgColor="bg-purple-100"
          onClick={() => navigate('/invoices')}
          subtitle="اضغط للإدارة"
        />
        <StatCard
          title="إجمالي المبيعات"
          value={formatNumber(stats.totalSales)}
          icon={TrendingUp}
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
      </div>

      {/* Financial Summary & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Summary */}
        <div className="lg:col-span-2 pro-card">
          <div className="pro-card-header">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">الملخص المالي</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                <p className="text-sm text-slate-600 mb-1">إجمالي المبيعات</p>
                <p className="text-xl font-bold text-emerald-600">
                  {loading ? (
                    <div className="w-20 h-6 bg-emerald-200 rounded animate-pulse mx-auto" />
                  ) : formatNumber(stats.totalSales)}
                </p>
              </div>
              <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100">
                <p className="text-sm text-slate-600 mb-1">إجمالي المصروفات</p>
                <p className="text-xl font-bold text-rose-600">
                  {loading ? (
                    <div className="w-20 h-6 bg-rose-200 rounded animate-pulse mx-auto" />
                  ) : formatNumber(stats.totalExpenses)}
                </p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${stats.netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                <p className="text-sm text-slate-600 mb-1">صافي الربح</p>
                <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {loading ? (
                    <div className={`w-20 h-6 rounded animate-pulse mx-auto ${stats.netProfit >= 0 ? 'bg-blue-200' : 'bg-orange-200'}`} />
                  ) : formatNumber(stats.netProfit)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="pro-card">
          <div className="pro-card-header">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900">تنبيهات المخزون</h3>
            </div>
          </div>
          <div className="p-6">
            {stats.lowStockProducts.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-slate-500">لا توجد منتجات منخفضة المخزون</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.lowStockProducts.map(product => (
                  <div key={product._id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-sm font-medium text-slate-700">{product.name}</span>
                    <span className="text-sm text-amber-600 font-semibold">
                      {product.stock_count} متبقي
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate("/products")}              className="w-full mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center justify-center gap-1"
            >
              عرض كل المنتجات
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pro-card">
        <div className="pro-card-header">
          <h3 className="font-bold text-slate-900">إجراءات سريعة</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/invoices")}              className="h-24 flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="font-medium text-slate-700">فاتورة جديدة</span>
            </button>
            <button
              onClick={() => navigate("/products")}
              className="h-24 flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-all"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="font-medium text-slate-700">إضافة منتج</span>
            </button>
            <button
              onClick={() => navigate("/clients")}
              className="h-24 flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium text-slate-700">إضافة عميل</span>
            </button>
            <button
              onClick={() => navigate("/reports")}
              className="h-24 flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <span className="font-medium text-slate-700">التقارير</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;