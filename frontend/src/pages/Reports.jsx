/**
 * Reports Page - ALMoheat Accounting System
 * Professional UI with Modern Styling
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Package, 
  TrendingUp, 
  User, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Hash,
  Weight,
  Eye,
  BarChart3,
  Wallet
} from 'lucide-react';
import { 
  getAccountStatement, 
  getInventoryReport, 
  getFinancialReport, 
  getClients,
  downloadBackup 
} from '../lib/api';
import { toast } from 'sonner';

const Reports = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Account Statement State
  const [selectedClient, setSelectedClient] = useState('');
  const [statementStartDate, setStatementStartDate] = useState('');
  const [statementEndDate, setStatementEndDate] = useState('');
  const [accountStatement, setAccountStatement] = useState(null);
  const [expandedInvoices, setExpandedInvoices] = useState({});
  
  // Inventory Report State
  const [inventoryStartDate, setInventoryStartDate] = useState('');
  const [inventoryEndDate, setInventoryEndDate] = useState('');
  const [inventoryReport, setInventoryReport] = useState(null);
  
  // Financial Report State
  const [financialStartDate, setFinancialStartDate] = useState('');
  const [financialEndDate, setFinancialEndDate] = useState('');
  const [financialReport, setFinancialReport] = useState(null);

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      toast.error('فشل في تحميل قائمة العملاء');
      console.error(error);
    }
  };

  // ==================== ACCOUNT STATEMENT ====================

  const fetchAccountStatement = async () => {
    if (!selectedClient) {
      toast.error('الرجاء اختيار العميل');
      return;
    }

    try {
      setLoading(true);
      const params = {};
      if (statementStartDate && statementEndDate) {
        params.start_date = new Date(statementStartDate).toISOString();
        params.end_date = new Date(statementEndDate).toISOString();
      }
      
      const response = await getAccountStatement(selectedClient, params);
      setAccountStatement(response.data);
    } catch (error) {
      toast.error('فشل في تحميل كشف الحساب');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  // ==================== INVENTORY REPORT ====================

  const fetchInventoryReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (inventoryStartDate && inventoryEndDate) {
        params.start_date = new Date(inventoryStartDate).toISOString();
        params.end_date = new Date(inventoryEndDate).toISOString();
      }
      
      const response = await getInventoryReport(params);
      setInventoryReport(response.data);
    } catch (error) {
      toast.error('فشل في تحميل تقرير المخزون');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FINANCIAL REPORT ====================

  const fetchFinancialReport = async () => {
    if (!financialStartDate || !financialEndDate) {
      toast.error('الرجاء تحديد نطاق التاريخ');
      return;
    }

    try {
      setLoading(true);
      const params = {
        start_date: new Date(financialStartDate).toISOString(),
        end_date: new Date(financialEndDate).toISOString(),
      };
      
      const response = await getFinancialReport(params);
      setFinancialReport(response.data);
    } catch (error) {
      toast.error('فشل في تحميل التقرير المالي');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== BACKUP ====================

  const handleDownloadBackup = async () => {
    try {
      setLoading(true);
      const response = await downloadBackup();
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ALMoheat_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('تم تحميل النسخة الاحتياطية بنجاح');
    } catch (error) {
      toast.error('فشل في تحميل النسخة الاحتياطية');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-';
    return parseFloat(num).toLocaleString('ar-SA', { maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">التقارير والإحصائيات</h1>
          <p className="text-sm text-slate-500">كشوفات حسابات وتقارير مالية</p>
        </div>
      </div>

      <Tabs defaultValue="statement" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="statement" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
            <User className="h-4 w-4 ml-2" />
            كشف الحساب
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
            <Package className="h-4 w-4 ml-2" />
            المخزون
          </TabsTrigger>
          <TabsTrigger value="financial" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
            <TrendingUp className="h-4 w-4 ml-2" />
            المالي
          </TabsTrigger>
          <TabsTrigger value="backup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
            <Download className="h-4 w-4 ml-2" />
            نسخة احتياطية
          </TabsTrigger>
        </TabsList>

        {/* ==================== ACCOUNT STATEMENT TAB ==================== */}
        <TabsContent value="statement" className="mt-6">
          <div className="pro-card">
            <div className="pro-card-header">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-indigo-600" />
                كشف حساب العميل
              </CardTitle>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="pro-label">العميل</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="pro-input">
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="pro-label">من تاريخ</Label>
                  <Input
                    type="date"
                    value={statementStartDate}
                    onChange={(e) => setStatementStartDate(e.target.value)}
                    className="pro-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="pro-label">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={statementEndDate}
                    onChange={(e) => setStatementEndDate(e.target.value)}
                    className="pro-input"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchAccountStatement}
                    disabled={loading}
                    className="pro-btn-primary w-full"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    عرض الكشف
                  </button>
                </div>
              </div>

              {/* Client Info */}
              {accountStatement?.client && (
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-slate-500">اسم العميل:</span>
                      <span className="font-bold text-slate-900 mr-2">{accountStatement.client.name}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">رقم الهاتف:</span>
                      <span className="font-bold text-slate-900 mr-2">{accountStatement.client.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">الرصيد الحالي:</span>
                      <span className={`font-bold mr-2 ${accountStatement.client.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatNumber(accountStatement.client.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoices Table with Expandable Items */}
              {accountStatement?.invoices && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="pro-table">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="w-10"></th>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>عدد المنتجات</th>
                        <th>الخصم</th>
                        <th>الإجمالي</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountStatement.invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500">
                            لا توجد فواتير للفترة المحددة
                          </td>
                        </tr>
                      ) : (
                        accountStatement.invoices.map((invoice) => (
                          <React.Fragment key={invoice._id}>
                            <tr className="hover:bg-slate-50">
                              <td>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleInvoiceExpand(invoice._id)}
                                  className="hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                  {expandedInvoices[invoice._id] ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </td>
                              <td className="font-semibold">{invoice.invoice_number}</td>
                              <td>{formatDate(invoice.date)}</td>
                              <td>
                                <span className="pro-badge-slate">
                                  {invoice.items?.length || 0} منتج
                                </span>
                              </td>
                              <td>{formatNumber(invoice.discount)}</td>
                              <td className="font-bold text-emerald-600">
                                {formatNumber(invoice.total)}
                              </td>
                              <td>
                                <button
                                  onClick={() => toggleInvoiceExpand(invoice._id)}
                                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                                >
                                  {expandedInvoices[invoice._id] ? 'إخفاء' : 'عرض المنتجات'}
                                </button>
                              </td>
                            </tr>

                            {expandedInvoices[invoice._id] && (
                              <tr className="bg-indigo-50/30">
                                <td colSpan={7} className="p-0">
                                  <div className="p-4">
                                    <h4 className="font-semibold mb-3 text-sm text-slate-700">
                                      تفاصيل المنتجات في الفاتورة:
                                    </h4>
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                      <table className="pro-table">
                                        <thead>
                                          <tr className="bg-slate-50">
                                            <th>اسم المنتج</th>
                                            <th>وحدة البيع</th>
                                            <th>الكمية</th>
                                            <th>سعر الوحدة</th>
                                            <th>الإجمالي</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {invoice.items?.map((item, idx) => (
                                            <tr key={idx}>
                                              <td className="font-medium">{item.product_name}</td>
                                              <td>
                                                {item.sale_unit === 'count' ? (
                                                  <span className="pro-badge-slate">
                                                    <Hash className="h-3 w-3" />
                                                    عدد
                                                  </span>
                                                ) : (
                                                  <span className="pro-badge-indigo">
                                                    <Weight className="h-3 w-3" />
                                                    وزن
                                                  </span>
                                                )}
                                              </td>
                                              <td>
                                                {formatNumber(item.quantity)}
                                                {item.sale_unit === 'weight' && ' كغ'}
                                              </td>
                                              <td>{formatNumber(item.unit_price)}</td>
                                              <td className="font-semibold text-emerald-600">
                                                {formatNumber(item.total)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </div>
        </TabsContent>

        {/* ==================== INVENTORY REPORT TAB ==================== */}
        <TabsContent value="inventory" className="mt-6">
          <div className="pro-card">
            <div className="pro-card-header">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-indigo-600" />
                تقرير المخزون
              </CardTitle>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="pro-label">من تاريخ (إنشاء/تعديل)</Label>
                  <Input
                    type="date"
                    value={inventoryStartDate}
                    onChange={(e) => setInventoryStartDate(e.target.value)}
                    className="pro-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="pro-label">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={inventoryEndDate}
                    onChange={(e) => setInventoryEndDate(e.target.value)}
                    className="pro-input"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={fetchInventoryReport}
                    disabled={loading}
                    className="pro-btn-primary flex-1"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    عرض
                  </button>
                  <button
                    onClick={() => {
                      setInventoryStartDate('');
                      setInventoryEndDate('');
                      fetchInventoryReport();
                    }}
                    className="pro-btn-secondary"
                  >
                    الكل
                  </button>
                </div>
              </div>

              {/* Summary */}
              {inventoryReport?.summary && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                    <div className="text-sm text-slate-600 mb-1">إجمالي المنتجات</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {inventoryReport.summary.total_products}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                    <div className="text-sm text-slate-600 mb-1">القيمة (تكلفة)</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatNumber(inventoryReport.summary.total_value_cost)}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                    <div className="text-sm text-slate-600 mb-1">القيمة (بيع)</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatNumber(inventoryReport.summary.total_value_price)}
                    </div>
                  </div>
                </div>
              )}

              {/* Products Table */}
              {inventoryReport?.products && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="pro-table">
                    <thead>
                      <tr className="bg-slate-50">
                        <th>اسم المنتج</th>
                        <th>نوع الوحدة</th>
                        <th>سعر التكلفة</th>
                        <th>سعر البيع</th>
                        <th>الكمية (عدد)</th>
                        <th>الكمية (وزن)</th>
                        <th>القيمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryReport.products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500">
                            لا توجد منتجات للفترة المحددة
                          </td>
                        </tr>
                      ) : (
                        inventoryReport.products.map((product) => (
                          <tr key={product._id}>
                            <td className="font-semibold">{product.name}</td>
                            <td>
                              {product.unit_type === 'dual' ? (
                                <span className="pro-badge-indigo">
                                  ثنائية ({product.weight_per_unit} كغ)
                                </span>
                              ) : (
                                <span className="pro-badge-slate">بسيطة</span>
                              )}
                            </td>
                            <td>{formatNumber(product.cost)}</td>
                            <td>{formatNumber(product.price)}</td>
                            <td>{formatNumber(product.stock_count)}</td>
                            <td>
                              {product.unit_type === 'dual' ? (
                                <span className="text-indigo-600 font-medium">
                                  {formatNumber(product.stock_weight)} كغ
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="font-semibold text-emerald-600">
                              {formatNumber((product.stock_count || 0) * (product.price || 0))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </div>
        </TabsContent>

        {/* ==================== FINANCIAL REPORT TAB ==================== */}
        <TabsContent value="financial" className="mt-6">
          <div className="pro-card">
            <div className="pro-card-header">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                التقرير المالي
              </CardTitle>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="pro-label">من تاريخ <span className="text-rose-500">*</span></Label>
                  <Input
                    type="date"
                    value={financialStartDate}
                    onChange={(e) => setFinancialStartDate(e.target.value)}
                    className="pro-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="pro-label">إلى تاريخ <span className="text-rose-500">*</span></Label>
                  <Input
                    type="date"
                    value={financialEndDate}
                    onChange={(e) => setFinancialEndDate(e.target.value)}
                    className="pro-input"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchFinancialReport}
                    disabled={loading}
                    className="pro-btn-primary w-full"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    عرض التقرير
                  </button>
                </div>
              </div>

              {/* Financial Summary */}
              {financialReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                    <div className="text-sm text-slate-600 mb-1">إجمالي المبيعات</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatNumber(financialReport.total_sales)}
                    </div>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100">
                    <div className="text-sm text-slate-600 mb-1">إجمالي المصروفات</div>
                    <div className="text-2xl font-bold text-rose-600">
                      {formatNumber(financialReport.total_expenses)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                    <div className="text-sm text-slate-600 mb-1">إجمالي الإيرادات</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(financialReport.total_income)}
                    </div>
                  </div>
                  <div className={`rounded-xl p-4 text-center border ${financialReport.net_profit >= 0 ? 'bg-emerald-100 border-emerald-200' : 'bg-rose-100 border-rose-200'}`}>
                    <div className="text-sm text-slate-600 mb-1">صافي الربح</div>
                    <div className={`text-2xl font-bold ${financialReport.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatNumber(financialReport.net_profit)}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Stats */}
              {financialReport && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <span className="text-slate-500">عدد الفواتير:</span>
                      <span className="font-bold text-slate-900 mr-2">{financialReport.invoices_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">عدد المعاملات:</span>
                      <span className="font-bold text-slate-900 mr-2">{financialReport.expenses_count}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </TabsContent>

        {/* ==================== BACKUP TAB ==================== */}
        <TabsContent value="backup" className="mt-6">
          <div className="pro-card">
            <div className="pro-card-header">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5 text-indigo-600" />
                نسخة احتياطية Excel
              </CardTitle>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                <h3 className="font-bold text-lg text-slate-900 mb-4">تصدير البيانات إلى Excel</h3>
                <p className="text-slate-600 mb-6">
                  سيتم تصدير جميع بيانات النظام إلى ملف Excel يحتوي على 4 أوراق:
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                    <Package className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                    <div className="font-semibold text-slate-900">المنتجات</div>
                    <div className="text-xs text-slate-500">الكميات والأسعار</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                    <User className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <div className="font-semibold text-slate-900">العملاء</div>
                    <div className="text-xs text-slate-500">الأرصدة والبيانات</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <div className="font-semibold text-slate-900">الفواتير</div>
                    <div className="text-xs text-slate-500">تفصيلي</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <div className="font-semibold text-slate-900">المصروفات</div>
                    <div className="text-xs text-slate-500">والنقدية</div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadBackup}
                  disabled={loading}
                  className="pro-btn-primary"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  تحميل النسخة الاحتياطية
                </button>
              </div>
            </CardContent>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;