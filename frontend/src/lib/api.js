import axios from 'axios';

// تأكد أن الرابط يطابق سيرفرك
const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Products
export const productsAPI = {
  getAll: (lowStock = false) => api.get(`/products?low_stock=${lowStock}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Contacts
export const contactsAPI = {
  getAll: (type = null) => api.get(`/contacts${type ? `?contact_type=${type}` : ''}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

// Invoices
export const invoicesAPI = {
  getAll: (type = null) => api.get(`/invoices${type ? `?invoice_type=${type}` : ''}`),
  create: (data) => api.post('/invoices', data),
  getOne: (id) => api.get(`/invoices/${id}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
};

// Cash Transactions
export const cashAPI = {
  getAll: (type = null) => api.get(`/transactions${type ? `?transaction_type=${type}` : ''}`),
  getBalance: () => api.get('/transactions/balance'),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};

// ✅ Feature 4: Expenses API
export const expensesAPI = {
  getAll: (startDate = null, endDate = null) => {
    let url = '/expenses';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return api.get(url);
  },
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Reports
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getProfitLoss: (startDate = null, endDate = null) => {
    let url = '/reports/profit-loss';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return api.get(url);
  },
  // ✅ Feature 3: Inventory with date filtering
  getInventory: (startDate = null, endDate = null) => {
    let url = '/reports/inventory';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return api.get(url);
  },
  // ✅ Feature 2: Account Statement with date filtering
  getAccountStatement: (contactId, startDate = null, endDate = null) => {
    let url = `/reports/account-statement/${contactId}`;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return api.get(url);
  },
};

// System (Excel Backup)
export const systemAPI = {
  getBackup: () => api.get('/system/backup/excel', { responseType: 'blob' }),
};

export default api;