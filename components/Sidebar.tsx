
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../services/store';
import { 
  LayoutDashboard, ShoppingCart, TrendingUp, Package, Users, Wallet, Recycle, LogOut, FileBarChart, X, ShieldCheck, LifeBuoy, Building, Globe, Settings, Crown
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, currentCompany, logout, checkPermission } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  // Calcula dias restantes para o vencimento (seja Trial ou Plano Pago)
  const getRemainingDays = () => {
    if (!currentCompany) return null;
    
    // Verifica qual data usar (subscriptionEndsAt tem prioridade se existir, senão trialEndsAt)
    const targetDate = currentCompany.subscriptionEndsAt || currentCompany.trialEndsAt;
    
    if (targetDate) {
      const now = new Date();
      const end = new Date(targetDate);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return null;
  };

  const remainingDays = getRemainingDays();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Definição dos itens de menu (Operacionais)
  const operationalNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'view_dashboard' },
    { to: '/buy', icon: ShoppingCart, label: 'Comprar (Entrada)', permission: 'register_buy' },
    { to: '/sell', icon: TrendingUp, label: 'Vender (Saída)', permission: 'register_sell' },
    { to: '/cashier', icon: Wallet, label: 'Caixa', permission: 'manage_cashier' },
    { to: '/inventory', icon: Package, label: 'Estoque', permission: 'view_inventory' },
    { to: '/partners', icon: Users, label: 'Parceiros', permission: 'manage_partners' },
    { to: '/reports', icon: FileBarChart, label: 'Relatórios', permission: 'view_reports' },
    { to: '/users', icon: ShieldCheck, label: 'Usuários', permission: 'manage_users' },
    { to: '/support', icon: LifeBuoy, label: 'Suporte', permission: 'login' },
  ];

  // Itens do Super Admin (Reformulado)
  const adminNavItems = [
    { to: '/saas/dashboard', icon: Globe, label: 'Visão Global', permission: 'super_admin' },
    { to: '/saas/companies', icon: Building, label: 'Empresas', permission: 'super_admin' },
    { to: '/saas/plans', icon: Crown, label: 'Planos', permission: 'super_admin' }, // Novo item
    { to: '/saas/reports', icon: FileBarChart, label: 'Relatórios', permission: 'super_admin' },
    { to: '/saas/users', icon: ShieldCheck, label: 'Administradores', permission: 'super_admin' },
  ];

  // Filtra itens baseados no papel
  const navItems = isSuperAdmin 
    ? adminNavItems // Super Admin vê menu de gestão separado
    : operationalNavItems.filter(item => item.permission === 'login' || checkPermission(item.permission as any));

  // Helper for plan display name
  const getPlanDisplayName = (plan: string) => {
      switch(plan) {
          case 'essential': return 'ESSENCIAL';
          case 'professional': return 'PRO';
          case 'premium': return 'PREMIUM';
          default: return plan.toUpperCase();
      }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <div className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-emerald-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-xl no-print h-full`}>
        
        {/* Header App Name */}
        <div className="p-6 flex items-center justify-between border-b shrink-0 h-16 lg:h-auto border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full">
              <Recycle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
               <h1 className="text-xl font-bold tracking-tight leading-none">Sucata Fácil</h1>
               <span className="text-xs font-normal text-emerald-300">
                 {isSuperAdmin ? 'Administrador do Sistema' : 'Gestão Inteligente SaaS'}
               </span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        {/* User Info Box */}
        <div className="p-4 border-b bg-emerald-800/50 border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm bg-emerald-500">
              {currentUser?.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{currentUser?.name}</p>
              <p className="text-xs capitalize text-emerald-300">
                {isSuperAdmin ? 'Administrador do Sistema' : currentCompany?.name}
              </p>
            </div>
          </div>
          {!isSuperAdmin && currentCompany && (
             <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-blue-500 text-white`}>
                  {getPlanDisplayName(currentCompany.plan)}
                </span>
                
                {/* Lógica: Se faltarem 15 dias ou menos e for novo, mostra o aviso */}
                {remainingDays !== null && remainingDays <= 15 && (
                   <span className="text-[10px] text-amber-300 font-bold ml-1">
                     Restam {remainingDays} dias
                   </span>
                )}
             </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Trial Warning (Bottom) - Exibe apenas se estiver no finalzinho */}
        {!isSuperAdmin && remainingDays !== null && remainingDays < 5 && (
           <div className="px-4 pb-2">
              <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 text-center">
                 <p className="text-xs text-amber-200 font-bold mb-1">Acesso Expirando!</p>
                 <button className="text-[10px] bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 w-full font-bold">
                    Renovar Agora
                 </button>
              </div>
           </div>
        )}

        <div className="p-4 border-t shrink-0 border-emerald-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full transition-colors rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;