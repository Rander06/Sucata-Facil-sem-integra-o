
export type UserRole = 'master' | 'manager' | 'buyer' | 'seller' | 'cashier' | 'financial' | 'super_admin'; // super_admin adicionado

export type UnitType = 'kg' | 'un';

export type PaymentMethod = 'money' | 'pix' | 'debit' | 'credit' | 'ticket' | 'transfer';

export type CompanyPlan = 'essential' | 'professional' | 'premium' | string; // Permitir strings dinâmicas para novos planos

export type CompanyStatus = 'active' | 'suspended' | 'blocked';

// NOVA INTERFACE DE PLANO
export interface Plan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceAnnual: number;
  maxUsers: number; // 9999 para ilimitado
  storageLimit: string; // Ex: '2GB', '1TB'
  supportLevel: 'basic' | 'priority' | '24/7';
  backupType: 'manual' | 'auto' | 'both';
  features: string[]; // Features extras como 'Treinamento', 'Acesso Antecipado'
  createdAt: string;
  isPopular?: boolean;
  color: string; // Classe de cor para UI (bg-emerald-100, etc)
}

export interface Company {
  id: string;
  name: string;
  document: string; // CNPJ
  ownerName: string;
  email: string;
  phone: string;
  plan: CompanyPlan;
  status: CompanyStatus;
  createdAt: string;
  trialEndsAt: string; // Data limite do teste grátis
  subscriptionEndsAt?: string; // Data limite do pagamento
  billingCycle?: 'monthly' | 'annual'; // Ciclo de pagamento escolhido
}

export interface UserPermissions {
  view_dashboard: boolean;
  register_buy: boolean;
  register_sell: boolean;
  manage_cashier: boolean; 
  approve_manual_transaction: boolean; // Nova permissão
  view_inventory: boolean;
  manage_inventory: boolean; 
  edit_product: boolean; 
  delete_product: boolean; 
  adjust_stock: boolean; 
  manage_partners: boolean; 
  view_reports: boolean; 
  view_financial_reports: boolean; 
  manage_users: boolean; 
  edit_user: boolean; 
  delete_user: boolean; 
  edit_order: boolean; 
  delete_order: boolean; 
  manage_settings: boolean; 
  view_audit: boolean;
  // SaaS Specific
  manage_subscription?: boolean; // Apenas para o dono da empresa
}

export interface Product {
  id: string;
  companyId: string; // Multi-tenant
  name: string;
  buyPrice: number;
  sellPrice: number;
  unit: UnitType;
  stock: number;
  minStock: number;
  maxStock: number;
}

export interface Partner {
  id: string;
  companyId: string; // Multi-tenant
  name: string;
  type: 'supplier' | 'client';
  document: string; 
  phone?: string;
  address?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtMoment: number;
}

export interface Order {
  id: string;
  companyId: string; // Multi-tenant
  type: 'buy' | 'sell';
  partnerId: string;
  items: OrderItem[];
  totalValue: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string; 
  paidAt?: string;
}

export interface Transaction {
  id: string;
  companyId: string; // Multi-tenant
  sessionId?: string; 
  orderId?: string;
  description: string;
  amount: number;
  type: 'in' | 'out';
  category: 'sale' | 'purchase' | 'expense' | 'opening' | 'closing' | 'manual_entry' | 'bleed' | 'payment_out';
  paymentMethod?: PaymentMethod; 
  createdAt: string;
  user: string; 
}

export interface CashClosingDetail {
  method: PaymentMethod;
  expectedAmount: number; 
  countedAmount: number;  
  difference: number;     
}

export interface CashSession {
  id: string;
  companyId: string; // Multi-tenant
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  initialAmount: number; 
  finalAmount?: number; 
  calculatedAmount?: number; 
  closingDetails?: CashClosingDetail[]; 
  status: 'open' | 'closed';
  transactions: Transaction[]; 
}

export interface ActionLog {
  id: string;
  action: string;
  details: string; 
  timestamp: string;
}

export interface BackupLog {
  id: string;
  companyId: string; // Multi-tenant
  timestamp: string;
  type: 'manual' | 'auto';
  size: string;
  status: 'success' | 'error';
}

export interface User {
  id: string;
  companyId: string; // Multi-tenant (se for null/vazio é Super Admin ou orfão)
  name: string;
  email: string;
  role: UserRole;
  password?: string; 
  permissions: UserPermissions; 
  logs?: ActionLog[];
  resetToken?: string; // Token para recuperação de senha
  resetTokenExpires?: string; // Data de expiração do token
}