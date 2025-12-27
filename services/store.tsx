import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Product, Partner, Order, Transaction, User, ActionLog, CashSession, PaymentMethod, CashClosingDetail, BackupLog, UserPermissions, UserRole, Company, CompanyPlan, CompanyStatus, Plan } from '../types';

// --- CONFIGURAÇÃO DOS PLANOS SAAS (LEGADO/INICIAL) ---
// Convertido para constante de inicialização
const INITIAL_PLANS_DATA: Plan[] = [
  {
    id: 'essential',
    name: 'Essencial',
    description: 'Para pequenos depósitos e iniciantes.',
    priceMonthly: 49.90,
    priceAnnual: 399.90,
    maxUsers: 1,
    storageLimit: '2 GB',
    supportLevel: 'basic',
    backupType: 'manual',
    features: [],
    createdAt: new Date().toISOString(),
    color: 'bg-emerald-100 text-emerald-800'
  },
  {
    id: 'professional',
    name: 'Profissional',
    description: 'Ideal para empresas em crescimento.',
    priceMonthly: 99.90,
    priceAnnual: 799.90,
    maxUsers: 3,
    storageLimit: '20 GB',
    supportLevel: 'priority',
    backupType: 'auto',
    features: [],
    createdAt: new Date().toISOString(),
    isPopular: true,
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Para grandes operações e redes.',
    priceMonthly: 149.90,
    priceAnnual: 1199.90,
    maxUsers: 9999,
    storageLimit: '100 GB',
    supportLevel: '24/7',
    backupType: 'auto',
    features: ['Acesso antecipado a novos recursos'],
    createdAt: new Date().toISOString(),
    color: 'bg-blue-100 text-blue-800'
  }
];

// Mantido para compatibilidade com código antigo que importa PLANS_CONFIG diretamente
// Agora ele mapeia para objetos simples para não quebrar a UI antiga
export const PLANS_CONFIG: Record<string, { 
  name: string; 
  priceMonthly: number; 
  priceAnnual: number;
  maxUsers: number; 
  features: string[];
  color: string;
}> = {
  essential: {
    name: 'Essencial',
    priceMonthly: 49.90,
    priceAnnual: 399.90,
    maxUsers: 1,
    features: ['1 Usuário', 'Backup Manual', 'Suporte por Email', 'Gestão Completa'],
    color: 'bg-emerald-100 text-emerald-800'
  },
  professional: {
    name: 'Profissional',
    priceMonthly: 99.90,
    priceAnnual: 799.90,
    maxUsers: 3,
    features: ['3 Usuários', 'Backup Automático', 'Suporte Prioritário Email', 'Gestão Financeira Avançada'],
    color: 'bg-orange-100 text-orange-800'
  },
  premium: {
    name: 'Premium',
    priceMonthly: 149.90,
    priceAnnual: 1199.90,
    maxUsers: 9999,
    features: ['Multiusuários (Ilimitado)', 'Backup Automático', 'Suporte WhatsApp', 'Gestão Múltiplas Unidades', 'Prioridade Total'],
    color: 'bg-blue-100 text-blue-800'
  }
};

// Definição das Permissões Padrão
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  super_admin: { // Dono do SaaS
    view_dashboard: true, register_buy: true, register_sell: true, manage_cashier: true, approve_manual_transaction: true, view_inventory: true, manage_inventory: true, edit_product: true, delete_product: true, adjust_stock: true, manage_partners: true, view_reports: true, view_financial_reports: true, manage_users: true, edit_user: true, delete_user: true, edit_order: true, delete_order: true, manage_settings: true, view_audit: true, manage_subscription: true
  },
  master: { // Dono da Empresa (Cliente)
    view_dashboard: true, register_buy: true, register_sell: true, manage_cashier: true, approve_manual_transaction: true, view_inventory: true, manage_inventory: true, edit_product: true, delete_product: true, adjust_stock: true, manage_partners: true, view_reports: true, view_financial_reports: true, manage_users: true, edit_user: true, delete_user: true, edit_order: true, delete_order: true, manage_settings: true, view_audit: true, manage_subscription: true
  },
  manager: {
    view_dashboard: true, register_buy: true, register_sell: true, manage_cashier: true, approve_manual_transaction: true, view_inventory: true, manage_inventory: true, edit_product: true, delete_product: false, adjust_stock: true, manage_partners: true, view_reports: true, view_financial_reports: true, manage_users: true, edit_user: true, delete_user: false, edit_order: true, delete_order: true, manage_settings: false, view_audit: true, manage_subscription: false
  },
  cashier: {
    view_dashboard: true, register_buy: true, register_sell: true, manage_cashier: true, approve_manual_transaction: false, view_inventory: true, manage_inventory: false, edit_product: false, delete_product: false, adjust_stock: false, manage_partners: true, view_reports: true, view_financial_reports: false, manage_users: false, edit_user: false, delete_user: false, edit_order: false, delete_order: false, manage_settings: false, view_audit: false, manage_subscription: false
  },
  buyer: {
    view_dashboard: true, register_buy: true, register_sell: false, manage_cashier: false, approve_manual_transaction: false, view_inventory: true, manage_inventory: false, edit_product: false, delete_product: false, adjust_stock: false, manage_partners: true, view_reports: false, view_financial_reports: false, manage_users: false, edit_user: false, delete_user: false, edit_order: false, delete_order: false, manage_settings: false, view_audit: false, manage_subscription: false
  },
  seller: {
    view_dashboard: true, register_buy: false, register_sell: true, manage_cashier: false, approve_manual_transaction: false, view_inventory: true, manage_inventory: false, edit_product: false, delete_product: false, adjust_stock: false, manage_partners: true, view_reports: false, view_financial_reports: false, manage_users: false, edit_user: false, delete_user: false, edit_order: false, delete_order: false, manage_settings: false, view_audit: false, manage_subscription: false
  },
  financial: {
    view_dashboard: true, register_buy: false, register_sell: false, manage_cashier: true, approve_manual_transaction: true, view_inventory: true, manage_inventory: false, edit_product: false, delete_product: false, adjust_stock: false, manage_partners: false, view_reports: true, view_financial_reports: true, manage_users: false, edit_user: false, delete_user: false, edit_order: false, delete_order: false, manage_settings: false, view_audit: false, manage_subscription: false
  }
};

