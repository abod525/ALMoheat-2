/**
 * API Service for ALMoheat Accounting System
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== PRODUCTS ====================

export const getProducts = () => api.get('/products');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ==================== CLIENTS ====================

export const getClients = () => api.get('/clients');
export const getClient = (id) => api.get(`/clients/${id}`);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);

// ==================== INVOICES ====================

export const getInvoices = (params) => api.get('/invoices', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post('/invoices', data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);

// ==================== EXPENSES ====================

export const getExpenses = (params) => api.get('/expenses', { params });
export const createExpense = (data) => api.post('/expenses', data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// ==================== REPORTS ====================

export const getAccountStatement = (clientId, params) => 
  api.get(`/reports/account-statement/${clientId}`, { params });

export const getInventoryReport = (params) => 
  api.get('/reports/inventory', { params });

export const getFinancialReport = (params) => 
  api.get('/reports/financial', { params });

// ==================== BACKUP ====================

export const downloadBackup = () => {
  return api.get('/backup/excel', {
    responseType: 'blob',
  });
};

// ==================== UNIFIED API OBJECTS ====================

export const clientsAPI = {
  getAll: getClients,
  getOne: getClient,
  create: createClient,
  update: updateClient,
  delete: deleteClient,
};

export const cashAPI = {
  getAll: (type) => api.get('/cash', { params: { transaction_type: type } }),
  getBalance: () => api.get('/cash/balance'),
  create: (data) => api.post('/cash', data),
  update: (id, data) => api.put(`/cash/${id}`, data),
  delete: (id) => api.delete(`/cash/${id}`),
};

export default api;