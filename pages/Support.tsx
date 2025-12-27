
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../services/store';
import { Download, Mail, MessageCircle, Database, Save, Search, CheckCircle, RotateCcw, ShieldCheck, AlertTriangle, Server, Upload, ClipboardList, ArrowRight, HardDrive, Clock, Bot, User, CloudDownload, Lock, Printer, X } from 'lucide-react';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';
import PrintTemplate, { printElement } from '../components/PrintTemplate';
import ConfirmModal from '../components/ui/ConfirmModal';
import { UserPermissions } from '../types';

const Support = () => {
  // Adicionado acesso a todos os dados para o backup manual
  const { products, partners, orders, transactions, users, cashSessions, batchAdjustStock, importBackup, triggerManualBackup, backupHistory, currentUser, downloadBackup, checkPermission, currentCompany } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para o Balanço (Rascunho)
  const [balances, setBalances] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('inventory_balance_draft');
    return saved ? (JSON.parse(saved) as Record<string, string>) : {};
  });
  
  // Estado para controle de arquivo de upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackupFile, setPendingBackupFile] = useState<string | null>(null);
  
  // Estado para Modal de Impressão de Balanço
  const [showBalancePrintModal, setShowBalancePrintModal] = useState(false);
  
  // Estado para Modal de Confirmação de Limpeza
  const [confirmClearModal, setConfirmClearModal] = useState(false);

  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });

  // Persistir o rascunho sempre que mudar
  useEffect(() => {
    localStorage.setItem('inventory_balance_draft', JSON.stringify(balances));
  }, [balances]);

  // Scroll top on modal open
  useEffect(() => {
    if (showBalancePrintModal) {
        window.scrollTo(0, 0);
    }
  }, [showBalancePrintModal]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Calcula as alterações pendentes
  const pendingChanges = useMemo(() => {
    const changes: {id: string, name: string, oldStock: number, newStock: number, unit: string}[] = [];
    
    Object.entries(balances).forEach(([id, value]) => {
      const valStr = value as string;
      const product = products.find(p => p.id === id);
      if (product && valStr !== '' && parseFloat(valStr) !== product.stock) {
        changes.push({
          id,
          name: product.name,
          oldStock: product.stock,
          newStock: parseFloat(valStr),
          unit: product.unit
        });
      }
    });
    return changes;
  }, [balances, products]);

  const handleBalanceChange = (id: string, value: string) => {
    setBalances(prev => ({ ...prev, [id]: value }));
  };

  // Abre o modal de confirmação
  const handleClearDraftRequest = () => {
    setConfirmClearModal(true);
  };

  // Executa a limpeza após confirmação
  const executeClearDraft = () => {
    setBalances({});
    localStorage.removeItem('inventory_balance_draft');
    setConfirmClearModal(false);
  };

  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  const processBatchAdjustment = () => {
    // Feedback se não houver alterações para salvar
    if (pendingChanges.length === 0) {
      alert("Não há alterações de estoque pendentes para processar. Digite o novo valor na coluna 'Contagem Física'.");
      return;
    }

    // Função que executa a alteração real
    const executeBatch = () => {
      const adjustments = pendingChanges.map(c => ({
        id: c.id,
        newQuantity: c.newStock,
        reason: 'Balanço Geral / Inventário'
      }));
      
      batchAdjustStock(adjustments);
      setBalances({}); // Limpa o rascunho após sucesso
      localStorage.removeItem('inventory_balance_draft');
      
      // Pequeno timeout para garantir que a UI atualize antes do alert
      setTimeout(() => {
        alert('Estoque atualizado com sucesso!');
      }, 100);
    };

    // SEMPRE pedir senha para confirmar (mesmo se tiver permissão)
    const details = `Balanço de Estoque em Lote: ${pendingChanges.length} itens alterados. ` + 
                    pendingChanges.map(c => `${c.name}: ${c.oldStock}->${c.newStock}`).join(', ');
    
    requestAuth(executeBatch, 'Confirmar Balanço', details, 'adjust_stock');
  };

  // Nova Função: Criar Backup Manual (Snapshot Local) e Atualizar Lista
  const handleManualBackup = () => {
    const success = triggerManualBackup();
    if (success) {
      // Feedback visual sutil (opcional, já atualiza a lista)
    } else {
      alert('Não foi possível criar o backup.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setPendingBackupFile(content);
      
      // Solicitar Auth Master imediatamente após carregar o arquivo
      requestAuth(() => {
        const success = importBackup(content);
        if (success) {
          alert('Backup restaurado com sucesso! O sistema será reiniciado.');
          setPendingBackupFile(null);
          // Recarregar a página para limpar estados e forçar login com novos usuários
          window.location.reload();
        } else {
          alert('Falha ao restaurar: Arquivo inválido, corrompido ou bloqueado durante período de teste.');
          setPendingBackupFile(null);
        }
        // Limpar o input para permitir selecionar o mesmo arquivo se necessário
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 'Restaurar Backup', `Restauração de sistema via arquivo: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    if (!isRestoreAllowed) {
        alert("A restauração de backup está bloqueada durante o período de teste.");
        return;
    }
    fileInputRef.current?.click();
  };

  // Verifica se o usuário tem a permissão para exibir o ícone correto
  const canEditStock = checkPermission('adjust_stock');

  // Determine if Auto Backup is active based on Plan and Trial Status
  const plan = currentCompany?.plan || 'essential';
  const isTrial = currentCompany?.trialEndsAt && new Date() < new Date(currentCompany.trialEndsAt);
  
  // CHECK FOR SPECIFIC USER OVERRIDE
  const isMasterOverride = currentUser?.email === 'rander06@hotmail.com';
  
  // ATUALIZAÇÃO: Auto Backup liberado no trial (pois trial simula plano pro/premium)
  const isAutoBackupActive = ['professional', 'premium'].includes(plan) || isTrial || isMasterOverride;
  // ATUALIZAÇÃO: Manual Backup liberado no trial
  const isManualBackupAllowed = true;
  // ATUALIZAÇÃO: Restauração Bloqueada no Trial (Exceto Master)
  const isRestoreAllowed = !isTrial || isMasterOverride;
  
  // Lógica para acesso ao WhatsApp: Bloqueado se for 'essential' (pagante), mas liberado em 'trial', 'pro', 'premium'
  const canAccessWhatsapp = plan !== 'essential';

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* ... (Conteúdo da página de suporte mantido igual até o Modal) ... */}
      <div>
         <h2 className="text-2xl font-bold text-gray-800">Suporte e Configurações</h2>
         <p className="text-gray-500">Canais de atendimento e ferramentas de sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD DE CONTATO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <MessageCircle size={80} className="text-emerald-900" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MessageCircle size={20} className="text-emerald-600" /> Central de Ajuda
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Precisa de ajuda? Nossa equipe de suporte está disponível para auxiliar em dúvidas ou problemas técnicos.
          </p>
          
          <div className="space-y-4">
             <a 
               href="mailto:suporte@sucatafacil.com"
               className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
             >
               <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                 <Mail size={20} className="text-gray-600 group-hover:text-emerald-600" />
               </div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase">E-mail</p>
                 <p className="font-medium">suporte@sucatafacil.com</p>
               </div>
             </a>

             {canAccessWhatsapp ? (
                <a 
                  href="https://w.app/sucatafacilacessoaosuporte" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors group"
                >
                  <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <MessageCircle size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">WhatsApp</p>
                    <p className="font-medium">(34) 99947-6879</p>
                  </div>
                </a>
             ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border border-gray-200 opacity-75 cursor-not-allowed relative overflow-hidden">
                  <div className="absolute right-2 top-2 text-gray-300">
                     <Lock size={16} />
                  </div>
                  <div className="bg-white p-2 rounded-full shadow-sm text-gray-400">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">WhatsApp (Bloqueado)</p>
                    <p className="font-medium text-gray-500 text-sm">Exclusivo PRO/Premium</p>
                  </div>
                </div>
             )}
          </div>
        </div>

        {/* CARD DE BACKUP E HISTÓRICO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden lg:col-span-2 flex flex-col">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <Database size={80} className="text-blue-900" />
           </div>
           <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Server size={20} className="text-blue-600" /> Segurança de Dados
              </h3>
              
              {isAutoBackupActive ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-xs font-bold text-emerald-700">
                     Backup Automático: ATIVO
                   </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
                   <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                   <span className="text-xs font-bold text-gray-500">
                     Backup Automático: INATIVO
                   </span>
                </div>
              )}
           </div>
           
           <p className="text-sm text-gray-500 mb-6 max-w-xl">
             {isAutoBackupActive 
                ? 'O sistema realiza backups automáticos diariamente ao abrir o sistema. Você também pode criar cópias manuais para sua segurança.'
                : 'Seu plano atual permite apenas backups manuais. Faça upgrade para ativar o backup automático e ter mais tranquilidade.'
             }
           </p>

           {/* Botões de Ação */}
           <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button 
                onClick={handleManualBackup}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all flex-1 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
              >
                <HardDrive size={18} />
                Criar Backup Manualmente
              </button>
              
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
              />
              
              <button 
                onClick={triggerFileInput}
                className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg font-bold transition-all flex-1 ${
                    !isRestoreAllowed 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title={!isRestoreAllowed ? "Restauração bloqueada durante o período de teste" : "Importar backup"}
              >
                {!isRestoreAllowed ? <Lock size={18} /> : <Upload size={18} />}
                Restaurar Backup
              </button>
           </div>

           {/* Tabela de Histórico de Backups */}
           <div className="flex-1 border border-gray-100 rounded-lg overflow-hidden bg-gray-50/50">
             <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 font-bold text-xs uppercase text-gray-500 flex items-center justify-between gap-2">
               <span className="flex items-center gap-2"><Clock size={12} /> Histórico Recente (Clique na nuvem para baixar)</span>
               <span className="text-[9px] text-red-500 font-bold flex items-center gap-1">
                 <AlertTriangle size={10} /> Armazena apenas os 5 últimos backups de cada tipo
               </span>
             </div>
             <div className="overflow-y-auto max-h-48">
               {backupHistory.length === 0 ? (
                 <div className="text-center py-8 text-gray-400 text-sm">
                   Nenhum backup registrado ainda.
                 </div>
               ) : (
                 <table className="w-full text-left text-sm">
                   <thead className="bg-white text-gray-500 border-b border-gray-100 text-xs hidden">
                     <tr>
                       <th className="p-2">Data</th>
                       <th className="p-2">Tipo</th>
                       <th className="p-2 text-right">Tamanho</th>
                       <th className="p-2 text-center">Ação</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 bg-white">
                     {backupHistory.map(log => (
                       <tr key={log.id} className="hover:bg-gray-50">
                         <td className="p-3 text-gray-700">
                           <div className="flex items-center gap-2">
                              {log.type === 'auto' 
                                ? <Bot size={16} className="text-blue-500" />
                                : <User size={16} className="text-indigo-500" />
                              }
                              <div className="flex flex-col">
                                <span className="font-bold text-xs">{new Date(log.timestamp).toLocaleDateString()}</span>
                                <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                           </div>
                         </td>
                         <td className="p-3">
                           <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${log.type === 'auto' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                             {log.type === 'auto' ? 'Automático' : 'Manual'}
                           </span>
                         </td>
                         <td className="p-3 text-right font-mono text-xs text-gray-500">
                           {log.size}
                         </td>
                         <td className="p-3 text-right">
                           <button 
                             onClick={() => downloadBackup(log.id)}
                             className="text-gray-400 hover:text-emerald-600 p-1 rounded transition-colors"
                             title="Baixar este backup"
                           >
                             <CloudDownload size={18} />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* BALANÇO DE ESTOQUE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList size={20} className="text-emerald-600" /> Balanço de Estoque
            </h3>
            <p className="text-sm text-gray-500">Digite a quantidade física. As alterações são salvas no rascunho e aplicadas somente ao finalizar.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
             <button 
               onClick={handleClearDraftRequest}
               className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
               title="Limpar tudo"
             >
               Limpar Rascunho
             </button>
             <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm text-gray-800"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-600 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4 text-right">Estoque Sistema</th>
                <th className="p-4 min-w-[220px]">Contagem Física</th> {/* Largura mínima aumentada */}
                <th className="p-4 text-right w-40">Diferença</th>
                <th className="p-4 text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => {
                const inputValue = balances[product.id] ?? '';
                const hasInput = inputValue !== '';
                const numericInput = parseFloat(inputValue);
                const diff = hasInput ? numericInput - product.stock : 0;
                const hasDifference = hasInput && diff !== 0;
                
                return (
                  <tr key={product.id} className={`transition-colors ${hasDifference ? 'bg-amber-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="p-4 font-medium text-gray-800">{product.name}</td>
                    <td className="p-4 text-right font-mono text-gray-600">
                      {product.stock} <span className="text-xs text-gray-400">{product.unit}</span>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                         <input 
                           type="number" 
                           step="0.01"
                           placeholder={product.stock.toString()}
                           value={inputValue}
                           onChange={(e) => handleBalanceChange(product.id, e.target.value)}
                           className={`w-full h-12 pl-4 pr-16 border rounded-lg text-right font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors shadow-sm [&::-webkit-inner-spin-button]:appearance-none ${
                             hasDifference 
                               ? 'border-amber-400 text-amber-900 bg-amber-50' 
                               : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                           }`}
                         />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none font-bold">
                           {product.unit}
                         </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {hasInput && diff !== 0 && (
                        <span className={`font-bold ${diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)} {product.unit}
                        </span>
                      )}
                      {hasInput && diff === 0 && (
                         <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                       {hasDifference && (
                         <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                           Pendente
                         </span>
                       )}
                       {hasInput && !hasDifference && (
                         <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">
                           Ok
                         </span>
                       )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Painel de Resumo do Balanço */}
        {pendingChanges.length > 0 && (
           <div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-emerald-500 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-slide-up z-20">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                       <p className="font-bold text-gray-800 text-lg">{pendingChanges.length} produtos com divergência</p>
                       <p className="text-sm text-gray-500">As alterações estão salvas apenas no rascunho.</p>
                    </div>
                 </div>
                 <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setShowBalancePrintModal(true)} 
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors flex-1 md:flex-none"
                    >
                      Imprimir Rascunho
                    </button>
                    <button 
                      onClick={processBatchAdjustment}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 flex-1 md:flex-none justify-center"
                    >
                      {canEditStock ? <ShieldCheck size={20} /> : <Lock size={20} />}
                      {canEditStock ? 'Confirmar Modificação' : 'Confirmar (Senha)'}
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* BALANCE DRAFT PRINT MODAL */}
      {showBalancePrintModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto receipt-modal-overlay backdrop-blur-sm"
          onClick={() => setShowBalancePrintModal(false)}
        >
          <div 
            className="bg-white w-full max-w-4xl mx-auto rounded-xl p-0 relative receipt-content my-auto mt-10 print:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Close Button X (Sticky) */}
             <button 
               onClick={() => setShowBalancePrintModal(false)}
               className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
               title="Fechar"
             >
               <X size={20} />
             </button>

             <div className="p-4 md:p-8">
               <PrintTemplate
                 id="balance-draft" // ID for print function
                 title="Conferência de Balanço (Rascunho)"
                 subtitle="Relatório de Divergências Pendentes"
                 type="balance"
                 summaryCards={[
                    { label: 'Total de Itens', value: filteredProducts.length.toString() },
                    { label: 'Itens com Divergência', value: pendingChanges.length.toString(), color: 'text-amber-700' }
                 ]}
               >
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm mb-4 border-collapse border border-gray-200 text-left">
                        <thead className="bg-gray-100 text-gray-700 font-bold">
                            <tr>
                                <th className="p-2 border border-gray-200">Produto</th>
                                <th className="p-2 border border-gray-200 text-right">Estoque Sistema</th>
                                <th className="p-2 border border-gray-200 text-right">Contagem Física</th>
                                <th className="p-2 border border-gray-200 text-right">Diferença</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Mostra todos os produtos, destacando os com divergência */}
                            {filteredProducts.map(product => {
                                const inputValue = balances[product.id] ?? '';
                                const hasInput = inputValue !== '';
                                const numericInput = parseFloat(inputValue);
                                const diff = hasInput ? numericInput - product.stock : 0;
                                const hasDifference = hasInput && diff !== 0;

                                return (
                                    <tr key={product.id} className={hasDifference ? 'bg-gray-100 font-bold' : ''}>
                                        <td className="p-2 border border-gray-200">{product.name}</td>
                                        <td className="p-2 border border-gray-200 text-right">{product.stock} {product.unit}</td>
                                        <td className="p-2 border border-gray-200 text-right">{hasInput ? numericInput : '-'}</td>
                                        <td className="p-2 border border-gray-200 text-right">
                                            {hasDifference ? (
                                                <span className={diff > 0 ? 'text-blue-700' : 'text-red-700'}>
                                                    {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                                </span>
                                            ) : '-'}
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
               <button onClick={() => printElement('balance-draft')} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg">
                  <Printer size={20} /> Imprimir Agora
               </button>
               <button onClick={() => setShowBalancePrintModal(false)} className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 rounded-lg font-bold hover:bg-gray-50">
                  Fechar
               </button>
             </div>
          </div>
        </div>
      )}

      <MasterPasswordModal 
        isOpen={masterAuth.isOpen}
        onClose={() => setMasterAuth({ ...masterAuth, isOpen: false })}
        onAuthenticated={() => masterAuth.pendingAction && masterAuth.pendingAction()}
        title={masterAuth.title}
        logDetails={masterAuth.logDetails}
        requiredPermission={masterAuth.requiredPermission}
      />

      {/* Modal de Confirmação de Limpeza de Rascunho */}
      <ConfirmModal
        isOpen={confirmClearModal}
        onClose={() => setConfirmClearModal(false)}
        onConfirm={executeClearDraft}
        title="Limpar Rascunho de Balanço"
        message="Tem certeza que deseja limpar todo o rascunho do balanço? Todas as contagens físicas inseridas (que não foram salvas ainda) serão perdidas."
        confirmText="Sim, Limpar Tudo"
        variant="warning"
      />
    </div>
  );
};

export default Support;
