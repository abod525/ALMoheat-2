import { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Wallet,
  TrendingDown,
  Calendar,
  AlertCircle,
  DollarSign,
  FileText
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { expensesAPI, cashAPI } from "../lib/api";
import { formatCurrency } from "../lib/utils";
import { toast } from "sonner";

// 🕒 دالة تنسيق التاريخ
const formatDateTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("ar-SY", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [balance, setBalance] = useState({ receipts: 0, payments: 0, expenses: 0, balance: 0 });
  
  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses();
    fetchBalance();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await expensesAPI.getAll();
      setExpenses(response.data);
    } catch (error) {
      toast.error("فشل في تحميل المصروفات");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await cashAPI.getBalance();
      setBalance(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم المصروف");
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setSubmitting(true);
    try {
      await expensesAPI.create({
        name: formData.name.trim(),
        amount: amount,
        notes: formData.notes.trim() || null
      });
      
      toast.success("تم تسجيل المصروف بنجاح");
      setDialogOpen(false);
      setFormData({ name: "", amount: "", notes: "" });
      fetchExpenses();
      fetchBalance();
    } catch (error) {
      toast.error("فشل في تسجيل المصروف");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!expenseToDelete) return;
    
    try {
      await expensesAPI.delete(expenseToDelete.id);
      toast.success("تم حذف المصروف بنجاح");
      fetchExpenses();
      fetchBalance();
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      toast.error("فشل في حذف المصروف");
    }
  };

  const filteredExpenses = expenses.filter((expense) =>
    expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (expense.notes && expense.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // حساب إجمالي المصروفات المعروضة
  const totalDisplayedExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-8 animate-fadeIn pb-10 font-sans">
      
      {/* 1. Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl ring-1 ring-white/10">
        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-br from-slate-800 to-slate-900 opacity-50"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500 blur-[100px] opacity-20"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-orange-500 blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">المصروفات</h1>
            <p className="text-slate-400 max-w-lg">
              إدارة النفقات اليومية (إيجار، كهرباء، مصاريف تشغيل) والمسحوبات الشخصية.
            </p>
          </div>
          
          <Button 
            onClick={() => setDialogOpen(true)} 
            className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 h-12 rounded-xl shadow-lg transition-transform hover:scale-105"
            data-testid="add-expense-btn"
          >
            <Plus className="h-5 w-5 ml-2" />
            تسجيل مصروف
          </Button>
        </div>
      </div>

      {/* 2. Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* رصيد الصندوق الحالي */}
        <Card className={`border-none shadow-lg transition-all rounded-3xl overflow-hidden group relative ${balance.balance >= 0 ? 'bg-slate-900 text-white' : 'bg-red-900 text-white'} hover:-translate-y-1 hover:shadow-xl duration-300 cursor-pointer`}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors"></div>
          <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">الرصيد الحالي في الصندوق</p>
                <h3 className="text-4xl font-bold tracking-tight dir-ltr text-right">{formatCurrency(balance.balance)}</h3>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Wallet className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-300 bg-white/5 w-fit px-3 py-1 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              يشمل المصروفات
            </div>
          </CardContent>
        </Card>

        {/* إجمالي المصروفات */}
        <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-3xl bg-white overflow-hidden group cursor-pointer">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">إجمالي المصروفات</p>
                <h3 className="text-3xl font-bold text-red-600">{formatCurrency(balance.expenses)}</h3>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-red-200">
                <TrendingDown className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-6">
                <Badge variant="secondary" className="bg-red-50 text-red-700 border-0 group-hover:bg-red-100 transition-colors">
                    <Receipt className="h-3 w-3 mr-1" />
                    مصروفات تشغيل
                </Badge>
            </div>
          </CardContent>
        </Card>

        {/* إجمالي المصروفات المعروضة */}
        <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-3xl bg-white overflow-hidden group cursor-pointer">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">المصروفات المعروضة</p>
                <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(totalDisplayedExpenses)}</h3>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-orange-200">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-6">
                <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-0 group-hover:bg-orange-100 transition-colors">
                    <FileText className="h-3 w-3 mr-1" />
                    نتيجة البحث
                </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Table */}
      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <div className="relative w-full sm:w-72 mb-4">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="بحث في المصروفات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-12 h-12 bg-slate-50 border-slate-100 focus:bg-white transition-colors rounded-xl text-base"
              data-testid="search-expenses"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-red-600 animate-spin"></div>
            </div>
          ) : filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-right py-5 px-6 font-bold text-slate-600">اسم المصروف</TableHead>
                    <TableHead className="text-right py-5 font-bold text-slate-600">المبلغ</TableHead>
                    <TableHead className="text-right py-5 font-bold text-slate-600">ملاحظات</TableHead>
                    <TableHead className="text-right py-5 font-bold text-slate-600">التاريخ</TableHead>
                    <TableHead className="text-right py-5 font-bold text-slate-600">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow 
                      key={expense.id} 
                      className="hover:bg-slate-50/50 transition-colors border-slate-50 group hover:-translate-y-1 hover:shadow-lg duration-300 cursor-pointer"
                      data-testid={`expense-row-${expense.id}`}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl shadow-sm bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <span className="font-bold text-slate-700">{expense.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-bold text-lg text-red-600">
                          - {formatCurrency(expense.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-slate-600">
                        {expense.notes || '-'}
                      </TableCell>
                      <TableCell className="py-4 text-slate-500 text-sm dir-ltr text-right font-medium">
                        {formatDateTime(expense.created_at)}
                      </TableCell>
                      <TableCell className="py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); confirmDelete(expense); }}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">لا توجد مصروفات</h3>
              <p className="text-slate-500 max-w-sm mt-2">
                {searchTerm ? "لا توجد نتائج تطابق بحثك." : "لم يتم تسجيل أي مصروفات حتى الآن."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setDialogOpen(true)} className="mt-6 bg-slate-900 text-white hover:bg-slate-800">
                  <Plus className="h-4 w-4 ml-2" />
                  تسجيل أول مصروف
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              تسجيل مصروف جديد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            
            <div>
              <Label className="text-slate-600 mb-1.5 block">اسم المصروف</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثلاً: إيجار، كهرباء، مسحوبات..."
                required
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all hover:border-slate-300 focus:border-slate-400"
                data-testid="expense-name-input"
              />
            </div>

            <div>
              <Label className="text-slate-600 mb-1.5 block">المبلغ</Label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 flex items-center justify-center font-bold text-lg">
                  $
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                  className="h-14 pr-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xl font-bold transition-all hover:border-slate-300 focus:border-slate-400"
                  data-testid="expense-amount-input"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                سيتم خصم هذا المبلغ تلقائياً من رصيد الصندوق
              </p>
            </div>

            <div>
              <Label className="text-slate-600 mb-1.5 block">ملاحظات (اختياري)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أضف تفاصيل إضافية..."
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all hover:border-slate-300 focus:border-slate-400"
                data-testid="expense-notes-input"
              />
            </div>

            <DialogFooter className="gap-3 sm:justify-start pt-2">
              <Button 
                type="submit" 
                disabled={submitting} 
                className="h-11 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                data-testid="submit-expense-btn"
              >
                {submitting ? "جاري الحفظ..." : "تسجيل المصروف"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setFormData({ name: "", amount: "", notes: "" });
                }}
                className="h-11 px-6 rounded-xl hover:bg-slate-100 transition-colors hover:text-slate-900"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6" dir="rtl">
          <div className="flex flex-col items-center text-center gap-4 pt-2">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold text-slate-900 text-center">تأكيد الحذف</DialogTitle>
              <div className="text-slate-500 text-sm max-w-xs mx-auto">
                هل أنت متأكد أنك تريد حذف المصروف <span className="font-bold text-slate-900">"{expenseToDelete?.name}"</span>؟
                <br />
                <span className="text-red-600 font-medium">
                  سيتم إرجاع المبلغ ({expenseToDelete && formatCurrency(expenseToDelete.amount)}) إلى الصندوق.
                </span>
              </div>
            </DialogHeader>
            
            <DialogFooter className="flex gap-2 w-full mt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1 h-11 rounded-xl text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900">
                إلغاء
              </Button>
              <Button onClick={executeDelete} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200">
                حذف نهائي
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
