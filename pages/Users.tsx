
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { User, UserRole, UserPermissions } from '../types';
import { Plus, Edit2, Trash2, Shield, Mail, User as UserIcon, History, X, Clock, FileText, CheckSquare, Square, Lock, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';
import { ROLE_PERMISSIONS } from '../services/store';

// Dicionário para traduzir as chaves de permissão para texto legível
const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  view_dashboard: "Dashboard Geral",
  register_buy: "Registrar Compra de Sucata",
  register_sell: "Registrar Venda / Revenda",
  manage_cashier: "Controle de Caixa (Abrir/Fechar)",
  approve_manual_transaction: "Autorizar Sangria/Pagamento (Senha)", 
  view_inventory: "Visualizar Estoque",
  manage_inventory: "Adicionar Novos Produtos",
  edit_product: "Editar Produtos (Preço/Nome)", 
  delete_product: "Excluir Produtos do Estoque",
  adjust_stock: "Gerar Modificação no Estoque (Balanço)",
  manage_partners: "Cadastrar Parceiros (Cli/Forn)",
  view_reports: "Relatórios Básicos",
  view_financial_reports: "Relatório Financeiro Completo",
  manage_users: "Visualizar Usuários",
  edit_user: "Editar Outros Usuários",
  delete_user: "Excluir Usuários",
  edit_order: "Editar Pedidos / Transações", 
  delete_order: "Excluir / Cancelar Pedidos", 
  manage_settings: "Configurações do Sistema",
  view_audit: "Auditoria (Logs de Ações)",
  manage_subscription: "Gerenciar Assinatura (SaaS)",
};

