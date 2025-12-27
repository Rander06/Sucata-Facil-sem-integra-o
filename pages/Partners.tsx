import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Partner, Order, UserPermissions } from '../types';
import { User, Truck, Phone, FileText, Trash2, Edit2, History, X, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';

const Partners = () => {
  const { partners, addPartner, updatePartner, deletePartner, orders, products } = useStore();
  const [activeTab, setActiveTab] = useState<'supplier' | 'client'>('supplier');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', document: '', phone: '', address: '' });
  const [deleteModal, setDeleteModal] = useState<{open: boolean, partner: Partner | null}>({ open: false, partner: null });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master Password State
  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });

  // Estado para o Modal de Histórico
  const [historyPartner, setHistoryPartner] = useState<Partner | null>(null);

  // LÓGICA DE EXIBIÇÃO: TOP 10 MAIS ATIVOS
  const displayedPartners = useMemo(() => {
    const typePartners = partners.filter(p => p.type === activeTab);

    // 1. Se tiver busca, filtra pelo nome/doc e mostra TUDO que encontrar
    if (searchTerm) {
      return typePartners.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.document.includes(searchTerm)
      );
    }

    // 2. Se não tiver busca, calcula relevância baseada em frequência de pedidos
    const partnerUsage: Record<string, number> = {};
    
    orders.forEach(order => {
      // Para Fornecedores, conta Compras ('buy'). Para Clientes, conta Vendas ('sell').
      const isRelevant = (activeTab === 'supplier' && order.type === 'buy') || 
                         (activeTab === 'client' && order.type === 'sell');
      
      if (isRelevant && order.partnerId) {
        partnerUsage[order.partnerId] = (partnerUsage[order.partnerId] || 0) + 1;
      }
    });

    // 3. Ordena por uso (descendente) e pega top 10
    return [...typePartners]
      .sort((a, b) => (partnerUsage[b.id] || 0) - (partnerUsage[a.id] || 0))
      .slice(0, 10);

  }, [partners, activeTab, searchTerm, orders]);

  // Filtra pedidos para o parceiro selecionado no histórico
  const partnerHistory = useMemo(() => {
    if (!historyPartner) return [];
    return orders
      .filter(o => o.partnerId === historyPartner.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [historyPartner, orders]);

  const totalHistoryValue = partnerHistory.reduce((acc, curr) => {
    // Soma apenas pedidos pagos para o total financeiro efetivado
    if (curr.status === 'paid') return acc + curr.totalValue;
    return acc;
  }, 0);

  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  const handleEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setFormData({
      name: partner.name,
      document: partner.document,
      phone: partner.phone || '',
      address: partner.address || ''
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', document: '', phone: '', address: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      // Update existing
      const existingPartner = partners.find(p => p.id === editingId);
      if (existingPartner) {
        updatePartner({
          ...existingPartner,
          type: activeTab,
          ...formData
        });
      }
    } else {
      // Create new
      addPartner({
        id: '',
        type: activeTab,
        ...formData
      });
    }
    handleCloseForm();
  };

  const confirmDelete = () => {
    if (deleteModal.partner) {
      const p = deleteModal.partner;
      const details = `Parceiro: ${p.name} | Tipo: ${p.type} | Doc: ${p.document} | ID: ${p.id}`;
      // Sempre pedir senha para excluir parceiro
      requestAuth(() => {
         deletePartner(deleteModal.partner!.id);
         setDeleteModal({ open: false, partner: null });
      }, 'Excluir Parceiro', details, 'manage_partners');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Gestão de Parceiros</h2>
           <p className="text-sm text-gray-500">Administre seus clientes e fornecedores</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData({ name: '', document: '', phone: '', address: '' }); setShowForm(true); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm w-full md:w-auto"
        >
          + Novo {activeTab === 'supplier' ? 'Fornecedor' : 'Cliente'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
         <div className="flex gap-4 border-b border-gray-200">
           <button
             className={`pb-3 px-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'supplier' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'}`}
             onClick={() => { setActiveTab('supplier'); setSearchTerm(''); }}
           >
             <User className="w-4 h-4" /> Fornecedores
           </button>
           <button
             className={`pb-3 px-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'client' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'}`}
             onClick={() => { setActiveTab('client'); setSearchTerm(''); }}
           >
             <Truck className="w-4 h-4" /> Clientes
           </button>
         </div>
         
         {/* Search Bar */}
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
            <input 
              type="text"
              placeholder={`Buscar ${activeTab === 'supplier' ? 'fornecedores' : 'clientes'} por nome ou documento...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-800 shadow-sm"
            />
         </div>
         {!searchTerm && (
           <p className="text-[10px] text-gray-400 font-medium text-right uppercase px-1 -mt-2">
             Mostrando os 10 mais ativos ({activeTab === 'supplier' ? 'fornecem mais' : 'compram mais'})
           </p>
         )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm animate-fade-in">
          <h3 className="text-lg font-bold mb-4 text-gray-800">
            {editingId ? `Editar ${activeTab === 'supplier' ? 'Fornecedor' : 'Cliente'}` : `Cadastrar ${activeTab === 'supplier' ? 'Fornecedor' : 'Cliente'}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome / Razão Social</label>
              <input 
                placeholder="Nome Completo"
                required
                disabled={!!editingId}
                className={`p-2 border border-emerald-100 rounded-lg w-full bg-emerald-50 text-gray-800 ${editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-emerald-50'}`}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Documento (CPF/CNPJ)</label>
              <input 
                placeholder="CPF / CNPJ"
                required
                disabled={!!editingId}
                className={`p-2 border border-emerald-100 rounded-lg w-full bg-emerald-50 text-gray-800 ${editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-emerald-50'}`}
                value={formData.document}
                onChange={e => setFormData({...formData, document: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
               <h4 className="text-sm font-bold text-emerald-800 mb-2">Dados de Contato (Editáveis)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                    <input 
                      placeholder="(00) 00000-0000"
                      className="p-2 border border-emerald-200 rounded-lg w-full bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Endereço Completo</label>
                    <input 
                      placeholder="Rua, Número, Bairro..."
                      className="p-2 border border-emerald-200 rounded-lg w-full bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
               </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={handleCloseForm} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              {editingId ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedPartners.length === 0 ? (
           <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
             <User size={48} className="mx-auto mb-3 opacity-20" />
             <p>Nenhum {activeTab === 'supplier' ? 'fornecedor' : 'cliente'} encontrado com este critério.</p>
           </div>
        ) : (
           displayedPartners.map(partner => (
            <div key={partner.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setHistoryPartner(partner)}
                  className="text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 p-1.5 rounded-lg transition-colors shadow-sm border border-transparent hover:border-blue-100"
                  title="Ver Histórico"
                >
                  <History size={16} />
                </button>
                <button 
                  onClick={() => handleEdit(partner)}
                  className="text-gray-400 hover:text-emerald-600 bg-white hover:bg-emerald-50 p-1.5 rounded-lg transition-colors shadow-sm border border-transparent hover:border-emerald-100"
                  title="Editar Contato"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setDeleteModal({ open: true, partner })}
                  className="text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 p-1.5 rounded-lg transition-colors shadow-sm border border-transparent hover:border-red-100"
                  title="Excluir Parceiro"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex items-start justify-between mb-3 pr-24">
                <div className="bg-emerald-50 p-2 rounded-full text-emerald-600">
                  {activeTab === 'supplier' ? <User size={20} /> : <Truck size={20} />}
                </div>
              </div>
              
              <span className="text-xs font-mono text-gray-400 block mb-1">{partner.document}</span>
              <h4 className="font-bold text-gray-800 text-lg mb-3 truncate" title={partner.name}>{partner.name}</h4>
              
              <div className="text-sm text-gray-500 space-y-2 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-emerald-500" /> 
                  <span className={!partner.phone ? "text-gray-300 italic" : ""}>
                    {partner.phone || 'Sem telefone'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-emerald-500" /> 
                  <span className={`truncate ${!partner.address ? "text-gray-300 italic" : ""}`}>
                    {partner.address || 'Sem endereço'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Histórico */}
      {historyPartner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Histórico de Pedidos</h3>
                <p className="text-sm text-gray-500">{historyPartner.name} ({historyPartner.document})</p>
              </div>
              <button onClick={() => setHistoryPartner(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                   <span className="text-xs text-gray-500 uppercase font-bold">Total em {historyPartner.type === 'supplier' ? 'Compras' : 'Vendas'} (Pagos)</span>
                   <p className="text-2xl font-bold text-emerald-700 mt-1">
                     {totalHistoryValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                   </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                   <span className="text-xs text-gray-500 uppercase font-bold">Última Atividade</span>
                   <p className="text-lg font-bold text-gray-700 mt-1">
                     {partnerHistory.length > 0 ? new Date(partnerHistory[0].createdAt).toLocaleDateString() : 'Nunca'}
                   </p>
                </div>
              </div>

              {partnerHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <History size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Nenhum histórico de pedidos encontrado para este parceiro.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                       <tr>
                         <th className="p-3">Data</th>
                         <th className="p-3">Tipo</th>
                         <th className="p-3">Resumo</th>
                         <th className="p-3">Valor</th>
                         <th className="p-3">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {partnerHistory.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="p-3 whitespace-nowrap">
                            {new Date(order.createdAt).toLocaleDateString()}
                            <span className="text-xs text-gray-400 block">{new Date(order.createdAt).toLocaleTimeString()}</span>
                          </td>
                          <td className="p-3">
                            {order.type === 'buy' ? (
                               <span className="flex items-center gap-1 text-orange-600 font-bold text-xs uppercase"><ArrowDownLeft size={14}/> Compra</span>
                            ) : (
                               <span className="flex items-center gap-1 text-blue-600 font-bold text-xs uppercase"><ArrowUpRight size={14}/> Venda</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 max-w-[200px] truncate">
                            {order.items.map(i => {
                               const p = products.find(prod => prod.id === i.productId);
                               return `${p?.name} (${i.quantity}${p?.unit})`;
                            }).join(', ')}
                          </td>
                          <td className="p-3 font-mono font-bold text-gray-800">
                             {order.totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                          </td>
                          <td className="p-3">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
               <button 
                 onClick={() => setHistoryPartner(null)}
                 className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
               >
                 Fechar
               </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, partner: null })}
        onConfirm={confirmDelete}
        title="Excluir Parceiro"
        message={`Tem certeza que deseja excluir o parceiro "${deleteModal.partner?.name}"?`}
        confirmText="Excluir"
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
    </div>
  );
};

export default Partners;