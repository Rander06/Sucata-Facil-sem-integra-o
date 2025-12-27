import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Lock, X, ShieldCheck, User as UserIcon, ChevronDown } from 'lucide-react';
import { useStore, ROLE_PERMISSIONS } from '../../services/store';
import { UserPermissions, User } from '../../types';

interface MasterPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  title?: string;
  description?: string;
  logDetails?: string; // Informações detalhadas para o histórico
  requiredPermission?: keyof UserPermissions; // Permissão específica exigida para esta ação
}

const MasterPasswordModal: React.FC<MasterPasswordModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  title = "Acesso Restrito",
  description = "Esta ação requer autorização de um superior.",
  logDetails = "",
  requiredPermission
}) => {
  const { verifyAuthorization, logMasterAction, users, currentUser } = useStore();
  const [password, setPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Filtra usuários elegíveis para autorização
  // Deve ter a permissão necessária OU ser Master/SuperAdmin
  // USO DO USEMEMO: Essencial para evitar que a lista seja recriada a cada renderização,
  // o que causava o reset do campo "selectedUserId"
  const eligibleUsers = useMemo(() => users.filter(u => {
    if (u.role === 'master' || u.role === 'super_admin') return true;
    if (requiredPermission) {
        // Verifica permissão explícita ou fallback para padrão do cargo
        const hasExplicitPerm = u.permissions && typeof u.permissions[requiredPermission] !== 'undefined';
        if (hasExplicitPerm) {
            return u.permissions[requiredPermission];
        }
        // Fallback
        return ROLE_PERMISSIONS[u.role]?.[requiredPermission] || false;
    }
    // Se não exigir permissão específica, gerentes e financeiros aparecem por padrão
    if (u.role === 'manager' || u.role === 'financial') return true;
    return false;
  }), [users, requiredPermission]);

  // Inicialização apenas quando o modal ABRE (isOpen muda para true)
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      
      // Lógica de pré-seleção:
      // Se o usuário atual pode autorizar, já seleciona ele.
      // Caso contrário, deixa em branco para forçar a escolha.
      const defaultUser = currentUser && eligibleUsers.find(u => u.id === currentUser.id)
        ? currentUser.id
        : '';
        
      setSelectedUserId(defaultUser);
      
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    }
  }, [isOpen]); // Dependência estrita em isOpen para não resetar se "users" atualizar ao fundo

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
        setError('Selecione quem está autorizando.');
        return;
    }

    // Agora verifica a senha E o ID do usuário selecionado
    const authUser = verifyAuthorization(selectedUserId, password, requiredPermission);
    
    if (authUser) {
      // Registra a ação no histórico do usuário que AUTORIZOU
      logMasterAction(title, logDetails || description, authUser.id);
      
      onAuthenticated();
      onClose();
    } else {
      setError('Senha incorreta para o usuário selecionado.');
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="bg-emerald-900 p-6 text-white text-center relative">
          <div className="inline-flex p-3 bg-emerald-800 rounded-full mb-3 shadow-inner">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-emerald-200 text-sm mt-1">{description}</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Seletor de Usuário (Quem autoriza) */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Quem autoriza?</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full pl-9 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 appearance-none bg-white text-sm font-medium"
                        required
                    >
                        <option value="" disabled>Selecione um responsável...</option>
                        {eligibleUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name} ({user.role === 'master' ? 'Admin' : user.role})
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
            </div>

            {/* Senha */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Senha do Responsável</label>
                <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    ref={passwordInputRef}
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800 tracking-widest"
                    placeholder="••••••••"
                    autoComplete="off"
                />
                </div>
            </div>
            
            {error && (
              <div className="mt-2 text-center text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} /> Confirmar Liberação
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MasterPasswordModal;