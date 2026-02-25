import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import Cash from "./pages/Cash";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";  // ✅ Feature 4: New Expenses Page
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div dir="rtl" className="app-container">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="clients" element={<Clients />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="cash" element={<Cash />} />
            <Route path="reports" element={<Reports />} />
            <Route path="expenses" element={<Expenses />} />  // ✅ Feature 4: New Route
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-left" richColors />
    </div>
  );
}

export default App;