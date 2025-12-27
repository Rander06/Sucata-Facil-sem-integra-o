
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Plan, UserPermissions } from '../types';
import { 
  Plus, Edit2, Trash2, CheckCircle, X, HardDrive, Users, CreditCard, LifeBuoy, Save, Server, Crown, Eye
} from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';

const SuperAdminPlans = () => {
  const { plans, addPlan, updatePlan, deletePlan } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<Plan | null>(null);
  
  // Deletion States
  const [deleteModal, setDeleteModal] = useState<{open: boolean, planId: string | null}>({ open: false, planId: null });
  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });

  // Form State
  const initialFormState: Omit<Plan, 'id' | 'createdAt'> = {
    name: '',
    description: '',
    priceMonthly: 0,
    priceAnnual: 0,
    maxUsers: 1,
    storageLimit: '2 GB',
    supportLevel: 'basic',
    backupType: 'manual',
    features: [],
    color: 'bg-gray-100 text-gray-800',
    isPopular: false
  };

  const [formData, setFormData] = useState(initialFormState);

  // Options for Selects
  const userOptions = [1, 3, 5, 10, 20, 50, 9999];
  const storageOptions = ['2 GB', '5 GB', '10 GB', '20 GB', '50 GB', '100 GB', '1 TB'];
  const supportOptions = [
    { val: 'basic', label: 'Básico (E-mail)' },
    { val: 'priority', label: 'Prioritário (E-mail + WhatsApp)' },
    { val: '24/7', label: 'VIP 24/7 (Chat + E-mail + WhatsApp)' }
  ];
  const backupOptions = [
    { val: 'manual', label: 'Apenas Manual' },
    { val: 'auto', label: 'Automático Diário' },
    { val: 'both', label: 'Automático + Manual' }
  ];
  const extraFeaturesList = [
    'Acesso antecipado a novos recursos',
    'Treinamento personalizado',
    'Gestão Multi-unidades',
    'API de Integração',
    'Backup Automático', // Added for specific prompt matching
    'Sem treinamento'
  ];

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        maxUsers: plan.maxUsers,
        storageLimit: plan.storageLimit,
        supportLevel: plan.supportLevel,
        backupType: plan.backupType,
        features: plan.features || [],
        color: plan.color || 'bg-gray-100 text-gray-800',
        isPopular: plan.isPopular
      });
    } else {
      setEditingPlan(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate ID from name if new (slugify)
    const id = editingPlan ? editingPlan.id : formData.name.toLowerCase().replace(/\s+/g, '-');

    const planData: Plan = {
        id,
        ...formData,
        createdAt: editingPlan ? editingPlan.createdAt : new Date().toISOString()
    };

    if (editingPlan) {
        updatePlan(planData);
    } else {
        addPlan(planData);
    }
    setIsModalOpen(false);
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => {
        const exists = prev.features.includes(feature);
        if (exists) return { ...prev, features: prev.features.filter(f => f !== feature) };
        return { ...prev, features: [...prev.features, feature] };
    });
  };

  // Protected Edit Flow
  const handleEditClick = (plan: Plan) => {
    setMasterAuth({
        isOpen: true,
        pendingAction: () => handleOpenModal(plan),
        title: 'Editar Plano',
        logDetails: `Acesso à edição do plano: ${plan.name} (ID: ${plan.id})`,
        requiredPermission: 'manage_subscription'
    });
  };

  // Delete Flow with Password
  const handleDeleteClick = (id: string) => {
    setDeleteModal({ open: true, planId: id });
  };

  const proceedToDelete = () => {
    const planId = deleteModal.planId;
    const plan = plans.find(p => p.id === planId);
    
    if (!planId || !plan) return;

    const finalAction = () => {
        deletePlan(planId);
        setDeleteModal({ open: false, planId: null });
    };

    // Close confirm modal and Open Master Password
    setDeleteModal({ open: false, planId: null }); 
    
    setMasterAuth({ 
        isOpen: true, 
        pendingAction: finalAction, 
        title: 'Autorizar Exclusão de Plano',
        logDetails: `Exclusão do Plano: ${plan.name}. Esta ação impede novas assinaturas neste plano.`,
        requiredPermission: 'manage_subscription' // Requires super admin role implicitly
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-2xl font-bold text-gray-800">Gerenciar Planos</h2>
           <p className="text-gray-500">Configure os pacotes de assinatura disponíveis</p>
         </div>
         <button 
           onClick={() => handleOpenModal()}
           className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm font-bold"
         >
           <Plus size={18} /> Criar Novo Plano
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map(plan => (
             <div key={plan.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden relative group ${plan.isPopular ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                {plan.isPopular && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                        MAIS POPULAR
                    </div>
                )}
                
                <div className={`p-4 border-b border-gray-100 flex justify-between items-start ${plan.color} bg-opacity-20`}>
                   <div>
                      <h3 className="font-bold text-lg text-gray-800">{plan.name}</h3>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 h-8">{plan.description}</p>
                   </div>
                   <div className={`p-2 rounded-lg ${plan.color}`}>
                      <Crown size={20} />
                   </div>
                </div>

                <div className="p-5 space-y-4">
                   {/* Pricing */}
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-xs text-gray-400 uppercase font-bold">Mensal</p>
                         <p className="text-2xl font-bold text-emerald-700">R$ {plan.priceMonthly.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-gray-400 uppercase font-bold">Anual</p>
                         <p className="text-lg font-bold text-blue-700">R$ {plan.priceAnnual.toFixed(2)}</p>
                      </div>
                   </div>

                   {/* Limits */}
                   <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                         <Users size={16} className="text-gray-400" />
                         <span>{plan.maxUsers === 9999 ? 'Ilimitado' : plan.maxUsers} Usuários</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                         <HardDrive size={16} className="text-gray-400" />
                         <span>{plan.storageLimit} Espaço</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                         <LifeBuoy size={16} className="text-gray-400" />
                         <span className="capitalize">{plan.supportLevel === '24/7' ? '24/7' : plan.supportLevel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                         <Server size={16} className="text-gray-400" />
                         <span className="capitalize">{plan.backupType}</span>
                      </div>
                   </div>

                   {/* Extras */}
                   <div className="min-h-[60px]">
                      {plan.features.length > 0 ? (
                         <ul className="space-y-1">
                            {plan.features.slice(0,3).map((feat, i) => (
                               <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                  <CheckCircle size={10} className="text-green-500" /> {feat}
                               </li>
                            ))}
                            {plan.features.length > 3 && <li className="text-xs text-gray-400 pl-4">...e mais {plan.features.length - 3}</li>}
                         </ul>
                      ) : (
                         <p className="text-xs text-gray-400 italic">Sem extras configurados.</p>
                      )}
                   </div>
                </div>

                <div className="bg-gray-50 p-3 flex gap-2 justify-end border-t border-gray-100">
                   <button onClick={() => setViewingPlan(plan)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all" title="Visualizar">
                      <Eye size={18} />
                   </button>
                   <button onClick={() => handleEditClick(plan)} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all" title="Editar (Requer Senha)">
                      <Edit2 size={18} />
                   </button>
                   <button onClick={() => handleDeleteClick(plan.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all" title="Excluir">
                      <Trash2 size={18} />
                   </button>
                </div>
             </div>
          ))}
       </div>

       {/* Modal Create/Edit */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[95vh] my-4">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-2xl">
                 <div>
                    <h3 className="text-xl font-bold text-gray-800">{editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}</h3>
                    <p className="text-sm text-gray-500">Defina as regras e limites do pacote</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                 
                 {/* Passo 1: Info */}
                 <section>
                    <h4 className="text-sm font-bold text-emerald-700 uppercase mb-4 border-b border-emerald-100 pb-2">Passo 1: Nome do Plano</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Plano</label>
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: Enterprise, Pro..." />
                       </div>
                       <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição (Opcional)</label>
                          <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Resumo curto..." />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor do Tema</label>
                          <select value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg bg-white">
                             <option value="bg-gray-100 text-gray-800">Cinza (Padrão)</option>
                             <option value="bg-emerald-100 text-emerald-800">Verde (Essencial)</option>
                             <option value="bg-orange-100 text-orange-800">Laranja (Pro)</option>
                             <option value="bg-blue-100 text-blue-800">Azul (Premium)</option>
                             <option value="bg-purple-100 text-purple-800">Roxo (VIP)</option>
                          </select>
                       </div>
                       <div className="flex items-end pb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                             <input type="checkbox" checked={formData.isPopular} onChange={e => setFormData({...formData, isPopular: e.target.checked})} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" />
                             <span className="text-sm font-bold text-gray-700">Marcar como "Mais Popular"</span>
                          </label>
                       </div>
                    </div>
                 </section>

                 {/* Passo 2: Preço */}
                 <section>
                    <h4 className="text-sm font-bold text-emerald-700 uppercase mb-4 border-b border-emerald-100 pb-2">Passo 2: Preço do Plano</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Mensal (R$)</label>
                          <div className="relative">
                             <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                             <input type="number" step="0.01" required value={formData.priceMonthly} onChange={e => setFormData({...formData, priceMonthly: parseFloat(e.target.value)})} className="w-full pl-9 p-3 border border-gray-200 rounded-lg font-bold text-gray-800" />
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Anual (R$)</label>
                          <div className="relative">
                             <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                             <input type="number" step="0.01" required value={formData.priceAnnual} onChange={e => setFormData({...formData, priceAnnual: parseFloat(e.target.value)})} className="w-full pl-9 p-3 border border-gray-200 rounded-lg font-bold text-gray-800" />
                          </div>
                       </div>
                    </div>
                 </section>

                 {/* Passo 3: Funcionalidades */}
                 <section>
                    <h4 className="text-sm font-bold text-emerald-700 uppercase mb-4 border-b border-emerald-100 pb-2">Passo 3: Funcionalidades do Plano</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuários</label>
                          <select value={formData.maxUsers} onChange={e => setFormData({...formData, maxUsers: parseInt(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-lg bg-white">
                             {userOptions.map(opt => (
                                <option key={opt} value={opt}>{opt === 9999 ? 'Usuários Ilimitados' : `${opt} usuários`}</option>
                             ))}
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Armazenamento</label>
                          <select value={formData.storageLimit} onChange={e => setFormData({...formData, storageLimit: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg bg-white">
                             {storageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Suporte</label>
                          <select value={formData.supportLevel} onChange={e => setFormData({...formData, supportLevel: e.target.value as any})} className="w-full p-3 border border-gray-200 rounded-lg bg-white">
                             {supportOptions.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Backup</label>
                          <select value={formData.backupType} onChange={e => setFormData({...formData, backupType: e.target.value as any})} className="w-full p-3 border border-gray-200 rounded-lg bg-white">
                             {backupOptions.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                          </select>
                       </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                       <p className="text-xs font-bold text-gray-500 uppercase mb-3">Extras</p>
                       <div className="space-y-2">
                          {extraFeaturesList.map(feat => (
                             <label key={feat} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                                <input type="checkbox" checked={formData.features.includes(feat)} onChange={() => handleFeatureToggle(feat)} className="w-4 h-4 text-emerald-600 rounded" />
                                <span className="text-sm text-gray-700">{feat}</span>
                             </label>
                          ))}
                       </div>
                    </div>
                 </section>

              </form>

              <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                    Cancelar
                 </button>
                 <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2">
                    <Save size={18} /> Salvar Plano
                 </button>
              </div>
           </div>
        </div>
       )}

       {/* View Modal */}
       {viewingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative">
              <div className={`p-6 text-white ${viewingPlan.color.includes('bg-') ? viewingPlan.color.split(' ').find(c => c.startsWith('bg-')) : 'bg-gray-800'} bg-opacity-90`}>
                 <button onClick={() => setViewingPlan(null)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                    <X size={24} />
                 </button>
                 <h3 className="text-2xl font-bold">{viewingPlan.name}</h3>
                 <p className="opacity-90 mt-1 text-sm">{viewingPlan.description}</p>
              </div>
              
              <div className="p-6 space-y-6">
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-bold">Mensal</p>
                        <p className="text-xl font-bold text-emerald-600">R$ {viewingPlan.priceMonthly.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-bold">Anual</p>
                        <p className="text-xl font-bold text-blue-600">R$ {viewingPlan.priceAnnual.toFixed(2)}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500 text-sm">Usuários Permitidos</span>
                        <span className="font-bold text-gray-800">{viewingPlan.maxUsers === 9999 ? 'Ilimitado' : viewingPlan.maxUsers}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500 text-sm">Armazenamento</span>
                        <span className="font-bold text-gray-800">{viewingPlan.storageLimit}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500 text-sm">Nível de Suporte</span>
                        <span className="font-bold text-gray-800 capitalize">{viewingPlan.supportLevel}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500 text-sm">Tipo de Backup</span>
                        <span className="font-bold text-gray-800 capitalize">{viewingPlan.backupType}</span>
                    </div>
                 </div>

                 <div>
                    <p className="text-sm font-bold text-gray-800 mb-2">Recursos Inclusos:</p>
                    {viewingPlan.features.length > 0 ? (
                        <ul className="grid grid-cols-1 gap-2">
                            {viewingPlan.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                    <CheckCircle size={14} className="text-green-500" /> {f}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-400 italic">Nenhum recurso extra.</p>
                    )}
                 </div>
              </div>
              
              <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                 <button onClick={() => setViewingPlan(null)} className="text-gray-500 hover:text-gray-700 font-bold text-sm">Fechar Visualização</button>
              </div>
           </div>
        </div>
       )}

       <ConfirmModal 
         isOpen={deleteModal.open}
         onClose={() => setDeleteModal({ open: false, planId: null })}
         onConfirm={proceedToDelete}
         title="Excluir Plano"
         message="Tem certeza? Empresas que usam este plano não serão afetadas imediatamente, mas ele não estará disponível para novas assinaturas."
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

export default SuperAdminPlans;
