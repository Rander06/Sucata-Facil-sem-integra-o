
import React, { useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { StoreProvider, useStore } from './services/store';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import OrderForm from './pages/OrderForm';
import Cashier from './pages/Cashier';
import Inventory from './pages/Inventory';
import Partners from './pages/Partners';
import Reports from './pages/Reports';
import UsersPage from './pages/Users';
import Support from './pages/Support';
import SuperAdminDashboard from './pages/SuperAdmin';
import SuperAdminCompanies from './pages/SuperAdminCompanies';
import SuperAdminReports from './pages/SuperAdminReports';
import SuperAdminUsers from './pages/SuperAdminUsers';
import SuperAdminPlans from './pages/SuperAdminPlans'; // Importado
import Login from './pages/Login';
import SubscriptionBlock from './pages/SubscriptionBlock';
import LandingPage from './pages/LandingPage';
import { Menu, Recycle } from 'lucide-react';
import { UserPermissions } from './types';

// Wrapper for standard permissions
const ProtectedRoute: React.FC<{ 
  element: React.ReactNode, 
  permission?: keyof UserPermissions 
}> = ({ element, permission }) => {
  const { checkPermission, currentCompany, currentUser } = useStore();
  
  // Super Admin bypass
  if (currentUser?.role === 'super_admin') return <>{element}</>;

  // Check Subscription Status (BLOCK IF EXPIRED OR STATUS IS BLOCKED)
  if (currentCompany) {
      // 1. Verificação explícita de status
      if (currentCompany.status === 'blocked' || currentCompany.status === 'suspended') {
         return <Navigate to="/subscription-expired" replace />;
      }

      // 2. Verificação de data (Cobre Trial e Planos Pagos)
      const now = new Date();
      // Prioriza subscriptionEndsAt, se não existir usa trialEndsAt
      const expirationDateStr = currentCompany.subscriptionEndsAt || currentCompany.trialEndsAt;
      
      if (expirationDateStr) {
          const expirationDate = new Date(expirationDateStr);
          if (now > expirationDate) {
             return <Navigate to="/subscription-expired" replace />;
          }
      }
  }

  if (permission && !checkPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{element}</>;
};

// Wrapper specifically for Super Admin
const SuperAdminRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { currentUser } = useStore();
  if (currentUser?.role !== 'super_admin') {
     return <Navigate to="/dashboard" replace />;
  }
  return <>{element}</>;
};

// Layout Component for the App (Sidebar + Header + Content)
const AppLayout: React.FC = () => {
  const { currentUser } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-full relative min-w-0 w-full transition-all duration-300">
        <header className="lg:hidden h-16 bg-emerald-900 text-white flex items-center px-4 shrink-0 shadow-md print:hidden z-30 justify-between sticky top-0">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-emerald-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center ml-3 gap-2 cursor-pointer" onClick={scrollToTop}>
               <div className="bg-white p-1.5 rounded-full text-emerald-900"><Recycle className="w-4 h-4" /></div>
               <div className="flex flex-col">
                 <h1 className="text-lg font-bold leading-none">Sucata Fácil</h1>
                 <span className="text-[10px] text-emerald-300 font-normal">Gestão Inteligente SaaS</span>
               </div>
            </div>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8 print:p-0 print:overflow-visible scroll-smooth bg-gray-50 w-full">
           <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser } = useStore();

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<LandingPage />} />
      
      <Route path="/login" element={
         currentUser ? (
             currentUser.role === 'super_admin' ? <Navigate to="/saas/dashboard" replace /> : <Navigate to="/dashboard" replace />
         ) : (
             <Login />
         )
      } />
      
      <Route path="/subscription-expired" element={<SubscriptionBlock />} />

      {/* PROTECTED APP ROUTES */}
      <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} permission="view_dashboard" />} />
          <Route path="/buy" element={<ProtectedRoute permission="register_buy" element={<div className="animate-fade-in w-full"><div className="mb-4 md:mb-6"><h1 className="text-xl md:text-2xl font-bold text-emerald-800">Nova Compra</h1><p className="text-gray-500 text-sm">Registrar entrada</p></div><OrderForm type="buy" /></div>} />} />
          <Route path="/sell" element={<ProtectedRoute permission="register_sell" element={<div className="animate-fade-in w-full"><div className="mb-4 md:mb-6"><h1 className="text-xl md:text-2xl font-bold text-blue-800">Nova Venda</h1><p className="text-gray-500 text-sm">Registrar saída</p></div><OrderForm type="sell" /></div>} />} />
          <Route path="/cashier" element={<ProtectedRoute element={<Cashier />} permission="manage_cashier" />} />
          <Route path="/inventory" element={<ProtectedRoute element={<Inventory />} permission="view_inventory" />} />
          <Route path="/partners" element={<ProtectedRoute element={<Partners />} permission="manage_partners" />} />
          <Route path="/reports" element={<ProtectedRoute element={<Reports />} permission="view_reports" />} />
          <Route path="/users" element={<ProtectedRoute element={<UsersPage />} permission="manage_users" />} />
          <Route path="/support" element={<Support />} />
          
          {/* SAAS ADMIN ROUTES */}
          <Route path="/super-admin" element={<Navigate to="/saas/dashboard" replace />} />
          <Route path="/saas/dashboard" element={<SuperAdminRoute element={<SuperAdminDashboard />} />} />
          <Route path="/saas/companies" element={<SuperAdminRoute element={<SuperAdminCompanies />} />} />
          <Route path="/saas/plans" element={<SuperAdminRoute element={<SuperAdminPlans />} />} /> {/* Nova Rota */}
          <Route path="/saas/reports" element={<SuperAdminRoute element={<SuperAdminReports />} />} />
          <Route path="/saas/users" element={<SuperAdminRoute element={<SuperAdminUsers />} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <StoreProvider>
      <Router>
        <AppContent />
      </Router>
    </StoreProvider>
  );
};

export default App;