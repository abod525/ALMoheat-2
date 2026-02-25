/**
 * ALMoheat Accounting System - Main App
 * Full Stack Application with Strict Dual Unit Support
 */

import Layout from './components/Layout';
import Products from './pages/Products';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import Cash from './pages/Cash';
import Dashboard from './pages/Dashboard';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/cash" element={<Cash />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Dashboard />} /> {/* Fallback route */}
      </Routes>
    </Layout>
  );
}

export default App;