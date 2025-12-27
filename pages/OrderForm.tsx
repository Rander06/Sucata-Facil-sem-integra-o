
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../services/store';
import { OrderItem, Partner, Order, UserPermissions } from '../types';
import { Plus, Trash2, Search, Calculator, Printer, Clock, CheckCircle, XCircle, History, Edit, User, ChevronDown, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ui/ConfirmModal';
import PrintTemplate, { printElement } from '../components/PrintTemplate';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';

interface OrderFormProps {
  type: 'buy' | 'sell';
}

const OrderForm: React.FC<OrderFormProps> = ({ type }) => {
  const { products, partners, createOrder, updateOrder, orders, checkPermission } = useStore();
  const navigate = useNavigate();
  
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string>('');
  const [currentQty, setCurrentQty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New State for Partner Search (Autocomplete)
  const [partnerSearch, setPartnerSearch] = useState('');
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);

  const [showReceipt, setShowReceipt] = useState<{id: string, items: OrderItem[], total: number, partner: Partner} | null>(null);
  const [removeModal, setRemoveModal] = useState<{open: boolean, index: number | null}>({ open: false, index: null });
  
  // Edit Mode State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Master Auth State
  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });

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

  // Filter partners based on type (Supplier for Buy, Client for Sell)
  const availablePartners = useMemo(() => 
    partners.filter(p => type === 'buy' ? p.type === 'supplier' : p.type === 'client')
  , [partners, type]);

  // Filter partners dropdown based on search text
  const filteredPartnerOptions = useMemo(() => {
    if (!partnerSearch) return availablePartners;
    return availablePartners.filter(p => 
      p.name.toLowerCase().includes(partnerSearch.toLowerCase()) || 
      p.document.includes(partnerSearch)
    );
  }, [availablePartners, partnerSearch]);

  // Sync Search Text when an ID is selected programmatically (e.g. Edit Mode)
  useEffect(() => {
    if (selectedPartnerId) {
      const p = partners.find(part => part.id === selectedPartnerId);
      if (p && p.name !== partnerSearch) {
        setPartnerSearch(p.name);
      }
    } else if (!isPartnerDropdownOpen && !editingOrderId) {
      // Clear search if ID is cleared and not editing/searching
      // setPartnerSearch(''); // Optional: Uncomment if you want to clear text when deselecting
    }
  }, [selectedPartnerId, partners]);

  // Filter Daily History
  const dailyHistory = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    return orders
      .filter(o => {
        const orderDateStr = new Date(o.createdAt).toLocaleDateString('pt-BR');
        return o.type === type && orderDateStr === todayStr;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, type]);

  // LÓGICA DE PRODUTOS: TOP 10 MAIS USADOS
  const displayedProducts = useMemo(() => {
    // 1. Se estiver buscando, filtra normal e mostra tudo que encontrar
    if (searchTerm) {
      return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 2. Se NÃO estiver buscando, calcula frequência de uso baseado no histórico
    const productUsage: Record<string, number> = {};
    
    orders.forEach(order => {
      // Considera apenas pedidos do mesmo tipo (Compra ou Venda) que não foram cancelados
      if (order.type === type && order.status !== 'cancelled') {
        order.items.forEach(item => {
          // Conta quantas vezes o produto apareceu em pedidos (Frequência)
          productUsage[item.productId] = (productUsage[item.productId] || 0) + 1;
        });
      }
    });

    // 3. Ordena os produtos pela frequência (maior para menor)
    const sortedProducts = [...products].sort((a, b) => {
      const usageA = productUsage[a.id] || 0;
      const usageB = productUsage[b.id] || 0;
      return usageB - usageA; // Descrescente
    });

    // 4. Retorna apenas os TOP 10
    return sortedProducts.slice(0, 10);

  }, [products, orders, type, searchTerm]);

  const selectedProduct = products.find(p => p.id === currentItemId);

  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  const addItem = () => {
    if (!selectedProduct || !currentQty) return;
    const qty = parseFloat(currentQty);
    if (qty <= 0) return;

    // Check stock for sales
    if (type === 'sell' && selectedProduct.stock < qty) {
      alert(`Estoque insuficiente! Disponível: ${selectedProduct.stock} ${selectedProduct.unit}`);
      return;
    }

    const existingItemIndex = items.findIndex(i => i.productId === selectedProduct.id);
    const price = type === 'buy' ? selectedProduct.buyPrice : selectedProduct.sellPrice;

    if (existingItemIndex > -1) {
      const newItems = [...items];
      newItems[existingItemIndex].quantity += qty;
      setItems(newItems);
    } else {
      setItems([...items, { productId: selectedProduct.id, quantity: qty, priceAtMoment: price }]);
    }
    setCurrentQty('');
    setCurrentItemId('');
  };

  const confirmRemove = () => {
    if (removeModal.index !== null) {
       setItems(items.filter((_, i) => i !== removeModal.index));
    }
  };

  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.priceAtMoment), 0);

  const handlePartnerSelect = (partner: Partner) => {
    setSelectedPartnerId(partner.id);
    setPartnerSearch(partner.name);
    setIsPartnerDropdownOpen(false);
  };

  const handleFinish = () => {
    if (!selectedPartnerId || items.length === 0) return;
    
    const partner = partners.find(p => p.id === selectedPartnerId);
    
    if (editingOrderId) {
      // Update existing order
      const originalOrder = orders.find(o => o.id === editingOrderId);
      if (originalOrder) {
        updateOrder({
          ...originalOrder,
          partnerId: selectedPartnerId,
          items: items,
          totalValue: totalValue
        });
        alert("Pedido atualizado com sucesso!");
      }
    } else {
      // Create new order
      createOrder({
        type,
        partnerId: selectedPartnerId,
        items,
        totalValue
      });
      
      // Show receipt modal only for new orders
      setShowReceipt({
        id: crypto.randomUUID(), // Mock ID for display
        items: [...items],
        total: totalValue,
        partner: partner!
      });
    }

    // Reset form
    setItems([]);
    setSelectedPartnerId('');
    setEditingOrderId(null);
    setPartnerSearch('');
  };

  const handleEditOrder = (order: Order) => {
    if (order.status !== 'pending') {
      alert("Apenas pedidos pendentes podem ser editados.");
      return;
    }

    const startEditing = () => {
      setEditingOrderId(order.id);
      setSelectedPartnerId(order.partnerId);
      setItems([...order.items]);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // SEMPRE pedir senha (seja do usuário com permissão ou master)
    requestAuth(
      startEditing, 
      "Editar Pedido", 
      `Edição de Pedido ID: ${order.id}`, 
      'edit_order'
    );
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
    setItems([]);
    setSelectedPartnerId('');
    setPartnerSearch('');
  };

  const canEditOrder = checkPermission('edit_order');

  // --- RENDERIZAÇÃO DO RECIBO (MODAL) ---
  if (showReceipt) {
    const totalQty = showReceipt.items.reduce((acc, i) => acc + i.quantity, 0);
    
    return (
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto receipt-modal-overlay backdrop-blur-sm"
        onClick={() => { setShowReceipt(null); navigate(type === 'buy' ? '/buy' : '/sell'); }}
      >
        <div 
          className="bg-white w-full max-w-[400px] rounded-sm shadow-2xl p-0 relative receipt-content my-auto"
          onClick={(e) => e.stopPropagation()}
        >
           {/* Close Button X (Sticky) */}
           <button 
             onClick={() => { setShowReceipt(null); navigate(type === 'buy' ? '/buy' : '/sell'); }}
             className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
             title="Fechar"
           >
             <X size={20} />
           </button>

           <div className="p-4 print:p-0">
             <PrintTemplate
               id="order-receipt" // ID for print function
               title={`Pedido ${type === 'buy' ? 'Compra' : 'Venda'}`}
               subtitle="Conferência"
               type="receipt"
               format="thermal" // FORÇA O MODO TÉRMICO 80MM
               details={[
                 { label: 'Parceiro', value: showReceipt.partner.name, fullWidth: true, highlight: true },
                 { label: 'Doc', value: showReceipt.partner.document },
                 { label: 'ID', value: showReceipt.id.slice(0, 8).toUpperCase() },
                 { label: 'Status', value: 'PENDENTE (Ir ao Caixa)', highlight: true }
               ]}
               summaryCards={[
                 { label: 'Qtd. Itens', value: showReceipt.items.length.toString() },
                 { label: 'Peso Total', value: totalQty.toFixed(1) },
                 { label: 'TOTAL', value: showReceipt.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) }
               ]}
             >
               {/* TABELA SIMPLIFICADA PARA TÉRMICA */}
               <table className="w-full text-xs border-collapse">
                   <thead>
                     <tr className="border-b border-black border-dashed text-left">
                       <th className="py-1">Item</th>
                       <th className="py-1 text-right">Qtd</th>
                       <th className="py-1 text-right">Total</th>
                     </tr>
                   </thead>
                   <tbody>
                     {showReceipt.items.map((item, idx) => {
                       const p = products.find(prod => prod.id === item.productId);
                       return (
                         <tr key={idx}>
                           <td className="py-1">{p?.name}</td>
                           <td className="py-1 text-right">{item.quantity} {p?.unit}</td>
                           <td className="py-1 text-right font-bold">{(item.quantity * item.priceAtMoment).toFixed(2)}</td>
                         </tr>
                       );
                     })}
                   </tbody>
               </table>
             </PrintTemplate>
           </div>
           
           <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col gap-3 no-print rounded-b-sm">
             <button 
               onClick={() => printElement('order-receipt')}
               className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg font-bold text-lg"
             >
               <Printer size={24} /> Imprimir Cupom
             </button>
             <button 
               onClick={() => { setShowReceipt(null); navigate(type === 'buy' ? '/buy' : '/sell'); }}
               className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 font-medium"
             >
               Fechar Tela
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Selection */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-[500px] md:min-h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
              <Search className="w-5 h-5" />
              {editingOrderId ? `Editando Pedido #${editingOrderId.slice(0,4)}` : 'Selecionar Material'}
            </h2>
            {editingOrderId && (
              <button 
                onClick={cancelEdit}
                className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold hover:bg-red-200"
              >
                Cancelar Edição
              </button>
            )}
          </div>
          
          <div className="p-4 flex-shrink-0">
            <input 
              type="text" 
              placeholder="Buscar material..." 
              className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2 text-gray-800 placeholder-gray-400 text-sm md:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {!searchTerm && (
               <p className="text-[10px] text-gray-400 font-medium text-right uppercase px-1">
                 Mostrando os 10 {type === 'buy' ? 'mais comprados' : 'mais vendidos'}
               </p>
            )}
          </div>
            
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {displayedProducts.map(p => {
                   let statusColor = 'text-gray-500';
                   let statusLabel = 'Normal';
                   if (p.stock <= (p.minStock || 0)) {
                     statusColor = 'text-red-600 font-bold';
                     statusLabel = 'Crítico';
                   } else if (p.stock >= (p.maxStock || Infinity)) {
                     statusColor = 'text-blue-600 font-bold';
                     statusLabel = 'Alto';
                   }

                   return (
                    <button
                      key={p.id}
                      onClick={() => setCurrentItemId(p.id)}
                      className={`p-4 rounded-lg border text-left transition-all relative ${
                        currentItemId === p.id 
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                      }`}
                    >
                      {statusLabel === 'Crítico' && (
                         <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Estoque Crítico"></span>
                      )}
                      <div className="font-bold text-gray-800 pr-2 truncate">{p.name}</div>
                      <div className="flex flex-col mt-2 text-sm">
                        <span className="text-xs mb-1">
                          Estoque: {p.stock} {p.unit} <span className={`text-[10px] ml-1 ${statusColor}`}>({statusLabel})</span>
                        </span>
                        <span className="font-bold text-emerald-600 text-lg">
                          R$ {type === 'buy' ? p.buyPrice.toFixed(2) : p.sellPrice.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
              })}
              {displayedProducts.length === 0 && (
                 <div className="col-span-full text-center py-8 text-gray-400">
                    Nenhum produto encontrado.
                 </div>
              )}
            </div>
          </div>

          {/* Weight/Quantity Input Area - Responsive for Mobile */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto flex-shrink-0">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:flex-1 grid grid-cols-2 md:block gap-4">
                 <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1 truncate">Qtd/Peso ({selectedProduct?.unit || 'un'})</label>
                    <input 
                      type="number" 
                      value={currentQty}
                      onChange={(e) => setCurrentQty(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addItem()}
                      disabled={!currentItemId}
                      className="w-full p-3 text-lg md:text-xl font-bold bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 text-gray-800 placeholder-gray-400"
                      placeholder="0.00"
                      step="0.1"
                    />
                 </div>
                 <div className="w-full md:hidden">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                    <div className="w-full p-3 text-lg font-bold bg-white border border-gray-200 rounded-lg text-gray-500 truncate">
                      {selectedProduct && currentQty 
                        ? (parseFloat(currentQty) * (type === 'buy' ? selectedProduct.buyPrice : selectedProduct.sellPrice)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})
                        : 'R$ 0,00'
                      }
                    </div>
                 </div>
              </div>

              <div className="hidden md:block w-full md:flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total do Item</label>
                  <div className="w-full p-3 text-xl font-bold bg-white border border-gray-200 rounded-lg text-gray-500">
                    {selectedProduct && currentQty 
                      ? (parseFloat(currentQty) * (type === 'buy' ? selectedProduct.buyPrice : selectedProduct.sellPrice)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})
                      : 'R$ 0,00'
                    }
                  </div>
              </div>
              
              <button 
                onClick={addItem}
                disabled={!currentItemId || !currentQty}
                className="w-full md:w-auto bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed h-[54px] px-6 font-bold flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[400px]">
          <div className={`p-4 border-b border-emerald-200 rounded-t-xl ${editingOrderId ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {editingOrderId ? 'Editando Pedido' : 'Resumo do Pedido'}
            </h2>
          </div>

          <div className="p-4 space-y-3 relative z-20">
            <label className="block text-lg font-bold text-gray-800 mb-2">
              {type === 'buy' ? 'Adicione o Fornecedor' : 'Adicione o Cliente'}
            </label>
            
            {/* Custom Autocomplete Dropdown */}
            <div className="relative" ref={partnerDropdownRef}>
               <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text"
                    placeholder={`Buscar ${type === 'buy' ? 'fornecedor' : 'cliente'}...`}
                    value={partnerSearch}
                    onFocus={() => setIsPartnerDropdownOpen(true)}
                    onChange={(e) => {
                       setPartnerSearch(e.target.value);
                       setIsPartnerDropdownOpen(true); // Força abertura ao digitar
                       if (e.target.value === '') setSelectedPartnerId('');
                    }}
                    className="w-full pl-9 pr-8 py-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 cursor-pointer" onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)} />
               </div>

               {/* Dropdown List */}
               {isPartnerDropdownOpen && (
                 <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                    {filteredPartnerOptions.length === 0 ? (
                       <div className="p-3 text-sm text-gray-400 text-center">Nenhum parceiro encontrado.</div>
                    ) : (
                       <ul>
                         {filteredPartnerOptions.map(p => (
                           <li 
                             key={p.id}
                             onClick={() => handlePartnerSelect(p)}
                             className={`p-3 text-sm cursor-pointer hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0 ${selectedPartnerId === p.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700'}`}
                           >
                             <div className="font-medium">{p.name}</div>
                             <div className="text-xs text-gray-400">{p.document}</div>
                           </li>
                         ))}
                       </ul>
                    )}
                    <div className="p-2 border-t border-gray-100 bg-gray-50 text-center sticky bottom-0">
                       <button 
                         onClick={() => { navigate('/partners'); }}
                         className="text-xs text-emerald-600 font-bold hover:underline"
                       >
                         + Cadastrar Novo
                       </button>
                    </div>
                 </div>
               )}
            </div>
            
            {/* Feedback de Seleção */}
            {selectedPartnerId && (
              <div className="text-xs text-emerald-600 font-medium px-1 flex items-center gap-1">
                <CheckCircle size={10} /> Parceiro selecionado
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[150px] lg:min-h-0 z-10">
            {items.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                Nenhum item adicionado
              </div>
            )}
            {items.map((item, idx) => {
              const prod = products.find(p => p.id === item.productId);
              return (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{prod?.name}</p>
                    <p className="text-sm text-gray-500">{item.quantity} {prod?.unit} x R$ {item.priceAtMoment.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 pl-2">
                    <span className="font-bold text-emerald-700 whitespace-nowrap">
                      {(item.quantity * item.priceAtMoment).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </span>
                    <button onClick={() => setRemoveModal({ open: true, index: idx })} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl z-10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-gray-600">Total Geral</span>
              <span className="text-2xl md:text-3xl font-bold text-emerald-700">
                {totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </span>
            </div>
            <button 
              onClick={handleFinish}
              disabled={items.length === 0 || !selectedPartnerId}
              className={`w-full text-white py-4 rounded-lg text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${editingOrderId ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
            >
              {editingOrderId ? 'Salvar Alterações' : 'Finalizar Pedido'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily History Section - Responsive Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="font-bold text-gray-800 text-sm md:text-base">
            Histórico de {type === 'buy' ? 'Compras' : 'Vendas'} de Hoje ({new Date().toLocaleDateString('pt-BR')})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-medium text-gray-500">Hora</th>
                <th className="p-4 font-medium text-gray-500">Parceiro</th>
                <th className="p-4 font-medium text-gray-500">Resumo</th>
                <th className="p-4 font-medium text-gray-500">Valor</th>
                <th className="p-4 font-medium text-gray-500 text-center">Status</th>
                <th className="p-4 font-medium text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Nenhuma movimentação registrada hoje.
                  </td>
                </tr>
              ) : (
                dailyHistory.map(order => {
                   const partnerName = partners.find(p => p.id === order.partnerId)?.name || 'Desconhecido';
                   const isEditable = order.status === 'pending';

                   return (
                    <tr key={order.id} className={`hover:bg-gray-50 ${editingOrderId === order.id ? 'bg-amber-50' : ''}`}>
                      <td className="p-4 text-gray-600">
                        {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        {partnerName}
                      </td>
                      <td className="p-4 text-gray-500 max-w-xs truncate">
                        {order.items.map(i => {
                          const p = products.find(prod => prod.id === i.productId);
                          return `${p?.name} (${i.quantity}${p?.unit})`;
                        }).join(', ')}
                      </td>
                      <td className="p-4 font-bold text-gray-800">
                        {order.totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                      </td>
                      <td className="p-4 text-center">
                        {order.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle size={12} /> Pago
                          </span>
                        )}
                        {order.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock size={12} /> Pendente
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle size={12} /> Cancelado
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {/* BOTÃO DE IMPRIMIR - SÓ HABILITADO SE PENDENTE */}
                        {isEditable ? (
                          <button
                            onClick={() => {
                              const partner = partners.find(p => p.id === order.partnerId);
                              if (partner) {
                                setShowReceipt({
                                  id: order.id,
                                  items: order.items,
                                  total: order.totalValue,
                                  partner: partner
                                });
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border mr-2 bg-white border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200`}
                            title="Imprimir Conferência"
                          >
                            <Printer size={14} />
                          </button>
                        ) : (
                           <button
                            disabled
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border mr-2 bg-gray-100 border-transparent text-gray-400 cursor-not-allowed"
                            title="Indisponível após processamento"
                          >
                            <Printer size={14} />
                          </button>
                        )}
                        
                        {/* BOTÃO DE EDITAR - SÓ HABILITADO SE PENDENTE */}
                        {isEditable ? (
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border bg-white border-gray-200 text-gray-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                            title="Editar Pedido"
                          >
                            <Edit size={14} /> Alterar
                          </button>
                        ) : (
                          // Disabled button logic
                          <button
                            disabled
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border bg-gray-100 border-transparent text-gray-400 cursor-not-allowed"
                            title="Pedido finalizado não pode ser editado"
                          >
                            <Edit size={14} /> Alterar
                          </button>
                        )}
                      </td>
                    </tr>
                   );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={removeModal.open}
        onClose={() => setRemoveModal({ open: false, index: null })}
        onConfirm={confirmRemove}
        title="Remover Item"
        message="Deseja remover este item da lista do pedido?"
        confirmText="Remover"
        cancelText="Manter"
        variant="warning"
      />

      <MasterPasswordModal 
        isOpen={masterAuth.isOpen}
        onClose={() => setMasterAuth({ ...masterAuth, isOpen: false })}
        onAuthenticated={() => masterAuth.pendingAction && masterAuth.pendingAction()}
        title={masterAuth.title}
        logDetails={masterAuth.logDetails}
        requiredPermission={masterAuth.requiredPermission}
      />
    </div>
  );
};

export default OrderForm;