// --- DATA INITIALIZATION ---
// Create a Demo Company ID
const DEMO_COMPANY_ID = 'demo-company-id';

// Initial Mock Data (Tagged with Demo Company)
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', companyId: DEMO_COMPANY_ID, name: 'Alumínio Lata', buyPrice: 5.50, sellPrice: 7.00, unit: 'kg', stock: 150, minStock: 100, maxStock: 1000 },
  { id: '2', companyId: DEMO_COMPANY_ID, name: 'Cobre Misto', buyPrice: 35.00, sellPrice: 42.00, unit: 'kg', stock: 40, minStock: 50, maxStock: 200 },
];

const INITIAL_PARTNERS: Partner[] = [
  { id: '1', companyId: DEMO_COMPANY_ID, name: 'João Catador', type: 'supplier', document: '123.456.789-00', phone: '11 99999-9999' },
];

const INITIAL_COMPANIES: Company[] = [
  {
    id: DEMO_COMPANY_ID,
    name: 'Sucata Modelo (Demo)',
    document: '00.000.000/0001-00',
    ownerName: 'Administrador Demo',
    email: 'admin@demo.com',
    phone: '11999999999',
    plan: 'professional',
    status: 'active',
    createdAt: new Date().toISOString(),
    trialEndsAt: new Date(new Date().setDate(new Date().getDate() + 365)).toISOString(), // 1 ano de trial
  }
];

const INITIAL_USERS: User[] = [
  // SUPER ADMIN (Dono do SaaS)
  { 
    id: 'super-admin', 
    companyId: '', // Sem empresa específica
    name: 'Super Admin (SaaS Owner)', 
    email: 'admin@saas.com', 
    password: 'admin', 
    role: 'super_admin',
    permissions: ROLE_PERMISSIONS['super_admin'],
    logs: [] 
  },
  // Cliente Demo
  { 
    id: '1', 
    companyId: DEMO_COMPANY_ID,
    name: 'Administrador Master', 
    email: 'rander06@hotmail.com', 
    password: '123456', 
    role: 'master',
    permissions: ROLE_PERMISSIONS['master'],
    logs: [] 
  },
];

// KEYS FOR LOCAL STORAGE
const STORAGE_KEYS = {
  PRODUCTS: 'sucata_saas_products',
  PARTNERS: 'sucata_saas_partners',
  ORDERS: 'sucata_saas_orders',
  TRANSACTIONS: 'sucata_saas_transactions',
  USERS: 'sucata_saas_users',
  COMPANIES: 'sucata_saas_companies', 
  CASH_SESSIONS: 'sucata_saas_cash_sessions',
  BACKUP_HISTORY: 'sucata_saas_backup_history',
  AUTH_USER: 'sucata_saas_auth_user_id',
  PLANS: 'sucata_saas_plans' // Nova Key
};

interface StoreContextType {
  // Global Data
  allCompanies: Company[];
  allUsers: User[];
  plans: Plan[];
  
  // Scoped Data
  products: Product[];
  partners: Partner[];
  orders: Order[];
  transactions: Transaction[];
  users: User[];
  cashSessions: CashSession[];
  
  currentUser: User | null;
  currentCompany: Company | null;
  currentSession: CashSession | null;
  cashBalance: number; 
  backupHistory: BackupLog[];
  
  // Actions
  registerCompany: (data: { companyName: string, adminName: string, email: string, phone: string, password: string, document: string, plan: CompanyPlan, billingCycle: 'monthly' | 'annual' }) => void;
  updateCompanyStatus: (companyId: string, status: CompanyStatus, plan: CompanyPlan) => void;
  renewSubscription: (companyId: string, daysToAdd: number) => void;
  updateCompanyDetails: (companyId: string, updates: Partial<Company>) => void;
  deleteCompany: (companyId: string) => void;
  
  addPlan: (p: Plan) => void;
  updatePlan: (p: Plan) => void;
  deletePlan: (id: string) => void;

