/**
 * Invoices Page - ALMoheat Accounting System
 * Features: Strict Dual Unit Invoicing with Count/Weight Toggle
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Hash, 
  Weight, 
  ShoppingCart,
  AlertCircle,
  User,
  Calendar,
  Package
} from 'lucide-react';
import { getInvoices, createInvoice, deleteInvoice, getProducts, getClients } from '../lib/api';
import { toast } from 'sonner';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Invoice form state
  const [invoiceData, setInvoiceData] = useState({
    customer_id: '',
    customer_name: '',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    discount: 0,
    notes: '',
  });

  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    product_name: '',
    quantity: '',
    weight: '',
    unit_price: '',
    sale_unit: 'count',
    weight_per_unit: null,
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, productsRes, clientsRes] = await Promise.all([
        getInvoices(),
        getProducts(),
        getClients(),
      ]);
      setInvoices(invoicesRes.data);
      setProducts(productsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('فشل في تحميل البيانات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInvoiceData({
      customer_id: '',
      customer_name: '',
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      items: [],
      discount: 0,
      notes: '',
    });
    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: '',
      weight: '',
      unit_price: '',
      sale_unit: 'count',
      weight_per_unit: null,
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Handle customer selection
  const handleCustomerChange = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    setInvoiceData(prev => ({
      ...prev,
      customer_id: clientId,
      customer_name: client?.name || '',
    }));
  };

  // Handle product selection for current item
  const handleProductChange = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    setCurrentItem(prev => ({
      ...prev,
      product_id: productId,
      product_name: product.name,
      unit_price: product.price?.toString() || '',
      sale_unit: product.unit_type === 'dual' ? 'count' : 'count',
      weight_per_unit: product.weight_per_unit || null,
      quantity: '',
      weight: '',
    }));
  };

  // Get selected product details
  const getSelectedProduct = () => {
    if (!currentItem.product_id) return null;
    return products.find(p => p._id === currentItem.product_id);
  };

  // Handle sale unit toggle
  const handleSaleUnitChange = (value) => {
    if (!value) return;
    setCurrentItem(prev => ({
      ...prev,
      sale_unit: value,
      quantity: '',
      weight: '',
    }));
  };

  // Calculate available stock display
  const getAvailableStock = (product) => {
    if (!product) return null;
    
    if (product.unit_type === 'dual') {
      return {
        count: product.stock_count || 0,
        weight: product.stock_weight || 0,
      };
    }
    return {
      count: product.stock_count || 0,
    };
  };

  // Calculate equivalent values
  const getEquivalentDisplay = () => {
    const product = getSelectedProduct();
    if (!product || product.unit_type !== 'dual' || !currentItem.weight_per_unit) return null;

    if (currentItem.sale_unit === 'count' && currentItem.quantity) {
      const weight = parseFloat(currentItem.quantity) * currentItem.weight_per_unit;
      return `= ${weight.toFixed(2)} كغ`;
    } else if (currentItem.sale_unit === 'weight' && currentItem.weight) {
      const count = parseFloat(currentItem.weight) / currentItem.weight_per_unit;
      return `= ${count.toFixed(2)} قطعة`;
    }
    return null;
  };

  // Add item to invoice
  const handleAddItem = () => {
    const product = getSelectedProduct();
    if (!product) {
      toast.error('الرجاء اختيار منتج');
      return;
    }

    let quantity, displayQuantity;
    
    if (product.unit_type === 'dual') {
      if (currentItem.sale_unit === 'count') {
        quantity = parseFloat(currentItem.quantity);
        if (!quantity || quantity <= 0) {
          toast.error('الرجاء إدخال كمية صحيحة');
          return;
        }
        displayQuantity = quantity;
      } else {
        quantity = parseFloat(currentItem.weight);
        if (!quantity || quantity <= 0) {
          toast.error('الرجاء إدخال وزن صحيح');
          return;
        }
        displayQuantity = quantity;
      }
    } else {
      quantity = parseFloat(currentItem.quantity);
      if (!quantity || quantity <= 0) {
        toast.error('الرجاء إدخال كمية صحيحة');
        return;
      }
      displayQuantity = quantity;
    }

    const unitPrice = parseFloat(currentItem.unit_price);
    if (!unitPrice || unitPrice < 0) {
      toast.error('الرجاء إدخال سعر صحيح');
      return;
    }

    const total = quantity * unitPrice;

    const newItem = {
      product_id: currentItem.product_id,
      product_name: currentItem.product_name,
      quantity: quantity,
      unit_price: unitPrice,
      total: total,
      sale_unit: product.unit_type === 'dual' ? currentItem.sale_unit : 'count',
      weight_per_unit: product.weight_per_unit,
    };

    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    // Reset current item
    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: '',
      weight: '',
      unit_price: '',
      sale_unit: 'count',
      weight_per_unit: null,
    });
  };

  // Remove item from invoice
  const handleRemoveItem = (index) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(invoiceData.discount) || 0;
    const total = subtotal - discount;
    return { subtotal, discount, total };
  };

  // Submit invoice
  const handleSubmit = async () => {
    try {
      if (!invoiceData.customer_id) {
        toast.error('الرجاء اختيار العميل');
        return;
      }

      if (invoiceData.items.length === 0) {
        toast.error('الرجاء إضافة منتجات للفاتورة');
        return;
      }

      const { subtotal, discount, total } = calculateTotals();

      const payload = {
        ...invoiceData,
        date: new Date(invoiceData.date).toISOString(),
        subtotal,
        discount,
        total,
      };

      await createInvoice(payload);
      toast.success('تم إنشاء الفاتورة بنجاح');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'حدث خطأ أثناء إنشاء الفاتورة';
      toast.error(errorMsg);
      console.error(error);
    }
  };

  // Delete invoice
  const handleDelete = async (invoice) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفاتورة: ${invoice.invoice_number}؟`)) {
      return;
    }

    try {
      await deleteInvoice(invoice._id);
      toast.success('تم حذف الفاتورة بنجاح');
      fetchData();
    } catch (error) {
      toast.error('فشل في حذف الفاتورة');
      console.error(error);
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

  const selectedProduct = getSelectedProduct();
  const availableStock = getAvailableStock(selectedProduct);
  const equivalentDisplay = getEquivalentDisplay();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="section-header">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">إدارة الفواتير</h1>
            <p className="text-sm text-slate-500">إنشاء وإدارة فواتير المبيعات</p>
          </div>
        </div>
        <button
          onClick={handleOpenDialog}
          className="pro-btn-primary"
        >
          <Plus className="h-5 w-5" />
          فاتورة جديدة
        </button>
      </div>

      {/* Invoices Table */}
      <div className="pro-card">
        <div className="overflow-x-auto">
          <table className="pro-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>عدد المنتجات</th>
                <th>الخصم</th>
                <th>الإجمالي</th>
                <th className="text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">لا توجد فواتير</p>
                      <button
                        onClick={handleOpenDialog}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        إنشاء فاتورة جديدة
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="font-semibold text-slate-900">{invoice.invoice_number}</td>
                    <td className="text-slate-600">{formatDate(invoice.date)}</td>
                    <td>{invoice.customer_name}</td>
                    <td>
                      <span className="pro-badge-slate">
                        {invoice.items?.length || 0} منتج
                      </span>
                    </td>
                    <td className="text-slate-600">{formatNumber(invoice.discount)}</td>
                    <td className="font-bold text-emerald-600">
                      {formatNumber(invoice.total)}
                    </td>
                    <td className="text-left">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(invoice)}
                        className="hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              إنشاء فاتورة جديدة
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Invoice Header */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="pro-label flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  رقم الفاتورة
                </Label>
                <Input
                  value={invoiceData.invoice_number}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="رقم الفاتورة"
                  className="pro-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="pro-label flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  التاريخ
                </Label>
                <Input
                  type="date"
                  value={invoiceData.date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, date: e.target.value }))}
                  className="pro-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="pro-label flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  العميل <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={invoiceData.customer_id}
                  onValueChange={handleCustomerChange}
                >
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
            </div>

            {/* Add Items Section */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                إضافة منتج
              </h4>
              
              <div className="space-y-4">
                {/* Product and Sale Unit Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Product Select */}
                  <div className="space-y-2">
                    <Label className="pro-label">المنتج</Label>
                    <Select
                      value={currentItem.product_id}
                      onValueChange={handleProductChange}
                    >
                      <SelectTrigger className="pro-input">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product._id} value={product._id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {product.name}
                              {product.unit_type === 'dual' && (
                                <span className="text-xs text-indigo-600">(ثنائي)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sale Unit Toggle - Only for Dual Products */}
                  {selectedProduct?.unit_type === 'dual' && (
                    <div className="space-y-2">
                      <Label className="pro-label">وحدة البيع</Label>
                      <ToggleGroup
                        type="single"
                        value={currentItem.sale_unit}
                        onValueChange={handleSaleUnitChange}
                        className="pro-toggle-group w-full"
                      >
                        <ToggleGroupItem value="count" className="pro-toggle-item flex-1">
                          <Hash className="h-4 w-4 ml-2" />
                          بالعدد
                        </ToggleGroupItem>
                        <ToggleGroupItem value="weight" className="pro-toggle-item flex-1">
                          <Weight className="h-4 w-4 ml-2" />
                          بالوزن
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  )}
                </div>

                {/* Quantity and Price Row */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Quantity Input */}
                  <div className="space-y-2">
                    <Label className="pro-label">
                      {selectedProduct?.unit_type === 'dual' && currentItem.sale_unit === 'weight'
                        ? 'الوزن (كغ)'
                        : 'الكمية'}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step={currentItem.sale_unit === 'weight' ? '0.01' : '1'}
                        value={currentItem.sale_unit === 'weight' ? currentItem.weight : currentItem.quantity}
                        onChange={(e) => setCurrentItem(prev => ({
                          ...prev,
                          [currentItem.sale_unit === 'weight' ? 'weight' : 'quantity']: e.target.value
                        }))}
                        placeholder={currentItem.sale_unit === 'weight' ? '0.00' : '0'}
                        className="pro-input"
                      />
                      {equivalentDisplay && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-indigo-600 font-medium">
                          {equivalentDisplay}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-2">
                    <Label className="pro-label">سعر الوحدة</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.unit_price}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="0.00"
                      className="pro-input"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="space-y-2">
                    <Label className="pro-label">&nbsp;</Label>
                    <button
                      onClick={handleAddItem}
                      className="pro-btn-primary w-full"
                      disabled={!currentItem.product_id}
                    >
                      <Plus className="h-4 w-4" />
                      إضافة
                    </button>
                  </div>
                </div>

                {/* Stock Availability */}
                {selectedProduct && availableStock && (
                  <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-indigo-500" />
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500">المخزون المتاح:</span>
                      {selectedProduct.unit_type === 'dual' ? (
                        <>
                          <span className="pro-badge-indigo">
                            {formatNumber(availableStock.count)} قطعة
                          </span>
                          <span className="pro-badge-emerald">
                            {formatNumber(availableStock.weight)} كغ
                          </span>
                          <span className="text-xs text-slate-400">
                            (الوزن لكل وحدة: {selectedProduct.weight_per_unit} كغ)
                          </span>
                        </>
                      ) : (
                        <span className="pro-badge-slate">
                          {formatNumber(availableStock.count)} قطعة
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            {invoiceData.items.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="pro-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>وحدة البيع</th>
                      <th>الكمية</th>
                      <th>سعر الوحدة</th>
                      <th>الإجمالي</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item, index) => (
                      <tr key={index}>
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
                        <td>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-80 space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">المجموع الفرعي:</span>
                  <span className="font-medium">{formatNumber(calculateTotals().subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">الخصم:</span>
                  <Input
                    type="number"
                    className="w-32 h-9 pro-input"
                    value={invoiceData.discount}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, discount: e.target.value }))}
                  />
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-3">
                  <span>الإجمالي:</span>
                  <span className="text-emerald-600">{formatNumber(calculateTotals().total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="pro-label">ملاحظات</Label>
              <Input
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أي ملاحظات إضافية..."
                className="pro-input"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDialogOpen(false)}
              className="pro-btn-secondary flex-1"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              className="pro-btn-primary flex-1"
            >
              حفظ الفاتورة
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;