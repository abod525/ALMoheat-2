/**
 * Expenses Page - ALMoheat Accounting System
 * Professional UI with Modern Styling
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
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Calendar, FileText } from 'lucide-react';
import { getExpenses, createExpense, deleteExpense } from '../lib/api';
import { toast } from 'sonner';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    amount: '',
    note: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await getExpenses();
      setExpenses(response.data);
    } catch (error) {
      toast.error('فشل في تحميل المعاملات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: '',
      note: '',
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error('الرجاء إدخال مبلغ صحيح');
        return;
      }

      const payload = {
        date: new Date(formData.date).toISOString(),
        type: formData.type,
        amount: parseFloat(formData.amount),
        note: formData.note,
      };

      await createExpense(payload);
      toast.success('تم إضافة المعاملة بنجاح');
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
      console.error(error);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      return;
    }

    try {
      await deleteExpense(expense._id);
      toast.success('تم حذف المعاملة بنجاح');
      fetchExpenses();
    } catch (error) {
      toast.error('فشل في حذف المعاملة');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="section-header">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Wallet className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">المصروفات والنقدية</h1>
            <p className="text-sm text-slate-500">تسجيل المصروفات والإيرادات</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="pro-btn-primary"
        >
          <Plus className="h-5 w-5" />
          إضافة معاملة
        </button>
      </div>

      {/* Expenses Table */}
      <div className="pro-card">
        <div className="overflow-x-auto">
          <table className="pro-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>ملاحظات</th>
                <th className="text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Wallet className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">لا توجد معاملات</p>
                      <button
                        onClick={() => { resetForm(); setDialogOpen(true); }}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        إضافة معاملة جديدة
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(expense.date)}
                      </div>
                    </td>
                    <td>
                      {expense.type === 'income' ? (
                        <span className="pro-badge-emerald">
                          <TrendingUp className="h-3 w-3" />
                          إيراد
                        </span>
                      ) : (
                        <span className="pro-badge-rose">
                          <TrendingDown className="h-3 w-3" />
                          مصروف
                        </span>
                      )}
                    </td>
                    <td className={`font-semibold ${expense.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatNumber(expense.amount)}
                    </td>
                    <td className="text-slate-600">{expense.note || '-'}</td>
                    <td className="text-left">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense)}
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

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Wallet className="h-5 w-5 text-indigo-600" />
              </div>
              إضافة معاملة جديدة
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="pro-label flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                التاريخ
              </Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="pro-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="pro-label">نوع المعاملة</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="pro-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                      مصروف
                    </div>
                  </SelectItem>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      إيراد
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="pro-label">المبلغ</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="pro-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="pro-label flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                ملاحظات
              </Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="أي ملاحظات..."
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
              حفظ
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;