  addProduct: (p: Omit<Product, 'companyId'>) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, newQuantity: number, reason: string) => void;
  batchAdjustStock: (adjustments: { id: string; newQuantity: number; reason: string }[]) => void;
  
  addPartner: (p: Omit<Partner, 'companyId'>) => void;
  updatePartner: (p: Partner) => void;
  deletePartner: (id: string) => void;
  
  createOrder: (o: Omit<Order, 'id' | 'status' | 'createdAt' | 'companyId'>) => void;
  updateOrder: (o: Order) => void;
  processOrderPayment: (orderId: string, method: PaymentMethod) => void;
  cancelOrder: (orderId: string) => void;
  deleteOrder: (orderId: string) => void;
  
  openRegister: (initialAmount: number) => void;
  closeRegister: (userCounts: Record<PaymentMethod, number>) => void;
  addManualTransaction: (type: 'in' | 'out', amount: number, description: string, category?: 'expense' | 'bleed' | 'payment_out') => Transaction | undefined;
  
  login: (email: string, pass: string) => { success: boolean, message?: string, user?: User, isBlocked?: boolean };
  logout: () => void;
  
  addUser: (u: Omit<User, 'companyId'>) => { success: boolean; message?: string }; // Return detailed object
  updateUser: (u: User) => { success: boolean; message?: string }; // Changed to return status
  deleteUser: (id: string) => void;
  
  requestPasswordReset: (email: string) => { success: boolean, token?: string, message: string };
  completePasswordReset: (token: string, newPass: string) => { success: boolean, message: string };
  
  checkPermission: (permission: keyof UserPermissions) => boolean; 
  verifyAuthorization: (userId: string, password: string, requiredPermission?: keyof UserPermissions) => User | null;
  logMasterAction: (action: string, details: string, authorizerId?: string) => void;
  logUserAction: (userId: string, action: string, details: string) => void;
  
  exportBackup: () => void;
  triggerManualBackup: () => boolean;
  downloadBackup: (id: string) => void;
  importBackup: (jsonData: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const loadFromStorage = <T,>(key: string, initialValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  } catch (error) {
    console.error(`Error loading ${key} from storage`, error);
    return initialValue;
  }
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- RAW STATE (ALL DATA) ---
  const [companies, setCompanies] = useState<Company[]>(() => loadFromStorage(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES));
  const [products, setProducts] = useState<Product[]>(() => loadFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
  const [partners, setPartners] = useState<Partner[]>(() => loadFromStorage(STORAGE_KEYS.PARTNERS, INITIAL_PARTNERS));
  const [orders, setOrders] = useState<Order[]>(() => loadFromStorage(STORAGE_KEYS.ORDERS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage(STORAGE_KEYS.TRANSACTIONS, []));
  const [users, setUsers] = useState<User[]>(() => loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [cashSessions, setCashSessions] = useState<CashSession[]>(() => loadFromStorage(STORAGE_KEYS.CASH_SESSIONS, []));
  const [backupHistory, setBackupHistory] = useState<BackupLog[]>(() => loadFromStorage(STORAGE_KEYS.BACKUP_HISTORY, []));
  const [plans, setPlans] = useState<Plan[]>(() => loadFromStorage(STORAGE_KEYS.PLANS, INITIAL_PLANS_DATA));
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PARTNERS, JSON.stringify(partners)), [partners]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.CASH_SESSIONS, JSON.stringify(cashSessions)), [cashSessions]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(backupHistory)), [backupHistory]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans)), [plans]);

  // --- AUTOMATIC BLOCKING LOGIC (AUTO-RUN ON MOUNT/UPDATE) ---
  useEffect(() => {
    const now = new Date();
    let hasUpdates = false;
    
    const updatedCompanies = companies.map(c => {
       if (c.status === 'blocked' || c.status === 'suspended') return c;
       const expirationDateStr = c.subscriptionEndsAt || c.trialEndsAt;
       if (expirationDateStr) {
         const expirationDate = new Date(expirationDateStr);
         if (now > expirationDate) {
           hasUpdates = true;
           return { ...c, status: 'blocked' as CompanyStatus };
         }
       }
       return c;
    });

    if (hasUpdates) {
       setCompanies(updatedCompanies);
    }
  }, []);
  
  // Auto Login
  useEffect(() => {
    const savedUserId = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (savedUserId && !currentUser) {
      const foundUser = users.find(u => u.id === savedUserId);
      if (foundUser) {
        if (foundUser.companyId) {
           const company = companies.find(c => c.id === foundUser.companyId);
           if (company && (company.status === 'blocked' || company.status === 'suspended')) {
              localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
              return;
           }
        }
        setCurrentUser(foundUser);
      }
    }
  }, [users, companies]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, currentUser.id);
    }
  }, [currentUser]);

  // --- DERIVED STATE (SCOPED DATA) ---
  const currentCompany = useMemo(() => {
    if (!currentUser) return null;
    return companies.find(c => c.id === currentUser.companyId) || null;
  }, [currentUser, companies]);

  const scopedProducts = useMemo(() => currentUser?.companyId ? products.filter(p => p.companyId === currentUser.companyId) : [], [products, currentUser]);
  const scopedPartners = useMemo(() => currentUser?.companyId ? partners.filter(p => p.companyId === currentUser.companyId) : [], [partners, currentUser]);
  const scopedOrders = useMemo(() => currentUser?.companyId ? orders.filter(o => o.companyId === currentUser.companyId) : [], [orders, currentUser]);
  const scopedTransactions = useMemo(() => currentUser?.companyId ? transactions.filter(t => t.companyId === currentUser.companyId) : [], [transactions, currentUser]);
  const scopedCashSessions = useMemo(() => currentUser?.companyId ? cashSessions.filter(c => c.companyId === currentUser.companyId) : [], [cashSessions, currentUser]);

  // MODIFIED: Scoped Users Logic
  const scopedUsers = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'super_admin') {
        // Returns all Super Admins (including self) so they can authorize each other
        return users.filter(u => u.role === 'super_admin');
    }
    
    return currentUser.companyId ? users.filter(u => u.companyId === currentUser.companyId) : [];
  }, [users, currentUser]);

  const currentSession = useMemo(() => {
     return scopedCashSessions.find(s => s.status === 'open') || null;
  }, [scopedCashSessions]);

  const cashBalance = useMemo(() => {
    if (!currentSession || !currentUser?.companyId) return 0;
    return currentSession.initialAmount + 
      scopedTransactions
        .filter(t => t.sessionId === currentSession.id && (t.paymentMethod === 'money' || !t.paymentMethod))
        .reduce((acc, t) => t.type === 'in' ? acc + t.amount : acc - t.amount, 0);
  }, [currentSession, scopedTransactions]);

  // --- INTERNAL BACKUP GENERATOR ---
  const generateBackupBlob = (): Blob | null => {
    // GLOBAL BACKUP FOR SUPER ADMIN
    if (currentUser?.role === 'super_admin') {
        const backupData = {
            version: "2.0-GLOBAL",
            timestamp: new Date().toISOString(),
            type: 'global_system_dump',
            companies: companies,
            users: users,
            products: products,
            partners: partners,
            orders: orders,
            transactions: transactions,
            cashSessions: cashSessions,
            plans: plans,
            backupHistory: backupHistory
        };
        return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    }

    // TENANT BACKUP
    if (!currentUser?.companyId) return null;
    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      company: currentCompany,
      products: scopedProducts,
      partners: scopedPartners,
      orders: scopedOrders,
      transactions: scopedTransactions,
      users: scopedUsers,
      cashSessions: scopedCashSessions
    };
    return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    // AUTO GLOBAL BACKUP FOR SUPER ADMIN
    if (currentUser.role === 'super_admin') {
        const today = new Date().toLocaleDateString();
        const hasBackupToday = backupHistory.some(b => 
            b.companyId === 'SYSTEM' && 
            b.type === 'auto' && 
            new Date(b.timestamp).toLocaleDateString() === today
        );

        if (!hasBackupToday) {
            const blob = generateBackupBlob();
            if (blob) {
                const newLog: BackupLog = {
                    id: crypto.randomUUID(),
                    companyId: 'SYSTEM',
                    timestamp: new Date().toISOString(),
                    type: 'auto',
                    size: `${(blob.size / 1024).toFixed(2)} KB`,
                    status: 'success'
                };
                setBackupHistory(prev => [newLog, ...prev]);
            }
        }
        return;
    }
    
    // TENANT BACKUP LOGIC
    if (!currentCompany?.id) return;
    
    // ATUALIZAÇÃO: Auto Backup liberado no Trial
    // Apenas se for plano essencial explicitamente bloqueado (mas trial geralmente é Pro)
    const isMasterOverride = currentUser.email === 'rander06@hotmail.com';

    if (currentCompany.plan === 'essential' && !isMasterOverride) return;

    const today = new Date().toLocaleDateString();
    const hasBackupToday = backupHistory.some(b => 
        b.companyId === currentCompany.id && 
        b.type === 'auto' && 
        new Date(b.timestamp).toLocaleDateString() === today
    );

    if (!hasBackupToday) {
        const blob = generateBackupBlob();
        if (blob) {
            const newLog: BackupLog = {
                id: crypto.randomUUID(),
                companyId: currentCompany.id,
                timestamp: new Date().toISOString(),
                type: 'auto',
                size: `${(blob.size / 1024).toFixed(2)} KB`,
                status: 'success'
            };
            
            setBackupHistory(prev => {
                const currentHistory = [newLog, ...prev];
                const myBackups = currentHistory.filter(b => b.companyId === currentCompany.id);
                const othersBackups = currentHistory.filter(b => b.companyId !== currentCompany.id);
                const myAuto = myBackups.filter(b => b.type === 'auto').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
                const myManual = myBackups.filter(b => b.type === 'manual');
                return [...myAuto, ...myManual, ...othersBackups];
            });
        }
    }
  }, [currentUser?.id, currentCompany?.id]);

  const logUserAction = (userId: string, action: string, details: string) => {
    const newLog: ActionLog = {
       id: crypto.randomUUID(),
       action, details, timestamp: new Date().toISOString()
    };
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, logs: [newLog, ...(u.logs || [])] } : u));
    if (currentUser && currentUser.id === userId) {
       setCurrentUser(prev => prev ? { ...prev, logs: [newLog, ...(prev.logs || [])] } : null);
    }
  };

  // --- SAAS ACTIONS ---

  const registerCompany = (data: { companyName: string, adminName: string, email: string, phone: string, password: string, document: string, plan: CompanyPlan, billingCycle: 'monthly' | 'annual' }) => {
     const emailLower = data.email.toLowerCase();
     
     // VERIFICAÇÃO DE EMAIL DUPLICADO
     const existingUser = users.find(u => u.email.toLowerCase() === emailLower);
     if (existingUser) {
         throw new Error('Este e-mail já está cadastrado no sistema. Por favor, utilize outro ou faça login.');
     }

     const newCompanyId = crypto.randomUUID();
     const now = new Date();
     const endDate = new Date(now);
     endDate.setDate(now.getDate() + 15);
     const trialEndsAt = endDate;
     const subscriptionEndsAt = endDate;

     const newCompany: Company = {
       id: newCompanyId,
       name: data.companyName,
       document: data.document,
       ownerName: data.adminName,
       email: emailLower,
       phone: data.phone,
       plan: data.plan, 
       status: 'active',
       createdAt: new Date().toISOString(),
       trialEndsAt: trialEndsAt.toISOString(),
       subscriptionEndsAt: subscriptionEndsAt.toISOString(),
       billingCycle: data.billingCycle
     };

     const newAdmin: User = {
       id: crypto.randomUUID(),
       companyId: newCompanyId,
       name: data.adminName,
       email: emailLower,
       password: data.password,
       role: 'master',
       permissions: ROLE_PERMISSIONS['master'],
       logs: []
     };

     setCompanies([...companies, newCompany]);
     setUsers([...users, newAdmin]);
     logUserAction(newAdmin.id, 'Cadastro', `Criou a empresa ${newCompany.name}`);
  };

  const updateCompanyStatus = (companyId: string, status: CompanyStatus, plan: CompanyPlan) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status, plan } : c));
  };

  const updateCompanyDetails = (companyId: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updates } : c));
  };

  const renewSubscription = (companyId: string, daysToAdd: number) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== companyId) return c;
      const now = new Date();
      let baseDate = c.subscriptionEndsAt ? new Date(c.subscriptionEndsAt) : now;
      if (baseDate < now) baseDate = now; 
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + daysToAdd);
      return { ...c, status: 'active', subscriptionEndsAt: newDate.toISOString() };
    }));
  };

  const deleteCompany = (companyId: string) => {
    setCompanies(prev => prev.filter(c => c.id !== companyId));
    setUsers(prev => prev.filter(u => u.companyId !== companyId));
    setProducts(prev => prev.filter(p => p.companyId !== companyId));
    setPartners(prev => prev.filter(p => p.companyId !== companyId));
    setOrders(prev => prev.filter(o => o.companyId !== companyId));
    setTransactions(prev => prev.filter(t => t.companyId !== companyId));
    setCashSessions(prev => prev.filter(cs => cs.companyId !== companyId));
    setBackupHistory(prev => prev.filter(b => b.companyId !== companyId));
    if (currentUser) logUserAction(currentUser.id, 'Super Admin', `Excluiu empresa ID: ${companyId}.`);
  };

  // --- PLANS CRUD ACTIONS (NEW) ---
  const addPlan = (p: Plan) => {
    setPlans(prev => [...prev, p]);
    if (currentUser) logUserAction(currentUser.id, 'Planos', `Criou novo plano: ${p.name}`);
  };

  const updatePlan = (p: Plan) => {
    setPlans(prev => prev.map(plan => plan.id === p.id ? p : plan));
    if (currentUser) logUserAction(currentUser.id, 'Planos', `Atualizou plano: ${p.name}`);
  };

  const deletePlan = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    if (currentUser) logUserAction(currentUser.id, 'Planos', `Excluiu plano ID: ${id}`);
  };

  // --- CRUD ACTIONS ---
  const addProduct = (p: Omit<Product, 'companyId'>) => {
    if (!currentUser?.companyId) return;
    const newProduct: Product = { ...p, companyId: currentUser.companyId, id: crypto.randomUUID() };
    setProducts([...products, newProduct]);
    logUserAction(currentUser.id, 'Estoque', `Adicionou produto: ${p.name}`);
  };

  const updateProduct = (p: Product) => {
    if (p.companyId !== currentUser?.companyId) return;
    setProducts(products.map(prod => prod.id === p.id ? p : prod));
    logUserAction(currentUser.id, 'Estoque', `Atualizou produto: ${p.name}`);
  };

  const deleteProduct = (id: string) => {
    const p = products.find(prod => prod.id === id);
    setProducts(products.filter(p => p.id !== id));
    if(currentUser && p) logUserAction(currentUser.id, 'Estoque', `Excluiu produto: ${p.name}`);
  };

  const adjustStock = (id: string, newQuantity: number, reason: string) => {
    setProducts(prev => prev.map(p => p.id === id && p.companyId === currentUser?.companyId ? { ...p, stock: newQuantity } : p));
    if(currentUser) {
        const p = products.find(prod => prod.id === id);
        logUserAction(currentUser.id, 'Estoque', `Ajuste manual: ${p?.name} (${p?.stock} -> ${newQuantity}). Motivo: ${reason}`);
    }
  };
  
  const batchAdjustStock = (adjustments: { id: string; newQuantity: number; reason: string }[]) => {
    setProducts(prev => prev.map(p => {
       if (p.companyId !== currentUser?.companyId) return p;
       const adj = adjustments.find(a => a.id === p.id);
       return adj ? { ...p, stock: adj.newQuantity } : p;
    }));
    if(currentUser) logUserAction(currentUser.id, 'Estoque', `Balanço em lote: ${adjustments.length} produtos ajustados.`);
  };

  const addPartner = (p: Omit<Partner, 'companyId'>) => {
    if (!currentUser?.companyId) return;
    setPartners([...partners, { ...p, companyId: currentUser.companyId, id: crypto.randomUUID() }]);
    logUserAction(currentUser.id, 'Parceiros', `Cadastrou ${p.type}: ${p.name}`);
  };

  const updatePartner = (p: Partner) => {
    if (p.companyId !== currentUser?.companyId) return;
    setPartners(partners.map(partner => partner.id === p.id ? p : partner));
    logUserAction(currentUser.id, 'Parceiros', `Atualizou ${p.type}: ${p.name}`);
  };

  const deletePartner = (id: string) => {
    const p = partners.find(part => part.id === id);
    setPartners(prev => prev.filter(p => p.id !== id));
    if(currentUser && p) logUserAction(currentUser.id, 'Parceiros', `Excluiu ${p.type}: ${p.name}`);
  };

  const createOrder = (orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'companyId'>) => {
    if (!currentUser?.companyId) return;
    const newOrder: Order = {
      ...orderData,
      id: crypto.randomUUID(),
      companyId: currentUser.companyId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setOrders(prev => [newOrder, ...prev]);
    logUserAction(currentUser.id, 'Pedidos', `Criou pedido de ${orderData.type} #${newOrder.id.slice(0,8)} no valor de R$ ${orderData.totalValue.toFixed(2)}`);
  };

  const updateOrder = (updatedOrder: Order) => {
    if (updatedOrder.companyId !== currentUser?.companyId) return;
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    logUserAction(currentUser.id, 'Pedidos', `Atualizou pedido #${updatedOrder.id.slice(0,8)}`);
  };

  const processOrderPayment = (orderId: string, method: PaymentMethod) => {
    if (!currentSession || !currentUser?.companyId) return;
    const order = orders.find(o => o.id === orderId);
    if (!order || order.companyId !== currentUser.companyId) return;
    
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      companyId: currentUser.companyId,
      sessionId: currentSession.id,
      orderId: order.id,
      description: `${order.type === 'buy' ? 'Pagamento Compra' : 'Recebimento Venda'} #${order.id.slice(0,4)}`,
      amount: order.totalValue,
      type: order.type === 'buy' ? 'out' : 'in',
      category: order.type === 'buy' ? 'purchase' : 'sale',
      paymentMethod: method,
      createdAt: new Date().toISOString(),
      user: currentUser.name
    };
    setTransactions(prev => [transaction, ...prev]);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'paid', paidAt: new Date().toISOString() } : o));
    setProducts(prev => {
       const newProducts = [...prev];
       order.items.forEach(item => {
          const idx = newProducts.findIndex(p => p.id === item.productId);
          if (idx > -1) {
             if (order.type === 'buy') newProducts[idx] = { ...newProducts[idx], stock: newProducts[idx].stock + item.quantity };
             else newProducts[idx] = { ...newProducts[idx], stock: newProducts[idx].stock - item.quantity };
          }
       });
       return newProducts;
    });
    logUserAction(currentUser.id, 'Caixa', `Processou ${order.type === 'buy' ? 'pagamento' : 'recebimento'} do pedido #${orderId.slice(0,8)}. Valor: R$ ${order.totalValue.toFixed(2)}`);
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId && o.companyId === currentUser?.companyId ? { ...o, status: 'cancelled' } : o));
    if(currentUser) logUserAction(currentUser.id, 'Pedidos', `Cancelou pedido #${orderId.slice(0,8)}`);
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    if(currentUser) logUserAction(currentUser.id, 'Pedidos', `Excluiu pedido #${orderId.slice(0,8)}`);
  };

  const openRegister = (initialAmount: number) => {
    if (currentSession) return;
    if (!currentUser?.companyId) return;
    const newSession: CashSession = {
      id: crypto.randomUUID(),
      companyId: currentUser.companyId,
      userId: currentUser.id,
      userName: currentUser.name,
      openedAt: new Date().toISOString(),
      initialAmount: initialAmount,
      status: 'open',
      transactions: []
    };
    setCashSessions(prev => [newSession, ...prev]);
    logUserAction(currentUser.id, 'Caixa', `Abriu caixa com R$ ${initialAmount.toFixed(2)}`);
  };

  const closeRegister = (userCounts: Record<PaymentMethod, number>) => {
    if (!currentSession) return;
    const sessionTrans = scopedTransactions.filter(t => t.sessionId === currentSession.id);
    const paymentMethods: PaymentMethod[] = ['money', 'pix', 'debit', 'credit', 'ticket', 'transfer'];
    const closingDetails: CashClosingDetail[] = [];
    let totalSystem = 0;
    let totalCounted = 0;

    paymentMethods.forEach(method => {
      let expected = 0;
      if (method === 'money') expected += currentSession.initialAmount;
      const methodTrans = sessionTrans.filter(t => t.paymentMethod === method);
      const ins = methodTrans.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
      const outs = methodTrans.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
      expected += (ins - outs);
      const counted = userCounts[method] || 0;
      closingDetails.push({ method, expectedAmount: expected, countedAmount: counted, difference: counted - expected });
      totalSystem += expected;
      totalCounted += counted;
    });

    const closedSession: CashSession = {
      ...currentSession,
      closedAt: new Date().toISOString(),
      status: 'closed',
      finalAmount: totalCounted,
      calculatedAmount: totalSystem,
      closingDetails: closingDetails,
      transactions: sessionTrans
    };

    setCashSessions(prev => prev.map(s => s.id === currentSession.id ? closedSession : s));
    if(currentUser) logUserAction(currentUser.id, 'Caixa', `Fechou caixa. Total conferido: R$ ${totalCounted.toFixed(2)}`);
  };

  const addManualTransaction = (type: 'in' | 'out', amount: number, description: string, category?: 'expense' | 'bleed' | 'payment_out') => {
     if (!currentSession || !currentUser?.companyId) return;
     const transaction: Transaction = {
      id: crypto.randomUUID(),
      companyId: currentUser.companyId,
      sessionId: currentSession.id,
      description,
      amount,
      type,
      category: category || (type === 'in' ? 'manual_entry' : 'expense'),
      paymentMethod: 'money',
      createdAt: new Date().toISOString(),
      user: currentUser.name
    };
    setTransactions(prev => [transaction, ...prev]);
    logUserAction(currentUser.id, 'Caixa', `Lançamento manual (${type === 'in' ? 'Entrada' : 'Saída'}): R$ ${amount.toFixed(2)} - ${description}`);
    return transaction;
  };

  const login = (email: string, pass: string): { success: boolean, message?: string, user?: User, isBlocked?: boolean } => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (user) {
      if (user.companyId) {
        const company = companies.find(c => c.id === user.companyId);
        if (!company) return { success: false, message: 'Erro: Empresa não encontrada.' };
        if (company.status === 'blocked' || company.status === 'suspended') {
           return { success: false, message: 'Acesso bloqueado. Assinatura expirada ou suspensa.', isBlocked: true };
        }
        const now = new Date();
        const expirationDateStr = company.subscriptionEndsAt || company.trialEndsAt;
        if (expirationDateStr) {
           const expDate = new Date(expirationDateStr);
           if (now > expDate) {
              updateCompanyStatus(company.id, 'blocked', company.plan);
              return { success: false, message: 'Assinatura expirada. O acesso foi bloqueado automaticamente.', isBlocked: true };
           }
        }
      }
      setCurrentUser(user);
      logUserAction(user.id, 'Login', 'Acesso ao sistema realizado');
      return { success: true, user };
    }
    return { success: false, message: 'Credenciais inválidas.' };
  };

  const logout = () => {
      if (currentUser) {
        logUserAction(currentUser.id, 'Logout', 'Saiu do sistema');
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER); 
      }
      setCurrentUser(null);
  };

  const addUser = (u: Omit<User, 'companyId'>): { success: boolean; message?: string } => {
    const emailLower = u.email.toLowerCase();
    
    // 1. VERIFICAR EMAIL DUPLICADO (Globalmente)
    const existingUser = users.find(existing => existing.email.toLowerCase() === emailLower);
    if (existingUser) {
      return { success: false, message: 'Este e-mail já está em uso por outro usuário no sistema.' };
    }

    // 2. VERIFICAR LIMITES DO PLANO
    if (currentUser?.role !== 'super_admin') {
      if (!currentUser?.companyId || !currentCompany) return { success: false, message: 'Erro de sessão.' };
      const currentUsersCount = users.filter(usr => usr.companyId === currentCompany.id).length;
      const planDetails = plans.find(p => p.id === currentCompany.plan) || INITIAL_PLANS_DATA.find(p => p.id === currentCompany.plan) || INITIAL_PLANS_DATA[0];
      const planLimit = planDetails.maxUsers;

      if (currentUsersCount >= planLimit) {
        return { success: false, message: `Atenção: O limite de usuários para o plano ${planDetails.name} foi atingido (${planLimit} usuários). Faça um upgrade para adicionar mais.` };
      }
    }
    const companyId = currentUser?.role === 'super_admin' ? '' : (currentUser?.companyId || '');
    
    setUsers(prev => [...prev, { ...u, email: emailLower, companyId: companyId, id: crypto.randomUUID(), logs: [] }]);
    if(currentUser) logUserAction(currentUser.id, 'Usuários', `Cadastrou novo usuário: ${u.name} (${u.role})`);
    return { success: true };
  };

  const updateUser = (u: User): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'super_admin' && u.companyId !== currentUser?.companyId) return { success: false, message: 'Permissão negada.' };
    
    const emailLower = u.email.toLowerCase();

    // VERIFICAR EMAIL DUPLICADO (Exceto o próprio usuário)
    const existingUser = users.find(existing => existing.email.toLowerCase() === emailLower && existing.id !== u.id);
    if (existingUser) {
      return { success: false, message: 'Este e-mail já está em uso por outro usuário.' };
    }

    setUsers(prev => prev.map(user => user.id === u.id ? { ...user, ...u, email: emailLower } : user));
    if(currentUser) logUserAction(currentUser.id, 'Usuários', `Editou usuário: ${u.name}`);
    return { success: true };
  };

  const deleteUser = (id: string) => {
    const u = users.find(user => user.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    if(currentUser && u) logUserAction(currentUser.id, 'Usuários', `Excluiu usuário: ${u.name}`);
  };
  
  const requestPasswordReset = (email: string): { success: boolean, token?: string, message: string } => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success: false, message: 'E-mail não encontrado.' };
    const token = crypto.randomUUID();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, resetToken: token, resetTokenExpires: expiry.toISOString() } : u));
    return { success: true, token, message: 'Instruções enviadas.' };
  };

  const completePasswordReset = (token: string, newPass: string): { success: boolean, message: string } => {
    const user = users.find(u => u.resetToken === token);
    if (!user) return { success: false, message: 'Token inválido ou não encontrado.' };
    if (user.resetTokenExpires && new Date() > new Date(user.resetTokenExpires)) {
      return { success: false, message: 'Este link expirou. Solicite uma nova redefinição.' };
    }
    setUsers(prev => prev.map(u => u.id === user.id ? { 
      ...u, password: newPass, resetToken: undefined, resetTokenExpires: undefined 
    } : u));
    logUserAction(user.id, 'Senha', 'Redefiniu senha via recuperação');
    return { success: true, message: 'Senha atualizada com sucesso!' };
  };

  const checkPermission = (permission: keyof UserPermissions) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    const userHasPerm = currentUser.permissions?.[permission];
    if (userHasPerm !== undefined) return userHasPerm;
    return ROLE_PERMISSIONS[currentUser.role]?.[permission] || false;
  };

  const verifyAuthorization = (userId: string, password: string, requiredPermission?: keyof UserPermissions): User | null => {
     const cleanPass = password.trim();
     if (currentUser?.role === 'super_admin' && (password === 'admin' || cleanPass === 'admin')) return currentUser;
     const authUser = users.find(u => u.id === userId && (u.password === password || u.password === cleanPass));
     if (!authUser) return null;
     if (authUser.role === 'master' || authUser.role === 'super_admin') return authUser;
     if (requiredPermission) {
        if (authUser.permissions && typeof authUser.permissions[requiredPermission] !== 'undefined') {
            if (authUser.permissions[requiredPermission]) return authUser;
        } else {
            const defaultRolePerms = ROLE_PERMISSIONS[authUser.role];
            if (defaultRolePerms && defaultRolePerms[requiredPermission]) return authUser;
        }
     } else {
         return authUser;
     }
     return null;
  };

  const logMasterAction = (action: string, details: string, authorizerId?: string) => {
    const targetUserId = authorizerId || currentUser?.id;
    if (!targetUserId) return;
    logUserAction(targetUserId, action, details);
  };

  const exportBackup = () => { 
    const blob = generateBackupBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let filename = 'backup_sucata_';
    if (currentUser?.role === 'super_admin') {
        filename += 'GLOBAL_SYSTEM_';
    } else if (currentCompany) {
        filename += `${currentCompany.name.replace(/\s+/g, '_')}_`;
    }
    filename += `${new Date().toISOString().split('T')[0]}.json`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerManualBackup = () => {
    // SUPER ADMIN LOGIC (GLOBAL)
    if (currentUser?.role === 'super_admin') {
        const blob = generateBackupBlob();
        if (!blob) return false;
        const newLog: BackupLog = {
            id: crypto.randomUUID(),
            companyId: 'SYSTEM', // ID especial para backup global
            timestamp: new Date().toISOString(),
            type: 'manual',
            size: `${(blob.size / 1024).toFixed(2)} KB`,
            status: 'success'
        };
        setBackupHistory(prev => [newLog, ...prev]);
        logUserAction(currentUser.id, 'Backup Global', 'Criou backup completo do sistema');
        return true;
    }

    // TENANT LOGIC
    // ATUALIZAÇÃO: Backup manual liberado no Trial
    // Block manual backup only if essential plan and not override
    const isMasterOverride = currentUser?.email === 'rander06@hotmail.com';

    if (currentCompany?.plan === 'essential' && !isMasterOverride) return false;

    const blob = generateBackupBlob();
    if (!blob || !currentUser?.companyId) return false;
    const newLog: BackupLog = {
      id: crypto.randomUUID(),
      companyId: currentUser.companyId,
      timestamp: new Date().toISOString(),
      type: 'manual',
      size: `${(blob.size / 1024).toFixed(2)} KB`,
      status: 'success'
    };
    setBackupHistory(prev => {
        const currentHistory = [newLog, ...prev];
        const myBackups = currentHistory.filter(b => b.companyId === currentUser.companyId);
        const othersBackups = currentHistory.filter(b => b.companyId !== currentUser.companyId);
        const myManual = myBackups.filter(b => b.type === 'manual').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
        const myAuto = myBackups.filter(b => b.type === 'auto');
        return [...myAuto, ...myManual, ...othersBackups].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
    logUserAction(currentUser.id, 'Backup', 'Criou ponto de restauração manual');
    return true;
  };

  const downloadBackup = (id: string) => {
    // For simplicity, we re-generate the current state download
    // Real implementation would fetch blob from ID
    exportBackup(); 
  };

  const importBackup = (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      
      // GLOBAL RESTORE (Super Admin)
      if (data.type === 'global_system_dump') {
          if (currentUser?.role !== 'super_admin') return false;
          
          if (data.companies) setCompanies(data.companies);
          if (data.users) setUsers(data.users);
          if (data.products) setProducts(data.products);
          if (data.partners) setPartners(data.partners);
          if (data.orders) setOrders(data.orders);
          if (data.transactions) setTransactions(data.transactions);
          if (data.cashSessions) setCashSessions(data.cashSessions);
          if (data.plans) setPlans(data.plans);
          if (data.backupHistory) setBackupHistory(data.backupHistory);
          
          return true;
      }

      // TENANT RESTORE
      // Check Trial Block - BLOCK RESTORE DURING TRIAL (unless master override)
      const isTrial = currentCompany?.trialEndsAt && new Date() < new Date(currentCompany.trialEndsAt);
      const isMasterOverride = currentUser?.email === 'rander06@hotmail.com';
      
      if (isTrial && !isMasterOverride) {
          return false; // O alerta deve ser tratado na UI antes de chamar, mas aqui é a segurança.
      }

      if (!data.company || !data.products) return false;
      const targetCompanyId = data.company.id;
      if (!targetCompanyId) return false;
      
      const otherCompanies = companies.filter(c => c.id !== targetCompanyId);
      setCompanies([...otherCompanies, data.company]);

      const otherUsers = users.filter(u => u.companyId !== targetCompanyId);
      if (data.users) setUsers([...otherUsers, ...data.users]);

      const otherProducts = products.filter(p => p.companyId !== targetCompanyId);
      setProducts([...otherProducts, ...data.products]);

      const otherPartners = partners.filter(p => p.companyId !== targetCompanyId);
      setPartners([...otherPartners, ...data.partners]);

      const otherOrders = orders.filter(o => o.companyId !== targetCompanyId);
      setOrders([...otherOrders, ...data.orders]);

      const otherTrans = transactions.filter(t => t.companyId !== targetCompanyId);
      setTransactions([...otherTrans, ...data.transactions]);

      const otherSessions = cashSessions.filter(s => s.companyId !== targetCompanyId);
      if (data.cashSessions) setCashSessions([...otherSessions, ...data.cashSessions]);
      
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{
      allCompanies: companies,
      allUsers: users,
      plans,
      products: scopedProducts,
      partners: scopedPartners,
      orders: scopedOrders,
      transactions: scopedTransactions,
      users: scopedUsers,
      cashSessions: scopedCashSessions,
      currentUser, currentCompany, currentSession, cashBalance, backupHistory,
      registerCompany, updateCompanyStatus, renewSubscription, updateCompanyDetails, deleteCompany,
      addPlan, updatePlan, deletePlan,
      addProduct, updateProduct, deleteProduct, adjustStock, batchAdjustStock,
      addPartner, updatePartner, deletePartner,
      createOrder, updateOrder, processOrderPayment, cancelOrder, deleteOrder,
      openRegister, closeRegister, addManualTransaction,
      login, logout, addUser, updateUser, deleteUser,
      requestPasswordReset, completePasswordReset,
      checkPermission, verifyAuthorization, logMasterAction, logUserAction,
      exportBackup, triggerManualBackup, downloadBackup, importBackup
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};