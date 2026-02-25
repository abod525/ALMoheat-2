/**
 * Clients Page - ALMoheat Accounting System
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
import { Plus, Pencil, Trash2, Users, Phone, Calendar } from 'lucide-react';
import { getClients, createClient, updateClient, deleteClient } from '../lib/api';
import { toast } from 'sonner';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    balance: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      toast.error('فشل في تحميل العملاء');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      balance: '',
    });
    setEditingClient(null);
  };

  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        balance: client.balance?.toString() || '0',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('اسم العميل مطلوب');
        return;
      }

      const payload = {
        name: formData.name,
        phone: formData.phone,
        balance: parseFloat(formData.balance) || 0,
      };

      if (editingClient) {
        await updateClient(editingClient._id, payload);
        toast.success('تم تحديث العميل بنجاح');
      } else {
        await createClient(payload);
        toast.success('تم إضافة العميل بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
      console.error(error);
    }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`هل أنت متأكد من حذف العميل: ${client.name}؟`)) {
      return;
    }

    try {
      await deleteClient(client._id);
      toast.success('تم حذف العميل بنجاح');
      fetchClients();
    } catch (error) {
      toast.error('فشل في حذف العميل');
      console.error(error);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-';
    return parseFloat(num).toLocaleString('ar-SA', { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="section-header">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">إدارة العملاء</h1>
            <p className="text-sm text-slate-500">إضافة وتعديل بيانات العملاء</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenDialog()}
          className="pro-btn-primary"
        >
          <Plus className="h-5 w-5" />
          إضافة عميل
        </button>
      </div>

      {/* Clients Table */}
      <div className="pro-card">
        <div className="overflow-x-auto">
          <table className="pro-table">
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>رقم الهاتف</th>
                <th>الرصيد</th>
                <th>آخر معاملة</th>
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
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">لا يوجد عملاء</p>
                      <button
                        onClick={() => handleOpenDialog()}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        إضافة عميل جديد
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client._id}>
                    <td className="font-semibold text-slate-900">{client.name}</td>
                    <td>
                      {client.phone ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {client.phone}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`pro-badge ${client.balance >= 0 ? 'pro-badge-emerald' : 'pro-badge-rose'}`}>
                        {formatNumber(client.balance)}
                      </span>
                    </td>
                    <td>
                      {client.last_transaction_date ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {new Date(client.last_transaction_date).toLocaleDateString('ar-SA')}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="text-left">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(client)}
                          className="hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(client)}
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
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              {editingClient ? 'تعديل عميل' : 'إضافة عميل جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="pro-label">اسم العميل <span className="text-rose-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل اسم العميل"
                className="pro-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="pro-label">رقم الهاتف</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="أدخل رقم الهاتف"
                className="pro-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="pro-label">الرصيد الافتتاحي</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                placeholder="0.00"
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
              {editingClient ? 'تحديث' : 'حفظ'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;