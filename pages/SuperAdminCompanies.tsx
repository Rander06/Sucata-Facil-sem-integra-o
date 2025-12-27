import React, { useState, useEffect } from 'react';
import { useStore, PLANS_CONFIG } from '../services/store';
import { 
  Building, Search, Save, Calendar, CheckCircle, X, CreditCard, Trash2, Plus, User, Mail, Phone, FileText, Lock, Edit2, Eye
} from 'lucide-react';
import { Company, CompanyPlan, CompanyStatus, UserPermissions } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';

const SuperAdminCompanies = () => {
  const { allCompanies, updateCompanyDetails, deleteCompany, registerCompany, plans } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATE FOR CREATE FLOW ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    companyName: '',
    document: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    plan: 'professional' as CompanyPlan,
    billingCycle: 'monthly' as 'monthly' | 'annual'
  });

  // State for Management Modal (Edit)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null); // NEW: View State
  const [activeTab, setActiveTab] = useState<'info' | 'subscription'>('info');
  
  // State for Deletion Flow
  const [deleteModal, setDeleteModal] = useState<{open: boolean, companyId: string | null}>({ open: false, companyId: null });
  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });
  
  // Form States for Editing
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [customDate, setCustomDate] = useState('');

  // Update edit form when company is selected
  useEffect(() => {
    if (selectedCompany) {
      setEditForm({
        name: selectedCompany.name,
        document: selectedCompany.document,
        ownerName: selectedCompany.ownerName,
        email: selectedCompany.email,
        phone: selectedCompany.phone,
        plan: selectedCompany.plan,
        status: selectedCompany.status,
        billingCycle: selectedCompany.billingCycle || 'monthly' // Load cycle
      });
      
      // Use subscriptionEndsAt directly
      const expDate = selectedCompany.subscriptionEndsAt || selectedCompany.trialEndsAt;
      setCustomDate(expDate ? new Date(expDate).toISOString().split('T')[0] : '');
    }
  }, [selectedCompany]);

  const filteredCompanies = allCompanies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm)
  );
  
  const getDaysLeft = (company: Company) => {
     // Use subscriptionEndsAt (which now handles trial period too)
     const endStr = company.subscriptionEndsAt || company.trialEndsAt;
     if (!endStr) return 'Indefinido';
     const now = new Date();
     const end = new Date(endStr);
     const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
     return diff;
  };

  const formatDate = (dateString?: string) => {
     if (!dateString) return '-';
     return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Helper to safely get plan info from store (dynamic)
  const getPlanInfo = (planId: string) => {
      const foundPlan = plans.find(p => p.id === planId);
      if (foundPlan) return { name: foundPlan.name, color: foundPlan.color };
      // Fallback to PLANS_CONFIG for legacy or default
      const legacy = PLANS_CONFIG[planId];
      return legacy ? { name: legacy.name, color: legacy.color } : { name: planId, color: 'bg-gray-100 text-gray-800' };
  };

  // --- HELPERS FOR AUTH ---
  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  // --- CREATE ACTIONS ---
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      registerCompany({
        companyName: createFormData.companyName,
        document: createFormData.document,
        adminName: createFormData.adminName,
        email: createFormData.email,
        phone: createFormData.phone,
        password: createFormData.password,
        plan: createFormData.plan,
        billingCycle: createFormData.billingCycle
      });
      setIsCreateModalOpen(false);
      setCreateFormData({
        companyName: '', document: '', adminName: '', email: '', phone: '', password: '', plan: 'professional', billingCycle: 'monthly'
      });
      alert('Empresa cadastrada com sucesso!');
    } catch (error: any) {
      alert(error.message || 'Erro ao cadastrar empresa.');
    }
  };

  // --- EDIT ACTIONS ---
  const handleEditClick = (company: Company) => {
     const openEdit = () => {
        setSelectedCompany(company);
        setActiveTab('info'); 
     };

     // Require Password to Edit Company
     requestAuth(
        openEdit, 
        'Acesso Restrito', 
        `Acesso à edição da empresa: ${company.name} (ID: ${company.id})`,
        'manage_subscription'
     );
  };

  const handleSaveGeneral = () => {
    if (!selectedCompany) return;
    updateCompanyDetails(selectedCompany.id, {
      name: editForm.name,
      document: editForm.document,
      ownerName: editForm.ownerName,
      email: editForm.email,
      phone: editForm.phone
    });
    alert('Dados cadastrais atualizados com sucesso!');
    setSelectedCompany(prev => prev ? ({...prev, ...editForm} as Company) : null);
  };

  const handleSaveSubscription = () => {
    if (!selectedCompany) return;
    
    const updates: Partial<Company> = {
      plan: editForm.plan,
      status: editForm.status,
      billingCycle: editForm.billingCycle
    };

    if (customDate) {
      const [year, month, day] = customDate.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      newDate.setHours(23, 59, 59);
      
      updates.subscriptionEndsAt = newDate.toISOString();
    }

    updateCompanyDetails(selectedCompany.id, updates);
    alert('Plano e validade atualizados com sucesso!');
    setSelectedCompany(null); 
  };

  // --- DELETE FLOW ---
  const handleDeleteClick = (id: string) => {
    setDeleteModal({ open: true, companyId: id });
  };

  const proceedToDelete = () => {
    const companyId = deleteModal.companyId;
    const company = allCompanies.find(c => c.id === companyId);
    
    if (!companyId || !company) return;

    const finalAction = () => {
        deleteCompany(companyId);
        setDeleteModal({ open: false, companyId: null });
    };

    // Close confirm modal and Open Master Password
    setDeleteModal({ open: false, companyId: null }); // Closes warning
    
    setMasterAuth({ 
        isOpen: true, 
        pendingAction: finalAction, 
        title: 'Confirmar Exclusão Definitiva',
        logDetails: `Exclusão da Empresa: ${company.name} (ID: ${company.id}). Ação irreversível.`,
        requiredPermission: 'manage_subscription' // Requires super admin role implicitly (using a specific SA perm)
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gerenciar Empresas</h2>
            <p className="text-gray-500">Controle total sobre clientes e assinaturas</p>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                   type="text" 
                   placeholder="Buscar empresa..."
                   className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button 
               onClick={() => setIsCreateModalOpen(true)}
               className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm font-bold text-sm whitespace-nowrap"
             >
               <Plus size={18} /> Nova Empresa
             </button>
          </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-xs">
                 <tr>
                    <th className="p-4">Empresa / Documento</th>
                    <th className="p-4">Plano Atual</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4 text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {filteredCompanies.map(company => {
                    const daysLeft = getDaysLeft(company);
                    const isExpired = typeof daysLeft === 'number' && daysLeft < 0;
                    const expDate = company.subscriptionEndsAt || company.trialEndsAt;
                    const planInfo = getPlanInfo(company.plan);
                    
                    return (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                       <td className="p-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200">
                                {company.name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                  {company.name}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">{company.document}</div>
                                <div className="text-xs text-gray-400">{company.ownerName}</div>
                             </div>
                          </div>
                       </td>
                       <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${planInfo.color} border-opacity-20`}>
                             {planInfo.name}
                          </span>
                          {company.billingCycle === 'annual' && (
                            <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase border border-blue-200">Anual</span>
                          )}
                       </td>
                       <td className="p-4">
                          {company.status === 'active' 
                             ? <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Ativa</span>
                             : <span className="flex items-center gap-1.5 text-red-600 font-bold text-xs"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Bloqueada</span>
                          }
                       </td>
                       <td className="p-4">
                           <div className={`flex flex-col ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                              <span className="font-bold flex items-center gap-1">
                                 {formatDate(expDate)}
                              </span>
                              <span className="text-xs opacity-80 font-medium">
                                 {isExpired ? 'Expirou' : `${daysLeft} dias restantes`}
                              </span>
                           </div>
                       </td>
                       <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* VIEW BUTTON */}
                            <button 
                                onClick={() => setViewingCompany(company)}
                                className="p-1.5 bg-white border border-gray-200 text-blue-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                title="Visualizar Detalhes"
                            >
                                <Eye size={16} />
                            </button>

                            {/* EDIT BUTTON */}
                            <button 
                                onClick={() => handleEditClick(company)}
                                className="p-1.5 bg-white border border-gray-200 text-emerald-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm"
                                title="Editar (Senha)"
                            >
                                <Edit2 size={16} />
                            </button>

                            {/* DELETE BUTTON */}
                            <button 
                                onClick={() => handleDeleteClick(company.id)}
                                className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                                title="Excluir (Senha)"
                            >
                                <Trash2 size={16} />
                            </button>
                          </div>
                       </td>
                    </tr>
                 )})}
                 {filteredCompanies.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-gray-400">Nenhuma empresa encontrada.</td></tr>
                 )}
              </tbody>
           </table>
         </div>
       </div>

       {/* --- VIEW MODAL --- */}
       {viewingCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative">
              {/* Header with color based on status */}
              <div className={`p-6 text-white ${viewingCompany.status === 'active' ? 'bg-emerald-600' : 'bg-red-600'} relative overflow-hidden`}>
                 <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Building size={100} />
                 </div>
                 <button onClick={() => setViewingCompany(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 p-1 rounded-full transition-colors">
                    <X size={20} />
                 </button>
                 <div className="relative z-10">
                    <h2 className="text-2xl font-bold">{viewingCompany.name}</h2>
                    <p className="opacity-90 text-sm font-mono mt-1">{viewingCompany.document}</p>
                    <span className="inline-block mt-3 bg-white/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border border-white/30">
                        {viewingCompany.status === 'active' ? 'Empresa Ativa' : 'Acesso Bloqueado'}
                    </span>
                 </div>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Contact Info */}
                 <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <User size={14} /> Responsável e Contato
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-gray-600 text-sm">Nome</span>
                            <span className="font-bold text-gray-800 text-sm">{viewingCompany.ownerName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-gray-600 text-sm">Email</span>
                            <span className="font-medium text-gray-800 text-sm">{viewingCompany.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">Telefone</span>
                            <span className="font-medium text-gray-800 text-sm">{viewingCompany.phone}</span>
                        </div>
                    </div>
                 </div>

                 {/* Subscription Info */}
                 <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <CreditCard size={14} /> Assinatura
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-gray-600 text-sm">Plano Atual</span>
                            {(() => {
                                const info = getPlanInfo(viewingCompany.plan);
                                return (
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${info.color} border-opacity-20 bg-white`}>
                                        {info.name}
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-gray-600 text-sm">Ciclo de Cobrança</span>
                            <span className="font-bold text-gray-800 text-sm capitalize">{viewingCompany.billingCycle === 'annual' ? 'Anual' : 'Mensal'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Vencimento / Fim Teste</span>
                            {(() => {
                                const days = getDaysLeft(viewingCompany);
                                const isExpired = typeof days === 'number' && days < 0;
                                return (
                                    <span className={`font-bold text-sm ${isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {formatDate(viewingCompany.subscriptionEndsAt || viewingCompany.trialEndsAt)}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                 </div>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-center">
                 <button onClick={() => setViewingCompany(null)} className="text-gray-500 hover:text-gray-800 text-sm font-bold">
                    Fechar Visualização
                 </button>
              </div>
           </div>
        </div>
       )}

       {/* --- CREATE MODAL --- */}
       {isCreateModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
               <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <div>
                     <h3 className="text-xl font-bold text-gray-800">Cadastrar Nova Empresa</h3>
                     <p className="text-sm text-gray-500">Preencha os dados para criar o ambiente.</p>
                  </div>
                  <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
               </div>
               
               <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-4">
                     <h4 className="text-sm font-bold text-emerald-700 uppercase mb-2 border-b border-emerald-100 pb-1">Dados da Empresa</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold text-gray-500 mb-1">Nome Fantasia</label>
                           <div className="relative">
                              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input required className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                                value={createFormData.companyName} onChange={e => setCreateFormData({...createFormData, companyName: e.target.value})} />
                           </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold text-gray-500 mb-1">CNPJ / CPF</label>
                           <div className="relative">
                              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input required className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                                value={createFormData.document} onChange={e => setCreateFormData({...createFormData, document: e.target.value})} />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-sm font-bold text-emerald-700 uppercase mb-2 border-b border-emerald-100 pb-1">Administrador Principal</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo</label>
                           <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input required className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                                value={createFormData.adminName} onChange={e => setCreateFormData({...createFormData, adminName: e.target.value})} />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1">E-mail (Login)</label>
                           <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input type="email" required className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                                value={createFormData.email} onChange={e => setCreateFormData({...createFormData, email: e.target.value})} />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1">Senha Inicial</label>
                           <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input type="password" required className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                                value={createFormData.password} onChange={e => setCreateFormData({...createFormData, password: e.target.value})} />
                           </div>
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1">Telefone / WhatsApp</label>
                           <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input required className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                                value={createFormData.phone} onChange={e => setCreateFormData({...createFormData, phone: e.target.value})} />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-sm font-bold text-emerald-700 uppercase mb-2 border-b border-emerald-100 pb-1">Plano e Assinatura</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1">Plano</label>
                           <select className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm"
                             value={createFormData.plan} onChange={e => setCreateFormData({...createFormData, plan: e.target.value as CompanyPlan})}>
                              {plans.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1">Ciclo</label>
                           <select className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm"
                             value={createFormData.billingCycle} onChange={e => setCreateFormData({...createFormData, billingCycle: e.target.value as 'monthly'|'annual'})}>
                              <option value="monthly">Mensal</option>
                              <option value="annual">Anual</option>
                           </select>
                        </div>
                     </div>
                  </div>
               </form>

               <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                  <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                  <button onClick={handleCreateSubmit} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2">
                     <CheckCircle size={18} /> Cadastrar Empresa
                  </button>
               </div>
            </div>
         </div>
       )}

       {/* --- EDIT MODAL (Existing) --- */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
              
              <div className="bg-emerald-600 text-white p-6 shrink-0 flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
                    <p className="text-emerald-100/80 text-sm">ID: {selectedCompany.id}</p>
                 </div>
                 <button onClick={() => setSelectedCompany(null)} className="text-emerald-100/80 hover:text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="flex border-b border-gray-200 shrink-0">
                 <button 
                   onClick={() => setActiveTab('info')}
                   className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                 >
                   Dados Cadastrais
                 </button>
                 <button 
                   onClick={() => setActiveTab('subscription')}
                   className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'subscription' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                 >
                   Assinatura & Prazos
                 </button>
              </div>

              <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                 {activeTab === 'info' && (
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Empresa</label>
                             <input 
                               className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                               value={editForm.name}
                               onChange={e => setEditForm({...editForm, name: e.target.value})}
                             />
                          </div>
                          <div className="col-span-2">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ / CPF</label>
                             <input 
                               className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-gray-800"
                               value={editForm.document}
                               onChange={e => setEditForm({...editForm, document: e.target.value})}
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Dono</label>
                             <input 
                               className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                               value={editForm.ownerName}
                               onChange={e => setEditForm({...editForm, ownerName: e.target.value})}
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                             <input 
                               className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                               value={editForm.phone}
                               onChange={e => setEditForm({...editForm, phone: e.target.value})}
                             />
                          </div>
                          <div className="col-span-2">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail (Login Principal)</label>
                             <input 
                               className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                               value={editForm.email}
                               onChange={e => setEditForm({...editForm, email: e.target.value})}
                             />
                          </div>
                       </div>
                       <div className="pt-4 border-t border-gray-200 flex justify-end">
                          <button 
                            onClick={handleSaveGeneral}
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2"
                          >
                             <Save size={18} /> Salvar Alterações
                          </button>
                       </div>
                    </div>
                 )}

                 {activeTab === 'subscription' && (
                    <div className="space-y-6">
                       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                             <CreditCard size={18} className="text-emerald-600" /> Detalhes do Plano
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Plano e Ciclo</label>
                                <select 
                                   className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-gray-800"
                                   value={`${editForm.plan}_${editForm.billingCycle || 'monthly'}`}
                                   onChange={e => {
                                      const val = e.target.value;
                                      const [plan, cycle] = val.split('_');
                                      setEditForm({
                                         ...editForm, 
                                         plan: plan as CompanyPlan, 
                                         billingCycle: cycle as 'monthly' | 'annual'
                                      });
                                   }}
                                >
                                   {plans.map(p => (
                                      <optgroup key={p.id} label={p.name}>
                                          <option value={`${p.id}_monthly`}>{p.name} - Mensal (R$ {p.priceMonthly.toFixed(2)})</option>
                                          <option value={`${p.id}_annual`}>{p.name} - Anual (R$ {p.priceAnnual.toFixed(2)})</option>
                                      </optgroup>
                                   ))}
                                </select>
                             </div>
                             
                             <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Acesso</label>
                                <select 
                                   className={`w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold ${editForm.status === 'active' ? 'text-green-600' : 'text-red-600'}`}
                                   value={editForm.status}
                                   onChange={e => setEditForm({...editForm, status: e.target.value as CompanyStatus})}
                                >
                                   <option value="active">Ativo (Liberado)</option>
                                   <option value="blocked">Bloqueado (Pagamento Pendente)</option>
                                   <option value="suspended">Suspenso (Violação)</option>
                                </select>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Calendar size={18} className="text-emerald-600" /> Data de Vencimento
                             </h3>
                             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                O sistema bloqueia automaticamente após esta data
                             </span>
                          </div>
                          
                          <div className="flex gap-4 items-end mb-4">
                             <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Definir Data Exata</label>
                                <input 
                                  type="date"
                                  className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-bold"
                                  value={customDate}
                                  onChange={e => setCustomDate(e.target.value)}
                                />
                             </div>
                          </div>
                       </div>

                       <div className="pt-2 border-t border-gray-200 flex justify-end gap-3">
                          <button 
                            onClick={() => setSelectedCompany(null)}
                            className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                          >
                             Cancelar
                          </button>
                          <button 
                            onClick={handleSaveSubscription}
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2"
                          >
                             <CheckCircle size={18} /> Confirmar & Salvar
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Modais de Exclusão Segura */}
      <ConfirmModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, companyId: null })}
        onConfirm={proceedToDelete}
        title="Excluir Empresa"
        message="ATENÇÃO: Esta ação excluirá PERMANENTEMENTE a empresa e TODOS os dados vinculados (usuários, produtos, pedidos, financeiro). Não é possível desfazer. Deseja continuar?"
        confirmText="Continuar para Senha"
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

export default SuperAdminCompanies;