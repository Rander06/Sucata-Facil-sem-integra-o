
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../services/store';
import { Printer, Trash2, ArrowDownLeft, ArrowUpRight, Clock, Package, DollarSign, TrendingUp, Calendar, Filter, ChevronDown, Search, Lock, ShieldCheck, FileText, ArrowUpDown, AlertTriangle, Users, MapPin, Phone, Tag, CreditCard, Bot, User, X } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';
import PrintTemplate, { printElement } from '../components/PrintTemplate';
import { PaymentMethod, Partner, CashSession, UserPermissions, ActionLog } from '../types';

type ReportTab = 'movements' | 'stock' | 'financial' | 'audit' | 'partners';

// HELPER: Pega a data atual no formato YYYY-MM-DD respeitando o fuso local (Brasil)
const getCurrentDateBR = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// HELPER: Pega o primeiro dia do mês atual no formato YYYY-MM-DD
const getFirstDayMonthBR = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

// HELPER: Ajusta uma data UTC (do banco) para o dia correspondente no Brasil (UTC-3)
const adjustDateToBrazil = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Subtrai 3 horas (em milissegundos) para forçar o fuso de Brasília
  const brazilTime = new Date(date.getTime() - (3 * 60 * 60 * 1000));
  return brazilTime.toISOString().split('T')[0];
};

