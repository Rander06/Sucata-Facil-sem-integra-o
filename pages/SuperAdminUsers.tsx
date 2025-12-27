import React, { useState, useEffect } from 'react';
import { useStore, ROLE_PERMISSIONS } from '../services/store';
import { User, UserPermissions, UserRole } from '../types';
import { Plus, Trash2, Mail, ShieldCheck, User as UserIcon, Edit2, History, X, Clock, FileText, Lock } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';

const SuperAdminUsers = () => {
  const { allUsers, addUser, updateUser, deleteUser, currentUser } = useStore();
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');

  // Filter only super admins (or orphan users which we treat as system admins)
  const adminUsers = allUsers.filter(u => u.role === 'super_admin' || !u.companyId);

  // Helpers
  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  // Handlers
  const handleOpenModal = (user?: User) => {
    const open = () => {
        setError('');
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '' // Don't fill password
            });
        } else {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '' });
        }
        setIsModalOpen(true);
    };

    if (user) {
        requestAuth(open, 'Editar Admin', `Edição de Super Admin: ${user.name}`, 'manage_users');
    } else {
        open();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (editingUser) {
        const updates: Partial<User> = {
            name: formData.name,
            email: formData.email,
        };
        if (formData.password) {
            updates.password = formData.password;
        }
        const result = updateUser({ ...editingUser, ...updates });
        if (result.success) {
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: '' });
        } else {
            setError(result.message || 'Erro ao atualizar administrador.');
        }
    } else {
        // Add user as super_admin
        const result = addUser({
            id: '', // Added to satisfy type requirement (store generates actual ID)
            ...formData,
            role: 'super_admin',
            permissions: ROLE_PERMISSIONS['super_admin'],
        });
        if (result.success) {
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: '' });
        } else {
            setError(result.message || 'Erro ao criar administrador.');
        }
    }
  };

  const confirmDelete = () => {
    if (deleteModal.userId) {
       const user = allUsers.find(u => u.id === deleteModal.userId);
       
       const doDelete = () => {
           deleteUser(deleteModal.userId!);
           setDeleteModal({ open: false, userId: null });
       };

       // Close confirm modal first
       setDeleteModal({ open: false, userId: null });

       requestAuth(doDelete, 'Excluir Admin', `Exclusão de Super Admin: ${user?.name}`, 'delete_user');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-2xl font-bold text-gray-800">Administradores do Painel</h2>
           <p className="text-gray-500">Gerencie quem tem acesso total ao sistema SaaS</p>
         </div>
         <button 
           onClick={() => handleOpenModal()}
           className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm font-bold"
         >
           <Plus size={18} /> Novo Admin
         </button>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-xs">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Nível</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adminUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                     <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-gray-800 block">{user.name}</span>
                          {user.id === currentUser?.id && <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500 font-bold">(Você)</span>}
                        </div>
                     </td>
                     <td className="p-4 text-gray-600">{user.email}</td>
                     <td className="p-4">
                        <span className="flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded w-fit uppercase border border-purple-200">
                          <ShieldCheck size={12} /> Super Admin
                        </span>
                     </td>
                     <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                              onClick={() => setHistoryModal({ open: true, user })}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                              title="Histórico de Atividades"
                          >
                              <History size={16} />
                          </button>
                          
                          <button 
                              onClick={() => handleOpenModal(user)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                              title="Editar"
                          >
                              <Edit2 size={16} />
                          </button>

                          {user.id !== currentUser?.id && (
                              <button 
                              onClick={() => setDeleteModal({ open: true, userId: user.id })}
                              className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                              title="Remover Acesso"
                              >
                                  <Trash2 size={16} />
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

       {/* ADD/EDIT MODAL */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-bold text-gray-800">{editingUser ? 'Editar Administrador' : 'Novo Administrador'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                 {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">{error}</div>}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <div className="relative">
                       <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input 
                         required
                         className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                         value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Acesso</label>
                    <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input 
                         type="email" required
                         className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                         value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'Nova Senha (Opcional)' : 'Senha'}</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                        type="password" 
                        required={!editingUser}
                        className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder={editingUser ? "Manter atual" : "******"}
                        />
                    </div>
                 </div>
                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
                    <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md">
                        {editingUser ? 'Salvar' : 'Criar Admin'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
       )}

       {/* History Modal */}
       {historyModal.open && historyModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                 <h3 className="text-xl font-bold text-gray-800">Auditoria de Ações</h3>
                 <p className="text-sm text-gray-500">Admin: {historyModal.user.name}</p>
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

       <ConfirmModal 
         isOpen={deleteModal.open}
         onClose={() => setDeleteModal({ open: false, userId: null })}
         onConfirm={confirmDelete}
         title="Remover Administrador"
         message="Tem certeza? Este usuário perderá acesso total ao painel SaaS imediatamente."
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

export default SuperAdminUsers;