const UsersPage = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, checkPermission } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<{open: boolean, userId: string | null}>({ open: false, userId: null });
  const [historyModal, setHistoryModal] = useState<{open: boolean, user: User | null}>({ open: false, user: null });
  
  // Master Password State
  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer' as UserRole
  });
  
  // Feedback States
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Permissions State for the form
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(ROLE_PERMISSIONS['buyer']);

  useEffect(() => {
    if (editingUser && editingUser.role === formData.role) {
      // Já está setado via handleOpenModal
    } else {
      setFormPermissions(ROLE_PERMISSIONS[formData.role]);
    }
  }, [formData.role]);

  if (!checkPermission('manage_users')) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Acesso restrito. Você não tem permissão para gerenciar usuários.
      </div>
    );
  }

  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  const handleOpenModal = (user?: User) => {
    const open = () => {
      setFormError('');
      setFormSuccess('');
      if (user) {
        setEditingUser(user);
        setFormData({
          name: user.name,
          email: user.email,
          password: user.password || '',
          role: user.role
        });
        const defaultPerms = ROLE_PERMISSIONS[user.role];
        const currentPerms = user.permissions || {};
        setFormPermissions({ ...defaultPerms, ...currentPerms });
      } else {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'buyer' });
        setFormPermissions(ROLE_PERMISSIONS['buyer']);
      }
      setIsModalOpen(true);
    };

    if (user) {
       requestAuth(open, 'Editar Usuário', `Edição de dados do usuário: ${user.name} (${user.email})`, 'edit_user');
    } else {
      open();
    }
  };

  const confirmDelete = () => {
    if (deleteModal.userId) {
      const userToDelete = users.find(u => u.id === deleteModal.userId);
      const doDelete = () => {
         deleteUser(deleteModal.userId!);
         setDeleteModal({ open: false, userId: null });
      };

      requestAuth(doDelete, 'Excluir Usuário', `Remoção permanente de usuário: ${userToDelete?.name} | Email: ${userToDelete?.email} | Cargo: ${userToDelete?.role}`, 'delete_user');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (editingUser) {
      const result = updateUser({ 
        ...editingUser, 
        ...formData,
        permissions: formPermissions 
      });
      
      if (result.success) {
        setFormSuccess('Usuário atualizado com sucesso!');
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setFormError(result.message || 'Erro ao atualizar usuário.');
      }
    } else {
      if (!formData.password) {
        setFormError('Senha é obrigatória para novos usuários.');
        return;
      }
      // Capturar resultado da tentativa de adicionar
      const result = addUser({ 
        id: '', 
        ...formData,
        permissions: formPermissions
      }); 
      
      if (result.success) {
        setFormSuccess('Usuário cadastrado com sucesso!');
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setFormError(result.message || 'Erro ao cadastrar usuário.');
      }
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setFormPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const roleLabels: Record<UserRole, string> = {
    master: 'Administrador Master',
    manager: 'Gerente',
    buyer: 'Comprador',
    seller: 'Vendedor',
    cashier: 'Operador de Caixa',
    financial: 'Financeiro',
    super_admin: 'Super Admin',
  };

  const canDeleteUser = checkPermission('delete_user');
  const canEditUser = checkPermission('edit_user');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h2>
           <p className="text-gray-500">Cadastre e gerencie acessos e permissões do sistema</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600 text-sm">Usuário</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Email</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Função</th>
                <th className="p-4 font-semibold text-gray-600 text-sm text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{user.email}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${user.role === 'master' ? 'bg-purple-100 text-purple-800' : 
                        user.role === 'manager' ? 'bg-indigo-100 text-indigo-800' :
                        user.role === 'cashier' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      <Shield size={10} />
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setHistoryModal({ open: true, user })}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Histórico de Atividades"
                      >
                        <History size={16} />
                      </button>
                      
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className={`p-2 rounded-lg transition-colors ${canEditUser ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-300'}`}
                        title={canEditUser ? "Editar Permissões" : "Sem permissão para editar"}
                      >
                        {canEditUser ? <Edit2 size={16} /> : <Lock size={16} />}
                      </button>

                      {user.id !== currentUser?.id && (
                        <button 
                          onClick={() => canDeleteUser ? setDeleteModal({ open: true, userId: user.id }) : alert('Você não tem permissão para excluir usuários.')}
                          className={`p-2 rounded-lg transition-colors ${canDeleteUser ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title={canDeleteUser ? "Excluir Usuário" : "Sem permissão para excluir"}
                          disabled={!canDeleteUser}
                        >
                          {canDeleteUser ? <Trash2 size={16} /> : <Lock size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, userId: null })}
        onConfirm={confirmDelete}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir este usuário permanentemente? Ele perderá o acesso ao sistema imediatamente."
        confirmText="Excluir Usuário"
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

      {/* User Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh] my-4">
            
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-t-xl">
               <h3 className="text-xl font-bold text-gray-800">
                 {editingUser ? 'Editar Usuário e Permissões' : 'Novo Usuário'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                 <X size={24} />
               </button>
            </div>

            {/* FIXED MESSAGES AREA - VISIBLE ALWAYS */}
            {(formError || formSuccess) && (
              <div className="px-6 pt-6">
                {formError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-lg flex items-center gap-2">
                    <CheckCircle size={20} />
                    <span className="font-medium">{formSuccess}</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-2 mb-4">Dados de Acesso</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />
                        <input 
                          required
                          className="w-full pl-9 pr-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />
                        <input 
                          type="email"
                          required
                          className="w-full pl-9 pr-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {editingUser ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                      </label>
                      <input 
                        type="password"
                        className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                        placeholder={editingUser ? "Deixe em branco para manter" : "******"}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-2 mb-4">Perfil de Acesso</h4>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Função</label>
                        <select 
                          className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                        >
                          <option value="master">Administrador (Acesso Total)</option>
                          <option value="manager">Gerente</option>
                          <option value="cashier">Operador de Caixa</option>
                          <option value="buyer">Comprador</option>
                          <option value="seller">Vendedor</option>
                          <option value="financial">Financeiro</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                           Ao alterar o cargo, as permissões abaixo serão redefinidas para o padrão da função selecionada. Você pode customizar manualmente depois.
                        </p>
                     </div>
                  </div>
                </div>

                <div>
                   <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-2 mb-4 flex items-center justify-between">
                     <span>Tabela de Permissões (Marque Sim para liberar)</span>
                     <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Personalizável</span>
                   </h4>
                   
                   <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-gray-100 text-gray-600 font-bold">
                            <tr>
                               <th className="p-3 border-r border-gray-200">Função / Recurso do Sistema</th>
                               <th className="p-3 text-center w-32">Permitir?</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {(Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>).map((key) => (
                               <tr key={key} className={formPermissions[key] ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="p-3 border-r border-gray-200 text-gray-700">
                                     {PERMISSION_LABELS[key]}
                                  </td>
                                  <td className="p-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => togglePermission(key)}>
                                     <div className={`flex items-center justify-center gap-2 font-bold ${formPermissions[key] ? 'text-emerald-600' : 'text-gray-400'}`}>
                                        {formPermissions[key] ? (
                                           <><CheckSquare size={20} /> Sim</>
                                        ) : (
                                           <><Square size={20} /> Não</>
                                        )}
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              </div>
              
              <div className="px-6 pb-4">
                  <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg flex items-start gap-2 border border-blue-100">
                      <Info size={16} className="mt-0.5 shrink-0" />
                      <p>O usuário poderá acessar o sistema imediatamente com o e-mail e senha definidos acima. Certifique-se de compartilhar as credenciais de forma segura.</p>
                  </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-md transition-colors"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal (General User Activity) */}
      {historyModal.open && historyModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                 <h3 className="text-xl font-bold text-gray-800">Histórico de Atividades</h3>
                 <p className="text-sm text-gray-500">Usuário: {historyModal.user.name}</p>
              </div>
              <button 
                onClick={() => setHistoryModal({ open: false, user: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
               {!historyModal.user.logs || historyModal.user.logs.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                   <History size={48} className="mb-3 opacity-20" />
                   <p>Nenhuma atividade registrada.</p>
                 </div>
               ) : (
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 sticky top-0 z-10">
                     <tr>
                       <th className="p-4 w-48">Data / Hora</th>
                       <th className="p-4 w-48">Ação</th>
                       <th className="p-4">Detalhes da Operação</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {historyModal.user.logs.map(log => (
                       <tr key={log.id} className="hover:bg-gray-50">
                         <td className="p-4 align-top">
                           <div className="flex items-center gap-2 text-gray-700">
                             <Clock size={14} className="text-emerald-500 flex-shrink-0" />
                             <div className="flex flex-col">
                               <span className="font-medium">{new Date(log.timestamp).toLocaleDateString()}</span>
                               <span className="text-gray-400 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                             </div>
                           </div>
                         </td>
                         <td className="p-4 align-top">
                           <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block">
                             {log.action}
                           </span>
                         </td>
                         <td className="p-4 text-gray-600 align-top">
                           {log.details ? (
                             <div className="flex items-start gap-2">
                               <FileText size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                               <span className="text-sm leading-relaxed font-mono bg-gray-50 p-1.5 rounded w-full border border-gray-100">
                                 {log.details}
                               </span>
                             </div>
                           ) : (
                             <span className="text-gray-400 italic">Sem detalhes adicionais</span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setHistoryModal({ open: false, user: null })}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