const Reports = () => {
  const { orders, partners, deleteOrder, transactions, cashSessions, products, checkPermission, users } = useStore();
  
  // --- STATES ---
  const [activeTab, setActiveTab] = useState<ReportTab>('movements');
  
  // Date Filters (Inicializados com horário local/BR)
  const [startDate, setStartDate] = useState(getFirstDayMonthBR());
  const [endDate, setEndDate] = useState(getCurrentDateBR());
  
  // Specific Filters - MOVEMENTS
  const [partnerFilter, setPartnerFilter] = useState('');
  const [partnerSearch, setPartnerSearch] = useState(''); 
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [movementItemSearch, setMovementItemSearch] = useState('');
  
  // Financial Filters
  const [sessionFilter, setSessionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  
  // Stock Filters
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'critical' | 'high' | 'normal'>('all');
  const [stockSort, setStockSort] = useState<'name' | 'stock_desc' | 'value_desc'>('value_desc');

  // Partner Report Filters (New)
  const [partnerReportSearch, setPartnerReportSearch] = useState('');
  const [partnerReportType, setPartnerReportType] = useState<'all' | 'supplier' | 'client'>('all');

  // Audit Filters
  const [auditUserFilter, setAuditUserFilter] = useState('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditDetailSearch, setAuditDetailSearch] = useState('');

  // Modals
  const [deleteModal, setDeleteModal] = useState<{open: boolean, orderId: string | null}>({ open: false, orderId: null });
  const [masterAuth, setMasterAuth] = useState<{ isOpen: boolean; pendingAction: (() => void) | null; title?: string; logDetails?: string; requiredPermission?: keyof UserPermissions; }>({ isOpen: false, pendingAction: null });
  
  // State for Reprinting Session Closing
  const [viewingSessionReceipt, setViewingSessionReceipt] = useState<CashSession | null>(null);

  // State for Main Report Printing Popup
  const [showReportModal, setShowReportModal] = useState(false);

  // --- EFFECT: SCROLL TO TOP ON MODAL OPEN ---
  useEffect(() => {
    if (viewingSessionReceipt || showReportModal) {
      window.scrollTo(0, 0);
    }
  }, [viewingSessionReceipt, showReportModal]);

  // --- HELPERS ---
  const getPartnerName = (id: string) => partners.find(p => p.id === id)?.name || 'Desconhecido';
  
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    // Como a data já pode ter sido ajustada ou não, vamos usar o objeto Date para garantir formatação local
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const paymentLabels: Record<PaymentMethod, string> = {
    money: 'Dinheiro', pix: 'PIX', debit: 'Débito', credit: 'Crédito', ticket: 'Boleto', transfer: 'Transferência'
  };

  const categoryLabels: Record<string, string> = {
    sale: 'Venda',
    purchase: 'Compra',
    expense: 'Despesa',
    bleed: 'Sangria',
    payment_out: 'Pagamento',
    manual_entry: 'Aporte',
    opening: 'Abertura',
    closing: 'Fechamento'
  };

  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  const confirmDeleteOrder = () => {
    if (deleteModal.orderId) {
      const order = orders.find(o => o.id === deleteModal.orderId);
      
      const executeDelete = () => {
         deleteOrder(deleteModal.orderId!);
         setDeleteModal({ open: false, orderId: null });
      };

      // Sempre pedir senha para excluir
      const details = `Exclusão de pedido ID: ${order?.id} | Valor: ${order?.totalValue}`;
      requestAuth(executeDelete, 'Excluir Registro', details, 'delete_order');
    }
  };

  // Filter partners for dropdown
  const filteredPartners = useMemo(() => {
    return partners.filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase()));
  }, [partners, partnerSearch]);

  const handlePartnerSelect = (partner: Partner | null) => {
    if (partner) {
      setPartnerFilter(partner.id);
      setPartnerSearch(partner.name);
    } else {
      setPartnerFilter('');
      setPartnerSearch('');
    }
    setIsPartnerDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(event.target as Node)) {
        setIsPartnerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- DATA PROCESSING & CALCULATIONS ---

  // 1. MOVIMENTAÇÕES (Orders)
  const movementData = useMemo(() => {
    const filtered = orders.filter(order => {
      // Ajusta data UTC do banco para data BR antes de filtrar
      const orderDate = adjustDateToBrazil(order.createdAt);
      
      // Existing Checks
      const dateMatch = orderDate >= startDate && orderDate <= endDate;
      const partnerMatch = partnerFilter === '' || order.partnerId === partnerFilter;
      const statusMatch = statusFilter === 'all' || order.status === statusFilter;
      
      // New Checks
      const typeMatch = movementTypeFilter === 'all' || order.type === movementTypeFilter;
      
      let itemMatch = true;
      if (movementItemSearch) {
          // Check if ANY item in the order matches the search text
          itemMatch = order.items.some(item => {
              const product = products.find(p => p.id === item.productId);
              return product?.name.toLowerCase().includes(movementItemSearch.toLowerCase());
          });
      }

      return dateMatch && partnerMatch && statusMatch && typeMatch && itemMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalBuy = filtered.filter(o => o.type === 'buy' && o.status === 'paid').reduce((acc, o) => acc + o.totalValue, 0);
    const totalSell = filtered.filter(o => o.type === 'sell' && o.status === 'paid').reduce((acc, o) => acc + o.totalValue, 0);
    const countBuy = filtered.filter(o => o.type === 'buy').length;
    const countSell = filtered.filter(o => o.type === 'sell').length;

    return { filtered, totalBuy, totalSell, countBuy, countSell };
  }, [orders, startDate, endDate, partnerFilter, statusFilter, movementTypeFilter, movementItemSearch, products]);

  // 2. ESTOQUE (Products - Snapshot Atual com Filtros)
  const stockData = useMemo(() => {
    // Filtra primeiro
    const filteredProducts = products.filter(p => {
       const matchesSearch = p.name.toLowerCase().includes(stockSearch.toLowerCase());
       
       let matchesStatus = true;
       if (stockStatusFilter === 'critical') matchesStatus = p.stock <= (p.minStock || 0);
       if (stockStatusFilter === 'high') matchesStatus = p.stock >= (p.maxStock || Infinity);
       if (stockStatusFilter === 'normal') matchesStatus = p.stock > (p.minStock || 0) && p.stock < (p.maxStock || Infinity);

       return matchesSearch && matchesStatus;
    });

    // Ordena depois
    const sortedProducts = [...filteredProducts].sort((a, b) => {
       if (stockSort === 'name') return a.name.localeCompare(b.name);
       if (stockSort === 'stock_desc') return b.stock - a.stock;
       if (stockSort === 'value_desc') return (b.stock * b.buyPrice) - (a.stock * a.buyPrice);
       return 0;
    });

    const totalCost = sortedProducts.reduce((acc, p) => acc + (p.stock * p.buyPrice), 0);
    const totalPotentialRevenue = sortedProducts.reduce((acc, p) => acc + (p.stock * p.sellPrice), 0);
    const totalItems = sortedProducts.length;
    const lowStockItems = sortedProducts.filter(p => p.stock <= (p.minStock || 0)).length;

    return { products: sortedProducts, totalCost, totalPotentialRevenue, totalItems, lowStockItems };
  }, [products, stockSearch, stockStatusFilter, stockSort]);

  // 3. FINANCEIRO (Transactions)
  const financialData = useMemo(() => {
    const availableSessions = cashSessions.filter(s => {
      const sDate = adjustDateToBrazil(s.openedAt);
      return sDate >= startDate && sDate <= endDate;
    });

    const filtered = transactions.filter(t => {
      const tDate = adjustDateToBrazil(t.createdAt);
      const sessionMatch = sessionFilter === 'all' || t.sessionId === sessionFilter;
      
      // Novos Filtros
      const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;
      const methodMatch = methodFilter === 'all' || (t.paymentMethod || 'money') === methodFilter;

      return tDate >= startDate && tDate <= endDate && sessionMatch && categoryMatch && methodMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const revenues = filtered.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
    const purchases = filtered.filter(t => t.type === 'out' && t.category === 'purchase').reduce((acc, t) => acc + t.amount, 0);
    
    const expenses = filtered.filter(t => 
        t.type === 'out' && (t.category === 'expense' || t.category === 'bleed' || t.category === 'payment_out')
    ).reduce((acc, t) => acc + t.amount, 0); 
    
    const byMethod: Record<string, number> = {};
    filtered.forEach(t => {
      const method = t.paymentMethod || 'money';
      byMethod[method] = (byMethod[method] || 0) + (t.type === 'in' ? t.amount : -t.amount);
    });
    
    const selectedSession = sessionFilter !== 'all' ? cashSessions.find(s => s.id === sessionFilter) : null;

    return { filtered, availableSessions, selectedSession, revenues, purchases, expenses, balance: revenues - (purchases + expenses), byMethod };
  }, [transactions, cashSessions, startDate, endDate, sessionFilter, categoryFilter, methodFilter]);

  // 4. AUDITORIA (Logs)
  // Get unique actions for dropdown
  const uniqueAuditActions = useMemo(() => {
    const actions = new Set<string>();
    users.forEach(u => u.logs?.forEach(l => actions.add(l.action)));
    return Array.from(actions).sort();
  }, [users]);

  const auditData = useMemo(() => {
    // Coleta logs de TODOS os usuários da empresa
    let allLogs: (ActionLog & { userName: string })[] = [];
    
    users.forEach(user => {
        if (user.logs && user.logs.length > 0) {
            user.logs.forEach(log => {
                allLogs.push({
                    ...log,
                    userName: user.name
                });
            });
        }
    });

    // Filtra e Ordena
    const filteredLogs = allLogs.filter(log => {
        const logDate = adjustDateToBrazil(log.timestamp);
        
        // Filtro de Data
        const dateMatch = logDate >= startDate && logDate <= endDate;
        
        // Filtro de Usuário (Autorizador)
        const userMatch = auditUserFilter === 'all' || log.userName === auditUserFilter;

        // Filtro de Ação
        const actionMatch = auditActionFilter === 'all' || log.action === auditActionFilter;

        // Filtro de Detalhes
        const detailMatch = auditDetailSearch === '' || log.details.toLowerCase().includes(auditDetailSearch.toLowerCase());

        return dateMatch && userMatch && actionMatch && detailMatch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return filteredLogs;
  }, [users, startDate, endDate, auditUserFilter, auditActionFilter, auditDetailSearch]);

  // 5. PARCEIROS (Partners Report)
  const partnerReportData = useMemo(() => {
    const filtered = partners.filter(p => {
        const typeMatch = partnerReportType === 'all' || p.type === partnerReportType;
        const searchMatch = p.name.toLowerCase().includes(partnerReportSearch.toLowerCase()) || 
                            p.document.includes(partnerReportSearch);
        return typeMatch && searchMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));

    return {
        filtered,
        total: filtered.length,
        suppliers: filtered.filter(p => p.type === 'supplier').length,
        clients: filtered.filter(p => p.type === 'client').length
    };
  }, [partners, partnerReportType, partnerReportSearch]);

  // --- RENDER ---
  const canDeleteOrder = checkPermission('delete_order');
  const canViewAudit = checkPermission('view_audit');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ... (Header e Abas mantidos iguais) ... */}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Relatórios Gerenciais</h2>
          <p className="text-gray-500">Visão completa de Movimentações, Estoque e Finanças</p>
        </div>
        <button 
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200 transition-all w-full md:w-auto justify-center"
        >
          <Printer size={18} /> Imprimir Relatório
        </button>
      </div>

      {/* Tabs Navigation (No Print) */}
      <div className="flex gap-2 border-b border-gray-200 no-print overflow-x-auto pb-1">
        <button 
          onClick={() => setActiveTab('movements')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'movements' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
        >
          <ArrowUpRight size={16} /> Movimentações
        </button>
        <button 
          onClick={() => setActiveTab('stock')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'stock' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
        >
          <Package size={16} /> Estoque
        </button>
        <button 
          onClick={() => setActiveTab('financial')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'financial' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
        >
          <DollarSign size={16} /> Financeiro
        </button>
        <button 
          onClick={() => setActiveTab('partners')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'partners' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
        >
          <Users size={16} /> Parceiros
        </button>
        {canViewAudit && (
            <button 
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'audit' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-gray-500 hover:text-amber-600'}`}
            >
            <ShieldCheck size={16} /> Auditoria e Autorizações
            </button>
        )}
      </div>

      {/* FILTROS GLOBAIS E ESPECÍFICOS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 no-print relative z-20">
          {/* ... (Filtros mantidos iguais, apenas ajustando o layout se necessário) ... */}
          {activeTab !== 'stock' && activeTab !== 'partners' && (
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
                <div className="w-full lg:w-auto lg:min-w-[280px] relative z-20">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Período de Análise</label>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input 
                        type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="w-full sm:flex-1 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700"
                    />
                    <span className="text-gray-400 font-bold hidden sm:inline">-</span>
                    <input 
                        type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="w-full sm:flex-1 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700"
                    />
                    </div>
                </div>
                
                {/* Filtros da Aba Movimentações */}
                {activeTab === 'movements' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                        <div className="w-full relative z-30">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar Parceiro</label>
                            <div className="relative" ref={partnerDropdownRef}>
                            <div className="relative">
                                <input 
                                type="text"
                                placeholder="Todos (Digite para buscar...)"
                                value={partnerSearch}
                                onFocus={() => setIsPartnerDropdownOpen(true)}
                                onChange={(e) => {
                                    setPartnerSearch(e.target.value);
                                    setIsPartnerDropdownOpen(true); 
                                    if (e.target.value === '') setPartnerFilter('');
                                }}
                                className="w-full pl-3 pr-8 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700"
                                />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 cursor-pointer" onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)} />
                            </div>
                            
                            {isPartnerDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                <ul>
                                    <li 
                                    onClick={() => handlePartnerSelect(null)}
                                    className="p-2 text-sm cursor-pointer hover:bg-emerald-50 border-b border-gray-50 text-emerald-600 font-bold"
                                    >
                                    Todos os Parceiros
                                    </li>
                                    {filteredPartners.map(p => (
                                    <li 
                                        key={p.id}
                                        onClick={() => handlePartnerSelect(p)}
                                        className={`p-2 text-sm cursor-pointer hover:bg-emerald-50 border-b border-gray-50 last:border-0 ${partnerFilter === p.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700'}`}
                                    >
                                        {p.name}
                                    </li>
                                    ))}
                                    {filteredPartners.length === 0 && (
                                    <li className="p-3 text-sm text-gray-400 text-center">Nenhum encontrado.</li>
                                    )}
                                </ul>
                                </div>
                            )}
                            </div>
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                            <select 
                            value={movementTypeFilter} onChange={e => setMovementTypeFilter(e.target.value as any)}
                            className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-700"
                            >
                            <option value="all">Todos</option>
                            <option value="buy">Compra</option>
                            <option value="sell">Venda</option>
                            </select>
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                            <select 
                            value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                            className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-700"
                            >
                            <option value="all">Todos</option>
                            <option value="paid">Pagos</option>
                            <option value="pending">Pendentes</option>
                            <option value="cancelled">Cancelados</option>
                            </select>
                        </div>

                        <div className="w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Item</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input 
                                    type="text"
                                    value={movementItemSearch}
                                    onChange={e => setMovementItemSearch(e.target.value)}
                                    placeholder="Nome do produto..."
                                    className="w-full pl-9 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtros da Aba Financeiro (Layout Grid) */}
                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Sessão de Caixa</label>
                            <select 
                                value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
                                className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-700"
                                >
                                <option value="all">Todas as Sessões</option>
                                {financialData.availableSessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                    {new Date(s.openedAt).toLocaleDateString()} - {s.userName} ({s.status === 'open' ? 'Aberto' : 'Fechado'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Tag size={12}/> Categoria</label>
                            <select 
                                value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                                className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-700"
                                >
                                <option value="all">Todas</option>
                                <option value="sale">Venda</option>
                                <option value="purchase">Compra</option>
                                <option value="payment_out">Pagamento</option>
                                <option value="bleed">Sangria</option>
                                <option value="expense">Despesa</option>
                                <option value="manual_entry">Aporte</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><CreditCard size={12}/> Método Pagamento</label>
                            <select 
                                value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
                                className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-700"
                                >
                                <option value="all">Todos</option>
                                <option value="money">Dinheiro</option>
                                <option value="pix">PIX</option>
                                <option value="debit">Débito</option>
                                <option value="credit">Crédito</option>
                                <option value="ticket">Boleto</option>
                                <option value="transfer">Transferência</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Filtros da Aba Auditoria */}
                {activeTab === 'audit' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Autorizador</label>
                            <select 
                                value={auditUserFilter} onChange={e => setAuditUserFilter(e.target.value)}
                                className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 text-gray-700"
                            >
                                <option value="all">Todos</option>
                                {Array.from(new Set(auditData.map(log => log.userName))).map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ação</label>
                            <select 
                                value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}
                                className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 text-gray-700"
                            >
                                <option value="all">Todas</option>
                                {uniqueAuditActions.map(action => (
                                    <option key={action} value={action}>{action}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Detalhes</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" />
                                <input 
                                    type="text"
                                    value={auditDetailSearch}
                                    onChange={e => setAuditDetailSearch(e.target.value)}
                                    placeholder="Digite para buscar..."
                                    className="w-full pl-9 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 text-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
          )}

          {/* FILTROS DA ABA ESTOQUE e PARCEIROS (MANTIDOS) */}
          {activeTab === 'stock' && (
             <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Produto</label>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text"
                        placeholder="Nome do material..."
                        value={stockSearch}
                        onChange={e => setStockSearch(e.target.value)}
                        className="w-full pl-9 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-800"
                      />
                   </div>
                </div>
                
                <div className="w-full lg:w-48">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status de Estoque</label>
                   <select 
                     value={stockStatusFilter} onChange={e => setStockStatusFilter(e.target.value as any)}
                     className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-800"
                   >
                      <option value="all">Todos</option>
                      <option value="critical">Crítico (Baixo)</option>
                      <option value="high">Alto (Excesso)</option>
                      <option value="normal">Normal</option>
                   </select>
                </div>

                <div className="w-full lg:w-48">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><ArrowUpDown size={12}/> Ordenar Por</label>
                   <select 
                     value={stockSort} onChange={e => setStockSort(e.target.value as any)}
                     className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-800"
                   >
                      <option value="name">Nome (A-Z)</option>
                      <option value="stock_desc">Maior Quantidade</option>
                      <option value="value_desc">Maior Valor ($)</option>
                   </select>
                </div>
             </div>
          )}

          {activeTab === 'partners' && (
             <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Parceiro</label>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text"
                        placeholder="Nome ou Documento..."
                        value={partnerReportSearch}
                        onChange={e => setPartnerReportSearch(e.target.value)}
                        className="w-full pl-9 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-800"
                      />
                   </div>
                </div>
                
                <div className="w-full lg:w-64">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Parceiro</label>
                   <select 
                     value={partnerReportType} onChange={e => setPartnerReportType(e.target.value as any)}
                     className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-gray-800"
                   >
                      <option value="all">Todos</option>
                      <option value="supplier">Fornecedores</option>
                      <option value="client">Clientes</option>
                   </select>
                </div>
             </div>
          )}
      </div>

      {/* --- MOVEMENTS TAB CONTENT --- */}
      {activeTab === 'movements' && (
        <div className="space-y-6">
           {/* KPI Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Total Compras</p>
                 <p className="text-2xl font-bold text-emerald-700">{movementData.totalBuy.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                 <p className="text-xs text-gray-400 mt-1">{movementData.countBuy} registros</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Total Vendas</p>
                 <p className="text-2xl font-bold text-blue-700">{movementData.totalSell.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                 <p className="text-xs text-gray-400 mt-1">{movementData.countSell} registros</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Saldo do Período</p>
                 <p className={`text-2xl font-bold ${movementData.totalSell - movementData.totalBuy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(movementData.totalSell - movementData.totalBuy).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                 </p>
                 <p className="text-xs text-gray-400 mt-1">Lucro Bruto (Operacional)</p>
              </div>
           </div>

           {/* Table */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-700">Detalhamento de Movimentações</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-bold text-gray-500">
                      <tr>
                         <th className="p-3">Data</th>
                         <th className="p-3">Tipo</th>
                         <th className="p-3">Parceiro</th>
                         <th className="p-3">Itens</th>
                         <th className="p-3 text-right">Valor</th>
                         <th className="p-3 text-center">Status</th>
                         <th className="p-3 text-center no-print">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {movementData.filtered.map(order => (
                         <tr key={order.id} className="hover:bg-gray-50">
                            <td className="p-3 whitespace-nowrap">{formatDateDisplay(order.createdAt)}</td>
                            <td className="p-3">
                               {order.type === 'buy' ? (
                                  <span className="flex items-center gap-1 text-orange-600 font-bold text-xs uppercase"><ArrowDownLeft size={14}/> Compra</span>
                               ) : (
                                  <span className="flex items-center gap-1 text-blue-600 font-bold text-xs uppercase"><ArrowUpRight size={14}/> Venda</span>
                               )}
                            </td>
                            <td className="p-3 font-medium text-gray-700">{getPartnerName(order.partnerId)}</td>
                            <td className="p-3 text-gray-500 text-xs max-w-[200px] truncate">
                               {order.items.map(i => {
                                  const p = products.find(prod => prod.id === i.productId);
                                  return `${p?.name} (${i.quantity})`;
                               }).join(', ')}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-gray-800">
                               {order.totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                            </td>
                            <td className="p-3 text-center">
                               {order.status === 'paid' && <span className="text-green-600 font-bold text-xs uppercase">Pago</span>}
                               {order.status === 'pending' && <span className="text-yellow-600 font-bold text-xs uppercase">Pendente</span>}
                               {order.status === 'cancelled' && <span className="text-red-600 font-bold text-xs uppercase">Cancelado</span>}
                            </td>
                            <td className="p-3 text-center no-print">
                               <button 
                                 onClick={() => setDeleteModal({ open: true, orderId: order.id })}
                                 className={`text-gray-400 hover:text-red-600 transition-colors ${!canDeleteOrder ? 'opacity-50 cursor-not-allowed' : ''}`}
                                 disabled={!canDeleteOrder}
                                 title={canDeleteOrder ? "Excluir Registro" : "Sem permissão"}
                               >
                                  {canDeleteOrder ? <Trash2 size={16} /> : <Lock size={16} />}
                               </button>
                            </td>
                         </tr>
                      ))}
                      {movementData.filtered.length === 0 && (
                         <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
           </div>
        </div>
      )}

      {/* ... STOCK TAB CONTENT ... */}
      {activeTab === 'stock' && (
        <div className="space-y-6 animate-slide-up">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Valor em Estoque (Custo)</p>
                 <p className="text-2xl font-bold text-emerald-700">{stockData.totalCost.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                 <p className="text-xs text-gray-400 mt-1">Baseado nos filtros aplicados</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Valor Potencial (Venda)</p>
                 <p className="text-2xl font-bold text-blue-700">{stockData.totalPotentialRevenue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                 <p className="text-xs text-gray-400 mt-1">Previsão de Faturamento</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Itens Listados</p>
                 <p className="text-2xl font-bold text-gray-800">{stockData.totalItems}</p>
                 {stockData.lowStockItems > 0 && (
                    <p className="text-xs text-red-500 mt-1 font-bold flex items-center gap-1">
                       <AlertTriangle size={10} /> {stockData.lowStockItems} itens críticos
                    </p>
                 )}
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-700">Inventário Atual</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-bold text-gray-500">
                      <tr>
                         <th className="p-3">Produto</th>
                         <th className="p-3 text-right">Estoque</th>
                         <th className="p-3 text-center">Status</th>
                         <th className="p-3 text-right">Custo Médio</th>
                         <th className="p-3 text-right">Preço Venda</th>
                         <th className="p-3 text-right">Total Custo</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {stockData.products.map(p => {
                         let statusLabel = 'Normal';
                         let statusColor = 'text-emerald-600 bg-emerald-50';
                         if (p.stock <= (p.minStock || 0)) { statusLabel = 'Crítico'; statusColor = 'text-red-600 bg-red-50'; }
                         else if (p.stock >= (p.maxStock || Infinity)) { statusLabel = 'Excesso'; statusColor = 'text-blue-600 bg-blue-50'; }

                         return (
                         <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-800">{p.name}</td>
                            <td className="p-3 text-right font-bold">
                               {p.stock} <span className="text-xs text-gray-500 font-normal">{p.unit}</span>
                            </td>
                            <td className="p-3 text-center">
                               <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${statusColor}`}>
                                  {statusLabel}
                               </span>
                            </td>
                            <td className="p-3 text-right text-gray-600">
                               R$ {p.buyPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-right text-gray-600">
                               R$ {p.sellPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-700">
                               {(p.stock * p.buyPrice).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                            </td>
                         </tr>
                      )})}
                      {stockData.products.length === 0 && (
                         <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhum produto encontrado com os filtros atuais.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
           </div>
        </div>
      )}

      {/* ... FINANCIAL TAB CONTENT ... */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
           
           {/* Detailed Session View (If Selected) */}
           {financialData.selectedSession && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center mb-4">
                 <div>
                    <h4 className="font-bold text-blue-900">Visualizando Sessão Específica</h4>
                    <p className="text-sm text-blue-700">
                       Operador: {financialData.selectedSession.userName} | 
                       Abertura: {new Date(financialData.selectedSession.openedAt).toLocaleString()}
                    </p>
                 </div>
                 {financialData.selectedSession.status === 'closed' && (
                    <button 
                      onClick={() => setViewingSessionReceipt(financialData.selectedSession)}
                      className="mt-2 sm:mt-0 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-2"
                    >
                       <Printer size={16} /> Reimprimir Fechamento
                    </button>
                 )}
              </div>
           )}

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Entradas (Receita)</p>
                 <p className="text-2xl font-bold text-emerald-700">{financialData.revenues.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                 <TrendingUp className="text-emerald-200 absolute top-4 right-4 w-8 h-8" />
              </div>
              <div className="bg-orange-50 p-4 rounded-xl shadow-sm border border-orange-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Saídas (Compras)</p>
                 <p className="text-2xl font-bold text-orange-700">{financialData.purchases.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Saídas Manuais</p>
                 <p className="text-2xl font-bold text-red-700">{financialData.expenses.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                 <p className="text-[10px] text-gray-400 mt-1">Despesas, Sangrias e Pagamentos</p>
              </div>
              <div className={`p-4 rounded-xl shadow-sm border ${financialData.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                 <p className="text-xs text-gray-500 uppercase font-bold">Resultado Líquido</p>
                 <p className={`text-2xl font-bold ${financialData.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {financialData.balance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                 </p>
              </div>
           </div>

           {/* Breakdown by Payment Method */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-bold text-gray-700">Extrato Financeiro Detalhado</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-bold text-gray-500">
                          <tr>
                             <th className="p-3">Data</th>
                             <th className="p-3">Descrição</th>
                             <th className="p-3">Categoria</th>
                             <th className="p-3">Método</th>
                             <th className="p-3 text-right">Valor</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {financialData.filtered.map(t => (
                             <tr key={t.id} className="hover:bg-gray-50">
                                <td className="p-3 whitespace-nowrap text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                                <td className="p-3 font-medium text-gray-800">{t.description}</td>
                                <td className="p-3">
                                   {t.category === 'sale' && <span className="text-emerald-600 font-bold text-xs">Venda</span>}
                                   {t.category === 'purchase' && <span className="text-orange-600 font-bold text-xs">Compra</span>}
                                   {t.category === 'expense' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Despesa</span>}
                                   {t.category === 'bleed' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Sangria</span>}
                                   {t.category === 'payment_out' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Pagamento</span>}
                                   {t.category === 'manual_entry' && <span className="text-blue-600 font-bold text-xs">Aporte</span>}
                                </td>
                                <td className="p-3 text-gray-500 text-xs">{paymentLabels[t.paymentMethod || 'money']}</td>
                                <td className={`p-3 text-right font-bold ${t.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                                   {t.type === 'in' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                </td>
                             </tr>
                          ))}
                          {financialData.filtered.length === 0 && (
                             <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum lançamento no período.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
                 <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-bold text-gray-700">Por Forma de Pagamento</h3>
                 </div>
                 <div className="p-4 space-y-4">
                    {Object.entries(financialData.byMethod).map(([method, amountVal]) => {
                       const amount = amountVal as number;
                       return (
                       <div key={method} className="flex justify-between items-center p-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full ${amount >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                             <span className="text-sm font-medium text-gray-700">{paymentLabels[method as PaymentMethod]}</span>
                          </div>
                          <span className={`font-bold ${amount >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                             {amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                          </span>
                       </div>
                    )})}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ... AUDIT TAB CONTENT ... */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-slide-up">
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                <div className="p-4 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2">
                        <ShieldCheck size={20} /> Histórico de Autorizações e Ações Sensíveis
                    </h3>
                    <span className="text-xs bg-white px-2 py-1 rounded text-amber-800 font-bold border border-amber-100">
                        {auditData.length} registros encontrados
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-amber-100 text-gray-500 uppercase font-bold text-xs sticky top-0">
                            <tr>
                                <th className="p-4 w-48">Data / Hora</th>
                                <th className="p-4 w-64">Autorizado Por</th>
                                <th className="p-4 w-48">Ação</th>
                                <th className="p-4">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50/50">
                            {auditData.map(log => (
                                <tr key={log.id} className="hover:bg-amber-50/30">
                                    <td className="p-4 text-gray-600 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{new Date(log.timestamp).toLocaleDateString()}</span>
                                            <span className="text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                                                {log.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-800">{log.userName}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <span className="inline-flex px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-bold text-gray-700">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex items-start gap-2 text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                            <FileText size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                                            <span className="text-xs font-mono leading-relaxed">{log.details}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {auditData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-400">
                                        Nenhum registro de auditoria encontrado para este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* ... PARTNERS TAB CONTENT ... */}
      {activeTab === 'partners' && (
        <div className="space-y-6 animate-slide-up">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Total Parceiros</p>
                 <p className="text-2xl font-bold text-emerald-700">{partnerReportData.total}</p>
                 <p className="text-xs text-gray-400 mt-1">Cadastrados</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl shadow-sm border border-orange-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Fornecedores</p>
                 <p className="text-2xl font-bold text-orange-700">{partnerReportData.suppliers}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
                 <p className="text-xs text-gray-500 uppercase font-bold">Clientes</p>
                 <p className="text-2xl font-bold text-blue-700">{partnerReportData.clients}</p>
              </div>
           </div>

           {/* Table */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-700">Cadastro de Parceiros</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-bold text-gray-500">
                      <tr>
                         <th className="p-3">Nome / Razão Social</th>
                         <th className="p-3">Tipo</th>
                         <th className="p-3">Documento</th>
                         <th className="p-3">Contato</th>
                         <th className="p-3">Endereço</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {partnerReportData.filtered.map(p => (
                         <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-800">{p.name}</td>
                            <td className="p-3">
                               {p.type === 'supplier' 
                                 ? <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold uppercase">Fornecedor</span>
                                 : <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Cliente</span>
                               }
                            </td>
                            <td className="p-3 font-mono text-xs text-gray-600">{p.document}</td>
                            <td className="p-3 text-gray-600">
                               {p.phone ? (
                                  <div className="flex items-center gap-1"><Phone size={12} className="text-emerald-500"/> {p.phone}</div>
                               ) : '-'}
                            </td>
                            <td className="p-3 text-gray-500 text-xs max-w-[200px] truncate">
                               {p.address ? (
                                  <div className="flex items-center gap-1"><MapPin size={12} className="text-gray-400"/> {p.address}</div>
                               ) : '-'}
                            </td>
                         </tr>
                      ))}
                      {partnerReportData.filtered.length === 0 && (
                         <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum parceiro encontrado.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
           </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, orderId: null })}
        onConfirm={confirmDeleteOrder}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir este registro? Essa ação não pode ser desfeita e afetará o saldo do caixa."
        confirmText="Excluir Definitivamente"
        variant="danger"
      />

      <MasterPasswordModal 
        isOpen={masterAuth.isOpen}
        onClose={() => setMasterAuth({ ...masterAuth, isOpen: false })}
        onAuthenticated={() => masterAuth.pendingAction && masterAuth.pendingAction()}
        title={masterAuth.title}
        logDetails={masterAuth.logDetails}
        requiredPermission={masterAuth.requiredPermission}
      />

      {/* ... REPRINT SESSION MODAL ... */}
      {viewingSessionReceipt && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto receipt-modal-overlay backdrop-blur-sm"
          onClick={() => setViewingSessionReceipt(null)}
        >
          <div 
            className="bg-white w-full max-w-3xl mx-auto rounded-xl p-0 relative receipt-content my-auto"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Close Button X (Sticky) */}
             <button 
               onClick={() => setViewingSessionReceipt(null)}
               className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
               title="Fechar"
             >
               <X size={20} />
             </button>

             <div className="p-8">
               <PrintTemplate
                 id="session-reprint" 
                 title="Fechamento de Caixa (Reimpressão)"
                 subtitle="Histórico de Sessão Encerrada"
                 type="report"
                 details={[
                   { label: 'Operador', value: viewingSessionReceipt.userName },
                   { label: 'Abertura', value: new Date(viewingSessionReceipt.openedAt).toLocaleString() },
                   { label: 'Fechamento', value: viewingSessionReceipt.closedAt ? new Date(viewingSessionReceipt.closedAt).toLocaleString() : '-' },
                   { label: 'Status', value: 'FINALIZADO', highlight: true }
                 ]}
                 summaryCards={[
                   { label: 'Fundo Inicial', value: viewingSessionReceipt.initialAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), color: 'text-gray-600' },
                   { label: 'Total Sistema', value: viewingSessionReceipt.calculatedAmount?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) || '', color: 'text-blue-600' },
                   { label: 'Total Conferido', value: viewingSessionReceipt.finalAmount?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) || '', color: 'text-emerald-600' },
                 ]}
               >
                 <h3 className="font-bold text-gray-800 mb-2 uppercase text-sm border-b border-gray-200 pb-1">Conferência de Valores</h3>
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm mb-4 border-collapse border border-gray-200">
                     <thead>
                       <tr className="bg-gray-100 text-gray-700">
                         <th className="py-2 px-3 text-left border border-gray-200">Método</th>
                         <th className="py-2 px-3 text-right border border-gray-200">Esperado</th>
                         <th className="py-2 px-3 text-right border border-gray-200">Conferido</th>
                         <th className="py-2 px-3 text-right border border-gray-200">Diferença</th>
                       </tr>
                     </thead>
                     <tbody>
                       {viewingSessionReceipt.closingDetails?.map((det, idx) => {
                          const label = paymentLabels[det.method] || det.method;
                          return (
                            <tr key={idx} className="border-b border-gray-50">
                              <td className="py-2 px-3 font-medium border border-gray-200">{label}</td>
                              <td className="py-2 px-3 text-right text-gray-600 border border-gray-200">{det.expectedAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                              <td className="py-2 px-3 text-right font-bold border border-gray-200">{det.countedAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                              <td className={`py-2 px-3 text-right font-bold border border-gray-200 ${Math.abs(det.difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                 {det.difference > 0 ? '+' : ''}{det.difference.toFixed(2)}
                              </td>
                            </tr>
                          );
                       })}
                     </tbody>
                   </table>
                 </div>
               </PrintTemplate>
             </div>
             <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 no-print rounded-b-xl">
               <button onClick={() => printElement('session-reprint')} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg">
                  <Printer size={20} /> Imprimir
               </button>
               <button onClick={() => setViewingSessionReceipt(null)} className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 rounded-lg font-bold hover:bg-gray-50">
                  Fechar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* GENERAL REPORT PRINT MODAL */}
      {showReportModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto receipt-modal-overlay backdrop-blur-sm"
          onClick={() => setShowReportModal(false)}
        >
          <div 
            className="bg-white w-full max-w-4xl mx-auto rounded-xl p-0 relative receipt-content my-auto mt-10 print:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Close Button X (Sticky) */}
             <button 
               onClick={() => setShowReportModal(false)}
               className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
               title="Fechar"
             >
               <X size={20} />
             </button>

             <div className="p-4 md:p-8">
               <PrintTemplate
                 id="report-general" 
                 title={`Relatório de ${activeTab === 'movements' ? 'Movimentações' : activeTab === 'stock' ? 'Inventário de Estoque' : activeTab === 'financial' ? 'Finanças' : activeTab === 'audit' ? 'Auditoria' : 'Parceiros'}`}
                 subtitle={activeTab === 'partners' ? 'Cadastro Geral' : activeTab === 'stock' ? 'Posição Atual' : `Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`}
                 type="report"
                 summaryCards={
                    activeTab === 'movements' ? [
                        { label: 'Total Compras', value: movementData.totalBuy.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), color: 'text-emerald-700' },
                        { label: 'Total Vendas', value: movementData.totalSell.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), color: 'text-blue-700' },
                        { label: 'Saldo', value: (movementData.totalSell - movementData.totalBuy).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) }
                    ] : activeTab === 'stock' ? [
                        { label: 'Valor em Estoque', value: stockData.totalCost.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), color: 'text-emerald-700' },
                        { label: 'Itens Totais', value: stockData.totalItems.toString() }
                    ] : activeTab === 'financial' ? [
                        { label: 'Receitas', value: financialData.revenues.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), color: 'text-emerald-700' },
                        { label: 'Despesas/Compras', value: (financialData.purchases + financialData.expenses).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), color: 'text-red-700' },
                        { label: 'Resultado', value: financialData.balance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) }
                    ] : activeTab === 'partners' ? [
                        { label: 'Total Parceiros', value: partnerReportData.total.toString(), color: 'text-emerald-700' },
                        { label: 'Fornecedores', value: partnerReportData.suppliers.toString() },
                        { label: 'Clientes', value: partnerReportData.clients.toString() }
                    ] : []
                 }
               >
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm mb-4 border-collapse border border-gray-200 text-left">
                     
                     {/* MOVEMENTS TABLE */}
                     {activeTab === 'movements' && (
                        <>
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-2 border border-gray-200">Data</th>
                                    <th className="p-2 border border-gray-200">Tipo</th>
                                    <th className="p-2 border border-gray-200">Parceiro</th>
                                    <th className="p-2 border border-gray-200">Itens</th>
                                    <th className="p-2 border border-gray-200 text-center">Status</th>
                                    <th className="p-2 border border-gray-200 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movementData.filtered.map(order => (
                                    <tr key={order.id}>
                                        <td className="p-2 border border-gray-200">{formatDateDisplay(order.createdAt)}</td>
                                        <td className="p-2 border border-gray-200">{order.type === 'buy' ? 'COMPRA' : 'VENDA'}</td>
                                        <td className="p-2 border border-gray-200">{getPartnerName(order.partnerId)}</td>
                                        <td className="p-2 border border-gray-200 text-xs">
                                            {order.items.map(i => {
                                                const p = products.find(prod => prod.id === i.productId);
                                                return `${p?.name} (${i.quantity})`;
                                            }).join(', ')}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-center text-xs font-bold">
                                            {order.status === 'paid' && <span className="text-green-700">PAGO</span>}
                                            {order.status === 'pending' && <span className="text-yellow-700">PENDENTE</span>}
                                            {order.status === 'cancelled' && <span className="text-red-700">CANCELADO</span>}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-right font-mono">{order.totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </>
                     )}

                     {/* ... (Outras tabelas mantidas sem alteração de estrutura, apenas lógica de data aplicada nas dependências) ... */}
                     
                     {/* FINANCIAL TABLE */}
                     {activeTab === 'financial' && (
                        <>
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-2 border border-gray-200">Data</th>
                                    <th className="p-2 border border-gray-200">Descrição</th>
                                    <th className="p-2 border border-gray-200">Categoria</th>
                                    <th className="p-2 border border-gray-200 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialData.filtered.map(t => (
                                    <tr key={t.id}>
                                        <td className="p-2 border border-gray-200">{formatDateDisplay(t.createdAt)}</td>
                                        <td className="p-2 border border-gray-200">{t.description}</td>
                                        <td className="p-2 border border-gray-200 uppercase text-xs">{categoryLabels[t.category] || t.category}</td>
                                        <td className={`p-2 border border-gray-200 text-right font-mono ${t.type === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {t.type === 'in' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </>
                     )}

                     {/* AUDIT TABLE */}
                     {activeTab === 'audit' && (
                        <>
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-2 border border-gray-200">Data</th>
                                    <th className="p-2 border border-gray-200">Autorizador</th>
                                    <th className="p-2 border border-gray-200">Ação</th>
                                    <th className="p-2 border border-gray-200">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditData.map(log => (
                                    <tr key={log.id}>
                                        <td className="p-2 border border-gray-200">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200">{log.userName}</td>
                                        <td className="p-2 border border-gray-200 font-bold">{log.action}</td>
                                        <td className="p-2 border border-gray-200 text-xs font-mono">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </>
                     )}

                     {/* PARTNERS TABLE */}
                     {activeTab === 'partners' && (
                        <>
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-2 border border-gray-200">Nome</th>
                                    <th className="p-2 border border-gray-200">Tipo</th>
                                    <th className="p-2 border border-gray-200">Documento</th>
                                    <th className="p-2 border border-gray-200">Contato</th>
                                    <th className="p-2 border border-gray-200">Endereço</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partnerReportData.filtered.map(p => (
                                    <tr key={p.id}>
                                        <td className="p-2 border border-gray-200">{p.name}</td>
                                        <td className="p-2 border border-gray-200 uppercase text-xs font-bold">{p.type === 'supplier' ? 'Fornecedor' : 'Cliente'}</td>
                                        <td className="p-2 border border-gray-200 font-mono text-xs">{p.document}</td>
                                        <td className="p-2 border border-gray-200 text-xs">{p.phone}</td>
                                        <td className="p-2 border border-gray-200 text-xs">{p.address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </>
                     )}

                   </table>
                 </div>
               </PrintTemplate>
             </div>
             
             <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 no-print rounded-b-xl">
               <button onClick={() => printElement('report-general')} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg">
                  <Printer size={20} /> Imprimir Agora
               </button>
               <button onClick={() => setShowReportModal(false)} className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 rounded-lg font-bold hover:bg-gray-50">
                  Fechar
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
