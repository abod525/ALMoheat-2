/**
 * Products Page - ALMoheat Accounting System
 * Features: Strict Dual Unit System with Professional UI
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
import { Plus, Pencil, Trash2, Package, Hash, Weight, AlertCircle } from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../lib/api';
import { toast } from 'sonner';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    price: '',
    unit_type: 'simple',
    weight_per_unit: '',
    stock_count: '',
  });

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data);
    } catch (error) {
      toast.error('فشل في تحميل المنتجات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cost: '',
      price: '',
      unit_type: 'simple',
      weight_per_unit: '',
      stock_count: '',
    });
    setEditingProduct(null);
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        cost: product.cost?.toString() || '',
        price: product.price?.toString() || '',
        unit_type: product.unit_type || 'simple',
        weight_per_unit: product.weight_per_unit?.toString() || '',
        stock_count: product.stock_count?.toString() || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUnitTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      unit_type: value,
      weight_per_unit: value === 'simple' ? '' : prev.weight_per_unit,
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error('اسم المنتج مطلوب');
        return;
      }
      if (!formData.cost || parseFloat(formData.cost) < 0) {
        toast.error('سعر التكلفة مطلوب');
        return;
      }
      if (!formData.price || parseFloat(formData.price) < 0) {
        toast.error('سعر البيع مطلوب');
        return;
      }
      
      if (formData.unit_type === 'dual') {
        if (!formData.weight_per_unit || parseFloat(formData.weight_per_unit) <= 0) {
          toast.error('الوزن لكل وحدة مطلوب للمنتجات الثنائية');
          return;
        }
      }

      const payload = {
        name: formData.name,
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        unit_type: formData.unit_type,
        stock_count: parseFloat(formData.stock_count) || 0,
      };

      if (formData.unit_type === 'dual') {
        payload.weight_per_unit = parseFloat(formData.weight_per_unit);
      }

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        await createProduct(payload);
        toast.success('تم إضافة المنتج بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'حدث خطأ أثناء الحفظ';
      toast.error(errorMsg);
      console.error(error);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`هل أنت متأكد من حذف المنتج: ${product.name}؟`)) {
      return;
    }

    try {
      await deleteProduct(product._id);
      toast.success('تم حذف المنتج بنجاح');
      fetchProducts();
    } catch (error) {
      toast.error('فشل في حذف المنتج');
      console.error(error);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-';
    return parseFloat(num).toLocaleString('ar-SA', { maximumFractionDigits: 2 });
  };

  // Calculate derived values
  const calculatedWeight = formData.unit_type === 'dual' && formData.weight_per_unit && formData.stock_count
    ? (parseFloat(formData.stock_count) * parseFloat(formData.weight_per_unit)).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="section-header">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Package className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">إدارة المنتجات</h1>
            <p className="text-sm text-slate-500">إضافة وتعديل منتجات المخزون</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenDialog()}
          className="pro-btn-primary"
        >
          <Plus className="h-5 w-5" />
          إضافة منتج
        </button>
      </div>

      {/* Products Table */}
      <div className="pro-card">
        <div className="overflow-x-auto">
          <table className="pro-table">
            <thead>
              <tr>
                <th>اسم المنتج</th>
                <th>نوع الوحدة</th>
                <th>سعر التكلفة</th>
                <th>سعر البيع</th>
                <th>الكمية (عدد)</th>
                <th>الكمية (وزن)</th>
                <th>القيمة</th>
                <th className="text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">لا توجد منتجات</p>
                      <button
                        onClick={() => handleOpenDialog()}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        إضافة منتج جديد
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id}>
                    <td className="font-semibold text-slate-900">{product.name}</td>
                    <td>
                      {product.unit_type === 'dual' ? (
                        <span className="pro-badge-indigo">
                          <Weight className="h-3 w-3" />
                          ثنائية
                          {product.weight_per_unit && (
                            <span className="text-xs opacity-75">({product.weight_per_unit} كغ)</span>
                          )}
                        </span>
                      ) : (
                        <span className="pro-badge-slate">
                          <Hash className="h-3 w-3" />
                          بسيطة
                        </span>
                      )}
                    </td>
                    <td className="text-slate-600">{formatNumber(product.cost)}</td>
                    <td className="text-slate-600">{formatNumber(product.price)}</td>
                    <td className="font-medium">{formatNumber(product.stock_count)}</td>
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
                    <td className="text-left">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(product)}
                          className="hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product)}
                          className="hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-indigo-600" />
              </div>
              {editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Product Name */}
            <div className="space-y-2">
              <Label className="pro-label">اسم المنتج <span className="text-rose-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="أدخل اسم المنتج"
                className="pro-input"
              />
            </div>

            {/* Cost and Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="pro-label">سعر التكلفة <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => handleInputChange('cost', e.target.value)}
                  placeholder="0.00"
                  className="pro-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="pro-label">سعر البيع <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  className="pro-input"
                />
              </div>
            </div>

            {/* Unit Type Toggle */}
            <div className="space-y-2">
              <Label className="pro-label">نوع الوحدة</Label>
              <ToggleGroup
                type="single"
                value={formData.unit_type}
                onValueChange={handleUnitTypeChange}
                className="pro-toggle-group w-full justify-start"
              >
                <ToggleGroupItem value="simple" className="pro-toggle-item flex-1">
                  <Hash className="h-4 w-4 ml-2" />
                  بسيطة (عدد فقط)
                </ToggleGroupItem>
                <ToggleGroupItem value="dual" className="pro-toggle-item flex-1">
                  <Weight className="h-4 w-4 ml-2" />
                  ثنائية (عدد + وزن)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Weight per Unit - Only for Dual */}
            {formData.unit_type === 'dual' && (
              <div className="space-y-2">
                <Label className="pro-label">الوزن لكل وحدة (كغ) <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.weight_per_unit}
                  onChange={(e) => handleInputChange('weight_per_unit', e.target.value)}
                  placeholder="مثال: 50 كغ للشوال"
                  className="pro-input"
                />
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  مثال: إذا كان المنتج شوال سكر 50 كغ، أدخل 50
                </p>
              </div>
            )}

            {/* Stock Count */}
            <div className="space-y-2">
              <Label className="pro-label">الكمية المتاحة (عدد)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.stock_count}
                onChange={(e) => handleInputChange('stock_count', e.target.value)}
                placeholder="0"
                className="pro-input"
              />
            </div>

            {/* Calculated Weight Display - Only for Dual */}
            {formData.unit_type === 'dual' && calculatedWeight && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-700">الوزن الإجمالي المحسوب:</span>
                  <span className="text-lg font-bold text-indigo-700">
                    {calculatedWeight} كغ
                  </span>
                </div>
                <p className="text-xs text-indigo-600 mt-1">
                  {formData.stock_count} × {formData.weight_per_unit} = {calculatedWeight} كغ
                </p>
              </div>
            )}
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
              {editingProduct ? 'تحديث' : 'حفظ'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;