/**
 * ALMoheat Accounting System - Main App
 * Full Stack Application with Strict Dual Unit Support
 */

import { useState } from 'react';
import Layout from './components/Layout';
import Products from './pages/Products';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import Dashboard from './pages/Dashboard';

type PageType = 'dashboard' | 'products' | 'clients' | 'invoices' | 'expenses' | 'reports';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'products':
        return <Products />;
      case 'clients':
        return <Clients />;
      case 'invoices':
        return <Invoices />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;