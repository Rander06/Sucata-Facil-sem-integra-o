
import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { CheckCircle, XCircle, Clock, DollarSign, Printer, Lock, LogOut, Plus, MinusCircle, User, ArrowDownLeft, ArrowUpRight, FileText, Wallet, Smartphone, CreditCard, FileCheck, Landmark, X, AlertTriangle, TrendingDown, Banknote } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';
import PrintTemplate, { printElement } from '../components/PrintTemplate';
import { OrderItem, PaymentMethod, CashSession, Transaction, UserPermissions } from '../types';

const Cashier = () => {
  const { orders, partners, products, processOrderPayment, cancelOrder, cashBalance, currentSession, openRegister, closeRegister, addManualTransaction, transactions, checkPermission } = useStore();
  
  // Lista de métodos de pagamento
  const paymentMethodsList: {id: PaymentMethod, label: string, icon: React.ElementType}[] = useMemo(() => [
    { id: 'money', label: 'Dinheiro', icon: Wallet },
    { id: 'pix', label: 'PIX', icon: Smartphone },
    { id: 'debit', label: 'Débito', icon: CreditCard },
    { id: 'credit', label: 'Crédito', icon: CreditCard },
    { id: 'ticket', label: 'Boleto', icon: FileCheck },
    { id: 'transfer', label: 'Transf. Bancária', icon: Landmark },
  ], []);

  // State for View Mode
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  
  // States for Modals
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [initialCash, setInitialCash] = useState('');
  
  // Close Register States
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [closingStep, setClosingStep] = useState<'input' | 'review' | 'receipt'>('input');
  
  // Dynamic initialization for counts
  const [closingCounts, setClosingCounts] = useState<Record<PaymentMethod, string>>(() => {
      const initial: any = {};
      // Ensure all keys from list are initialized
      paymentMethodsList.forEach(pm => {
          initial[pm.id] = '';
      });
      return initial;
  });
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseData, setExpenseData] = useState({ description: '', amount: '' });
  const [expenseType, setExpenseType] = useState<'expense' | 'bleed' | 'payment_out'>('expense');

  // State for Manual Transaction Receipt (Despesa/Sangria)
  const [manualReceipt, setManualReceipt] = useState<Transaction | null>(null);

  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });

  const [paymentConfirmation, setPaymentConfirmation] = useState<{
    orderId: string;
    type: 'buy' | 'sell';
    partnerName: string;
    amount: number;
  } | null>(null);

  // Estado para forma de pagamento
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('money');

  const [showReceipt, setShowReceipt] = useState<{
    orderId: string;
    items: OrderItem[];
    total: number;
    partnerName: string;
    partnerDoc: string;
    type: 'buy' | 'sell';
    date: string;
    paymentMethod: string; // Adicionado campo para forma de pagamento
  } | null>(null);

  const [cancelModal, setCancelModal] = useState<{open: boolean, orderId: string | null}>({ open: false, orderId: null });

  // --- Logic ---

  // 1. Filter Pending Orders (To Do)
  const pendingOrders = orders.filter(o => o.status === 'pending');

  // 2. Filter Transactions for Current Session (History of THIS register)
  const sessionTransactions = useMemo(() => {
    if (!currentSession) return [];
    return transactions
      .filter(t => t.sessionId === currentSession.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first
  }, [transactions, currentSession]);

  const sessionSummary = useMemo(() => {
    if (!currentSession) return { in: 0, out: 0, manualOut: 0 };
    const ins = sessionTransactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
    const outs = sessionTransactions.filter(t => t.type === 'out' && t.category === 'purchase').reduce((acc, t) => acc + t.amount, 0);
    
    // Somas todas as saídas manuais (Despesa, Sangria, Pagamento)
    const manualOuts = sessionTransactions.filter(t => 
        t.type === 'out' && (t.category === 'expense' || t.category === 'bleed' || t.category === 'payment_out')
    ).reduce((acc, t) => acc + t.amount, 0);
    
    return { in: ins, out: outs, manualOut: manualOuts };
  }, [sessionTransactions, currentSession]);

  const getPartnerName = (id: string) => partners.find(p => p.id === id)?.name || 'Desconhecido';

  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  // --- Handlers ---

  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialCash) return;
    openRegister(parseFloat(initialCash));
    setShowOpenRegister(false);
    setInitialCash('');
  };

  // Step 1: Move from Input to Review
  const handleReviewClosing = (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDAÇÃO: Verificar se todos os campos foram preenchidos
    const emptyFields = paymentMethodsList.filter(pm => closingCounts[pm.id] === '' || closingCounts[pm.id] === undefined);
    
    if (emptyFields.length > 0) {
      alert('Atenção: Todos os campos de valores devem ser preenchidos. Digite "0" nos campos que não tiveram movimentação.');
      return;
    }

    setClosingStep('review');
  };

  // Step 2: Confirm Closing (AGORA COM SENHA)
  const handleConfirmClosing = () => {
    if (!currentSession) return;
    
    const executeClosing = () => {
        const finalCounts: Record<PaymentMethod, number> = {
          money: parseFloat(closingCounts.money) || 0,
          pix: parseFloat(closingCounts.pix) || 0,
          debit: parseFloat(closingCounts.debit) || 0,
          credit: parseFloat(closingCounts.credit) || 0,
          ticket: parseFloat(closingCounts.ticket) || 0,
          transfer: parseFloat(closingCounts.transfer) || 0,
        };

        closeRegister(finalCounts);
        
        setTimeout(() => {
           setClosingStep('receipt');
        }, 100);
    };

    // Solicitar autorização antes de fechar
    requestAuth(
        executeClosing,
        'Confirmar Fechamento',
        `Fechamento de Caixa - Sessão: ${currentSession.id.slice(0,8)}`,
        'manage_cashier'
    );
  };

  // Helper to calculate differences for the Review Screen
  const getClosingReviewData = () => {
    if (!currentSession) return [];
    
    const reviewData = paymentMethodsList.map(pm => {
       const method = pm.id;
       // Calculate System Expected
       let expected = 0;
       if (method === 'money') expected += currentSession.initialAmount;
       
       const methodTrans = transactions.filter(t => t.sessionId === currentSession.id && t.paymentMethod === method);
       const ins = methodTrans.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
       const outs = methodTrans.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
       expected += (ins - outs);

       const counted = parseFloat(closingCounts[method]) || 0;
       
       return {
         method: pm.label,
         id: method,
         expected,
         counted,
         diff: counted - expected
       };
    });

    return reviewData;
  };

  const handleExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseData.amount || !expenseData.description) return;
    
    // Função que executa a transação DEPOIS da senha confirmada
    const executeTransaction = () => {
        // Create transaction and get object back
        const newTransaction = addManualTransaction('out', parseFloat(expenseData.amount), expenseData.description, expenseType);
        
        setShowExpenseModal(false);
        
        // Open receipt modal if transaction was successful
        if (newTransaction) {
           setManualReceipt(newTransaction);
           // Trigger print with delay
           setTimeout(() => printElement('receipt-manual'), 800);
        }

        setExpenseData({ description: '', amount: '' });
        setExpenseType('expense'); // Reset to default
    };

    // Configura os detalhes para o log de auditoria
    const typeLabel = expenseType === 'bleed' ? 'Sangria' : expenseType === 'payment_out' ? 'Pagamento' : 'Despesa';
    const logDetails = `${typeLabel} de R$${expenseData.amount}. Motivo: ${expenseData.description}`;

    // Solicita autorização. Exige a permissão 'approve_manual_transaction'
    requestAuth(executeTransaction, `Autorizar ${typeLabel}`, logDetails, 'approve_manual_transaction');
  };

  const confirmCancel = () => {
    if (cancelModal.orderId) {
      const order = orders.find(o => o.id === cancelModal.orderId);
      const partner = partners.find(p => p.id === order?.partnerId);
      
      const executeCancel = () => {
         cancelOrder(cancelModal.orderId!);
         setCancelModal({ open: false, orderId: null });
      };

      const details = `Cancelamento de Pedido #${order?.id.slice(0,8)} | Valor: R$${order?.totalValue.toFixed(2)} | Parceiro: ${partner?.name} | Tipo: ${order?.type}`;
      
      // Sempre pedir senha (do usuário autorizado ou master)
      requestAuth(executeCancel, 'Cancelar Pedido', details, 'delete_order');
    }
  };

  const initiatePayment = (order: typeof orders[0]) => {
    setSelectedPaymentMethod('money'); // Reset to default
    setPaymentConfirmation({
      orderId: order.id,
      type: order.type,
      partnerName: getPartnerName(order.partnerId),
      amount: order.totalValue
    });
  };

  const confirmPayment = () => {
    if (paymentConfirmation) {
      processOrderPayment(paymentConfirmation.orderId, selectedPaymentMethod);
      const order = orders.find(o => o.id === paymentConfirmation.orderId);
      const partner = partners.find(p => p.id === order?.partnerId);
      const paymentLabel = paymentMethodsList.find(p => p.id === selectedPaymentMethod)?.label || 'Outros';

      if (order) {
        setShowReceipt({
          orderId: order.id,
          items: order.items,
          total: order.totalValue,
          partnerName: partner?.name || 'Desconhecido',
          partnerDoc: partner?.document || '',
          type: order.type,
          date: new Date().toISOString(),
          paymentMethod: paymentLabel
        });
      }
      setPaymentConfirmation(null);
      // Switch to history tab to show the new transaction
      setActiveTab('history');
      setTimeout(() => printElement('receipt-main'), 800);
    }
  };

  const handleReprintTransaction = (t: Transaction) => {
    // If it's an order transaction
    if (t.orderId) {
        const order = orders.find(o => o.id === t.orderId);
        if (!order) return;
        const partner = partners.find(p => p.id === order.partnerId);
        const paymentLabel = paymentMethodsList.find(p => p.id === t.paymentMethod)?.label || 'Outros';

        setShowReceipt({
          orderId: order.id,
          items: order.items,
          total: order.totalValue,
          partnerName: partner?.name || 'Desconhecido',
          partnerDoc: partner?.document || '',
          type: order.type,
          date: t.createdAt,
          paymentMethod: paymentLabel
        });
    } 
    // If it's a manual transaction (expense/bleed)
    else if (t.category === 'expense' || t.category === 'bleed' || t.category === 'payment_out') {
        setManualReceipt(t);
    }
  };

  // --- Views ---

  if (!currentSession && !showCloseRegister) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-full mb-6">
            <Lock size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">O Caixa está Fechado</h2>
          <p className="text-gray-500 mb-8">É necessário abrir uma nova sessão de caixa para realizar operações financeiras.</p>
          
          <button 
            onClick={() => setShowOpenRegister(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={24} /> Abrir Caixa
          </button>
        </div>

        {/* Open Register Modal */}
        {showOpenRegister && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Abertura de Caixa</h3>
              <form onSubmit={handleOpenRegister}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fundo de Troco (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  autoFocus
                  required
                  placeholder="0,00"
                  className="w-full p-3 border border-emerald-100 bg-emerald-50 rounded-lg text-xl font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                  value={initialCash}
                  onChange={e => setInitialCash(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-2 mb-6">Informe o valor físico disponível na gaveta para iniciar o dia.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowOpenRegister(false)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Confirmar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Close Register Wizard & Receipt
  if (showCloseRegister) {
    const sessionForReceipt = closingStep === 'receipt' 
       ? useStore().cashSessions.find(s => s.closedAt && new Date(s.closedAt).getTime() > Date.now() - 60000) 
       : currentSession;

    const reviewData = closingStep === 'review' ? getClosingReviewData() : [];

    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-4 animate-fade-in overflow-y-auto">
        
        {/* STEP 1: INPUT COUNTS (Blind Closing) */}
        {closingStep === 'input' && (
          <div className="bg-white w-full max-w-2xl p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-h-[90vh]">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Fechamento de Caixa</h2>
              <p className="text-gray-500">Informe os valores conferidos para cada forma de pagamento. <br/><span className="text-red-500 text-xs font-bold">* Preencha com "0" se não houver valor.</span></p>
            </div>

            <form onSubmit={handleReviewClosing}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {paymentMethodsList.map(pm => (
                  <div key={pm.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                       <pm.icon size={16} className="text-emerald-600" /> {pm.label}
                    </label>
                    <input 
                      type="number" step="0.01"
                      placeholder="0,00"
                      required
                      className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-right font-mono font-bold text-gray-800"
                      value={closingCounts[pm.id]}
                      onChange={(e) => setClosingCounts({...closingCounts, [pm.id]: e.target.value})}
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCloseRegister(false)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">
                  Conferir Valores
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: REVIEW & CONFIRM (Cross Information) */}
        {closingStep === 'review' && (
          <div className="bg-white w-full max-w-3xl p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-h-[90vh]">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Conferência de Valores</h2>
              <p className="text-gray-500">Verifique as divergências antes de finalizar.</p>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm text-left min-w-[500px]">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3 rounded-tl-lg">Forma Pagamento</th>
                    <th className="p-3 text-right">Esperado (Sistema)</th>
                    <th className="p-3 text-right">Conferido (Você)</th>
                    <th className="p-3 text-right rounded-tr-lg">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviewData.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3 font-medium">{item.method}</td>
                      <td className="p-3 text-right text-gray-600">{item.expected.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                      <td className="p-3 text-right font-bold text-blue-700">{item.counted.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-1 rounded font-bold ${
                          Math.abs(item.diff) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.diff > 0 ? '+' : ''}{item.diff.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold text-gray-800 border-t border-gray-300">
                   <tr>
                     <td className="p-3">TOTAIS</td>
                     <td className="p-3 text-right">{reviewData.reduce((acc, i) => acc + i.expected, 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                     <td className="p-3 text-right">{reviewData.reduce((acc, i) => acc + i.counted, 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                     <td className="p-3 text-right">
                       {reviewData.reduce((acc, i) => acc + i.diff, 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                     </td>
                   </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800 text-sm mb-6 flex items-start gap-2">
               <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
               <p>Ao confirmar, o caixa será encerrado e as diferenças serão registradas permanentemente no histórico. Certifique-se de que os valores conferidos estão corretos.</p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setClosingStep('input')} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">
                Corrigir Valores
              </button>
              <button 
                onClick={handleConfirmClosing}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md shadow-red-200 flex items-center justify-center gap-2"
              >
                <Lock size={18} /> Confirmar Fechamento
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FINAL RECEIPT (Detailed) - ALSO USES MODAL CLASS */}
        {closingStep === 'receipt' && sessionForReceipt && (
           <div 
             className="fixed inset-0 bg-white z-50 overflow-y-auto receipt-modal-overlay flex items-center justify-center p-4"
             onClick={() => { setShowCloseRegister(false); setClosingStep('input'); setClosingCounts({money:'',pix:'',debit:'',credit:'',ticket:'',transfer:''}); }}
           >
             <div 
               className="bg-white w-full max-w-[400px] mx-auto rounded-xl p-0 relative receipt-content my-auto mt-10 print:mt-0"
               onClick={(e) => e.stopPropagation()}
             >
               {/* Close Button X (Sticky) */}
               <button 
                 onClick={() => { setShowCloseRegister(false); setClosingStep('input'); setClosingCounts({money:'',pix:'',debit:'',credit:'',ticket:'',transfer:''}); }}
                 className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
               >
                 <X size={20} />
               </button>

               <PrintTemplate
                 id="receipt-closing" // ID for robust printing
                 title="Fechamento de Caixa"
                 subtitle="Conferência"
                 type="report"
                 format="thermal" // FORÇA MODO TÉRMICO
                 details={[
                   { label: 'Operador', value: sessionForReceipt.userName },
                   { label: 'Abertura', value: new Date(sessionForReceipt.openedAt).toLocaleString() },
                   { label: 'Fechamento', value: new Date(sessionForReceipt.closedAt!).toLocaleString() },
                   { label: 'Resultado', value: (sessionForReceipt.finalAmount! - sessionForReceipt.calculatedAmount!) === 0 ? 'Balanceado' : 'Divergente', highlight: true }
                 ]}
                 summaryCards={[
                   { label: 'Fundo Inicial', value: sessionForReceipt.initialAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) },
                   { label: 'Total Sistema', value: sessionForReceipt.calculatedAmount?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) || '' },
                   { label: 'Total Conferido', value: sessionForReceipt.finalAmount?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) || '' },
                   { label: 'Diferença', value: (sessionForReceipt.finalAmount! - sessionForReceipt.calculatedAmount!).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) }
                 ]}
               >
                 <h3 className="font-bold text-center uppercase text-xs border-b border-dashed border-black pb-1 mb-2">Detalhamento</h3>
                 <table className="w-full text-xs">
                     <thead>
                       <tr className="border-b border-dashed border-black text-left">
                         <th className="py-1">Método</th>
                         <th className="py-1 text-right">Sistema</th>
                         <th className="py-1 text-right">Real</th>
                       </tr>
                     </thead>
                     <tbody>
                       {sessionForReceipt.closingDetails?.map((det, idx) => {
                          const label = paymentMethodsList.find(pm => pm.id === det.method)?.label || det.method;
                          return (
                            <tr key={idx}>
                              <td className="py-1">{label}</td>
                              <td className="py-1 text-right">{det.expectedAmount.toFixed(2)}</td>
                              <td className="py-1 text-right font-bold">{det.countedAmount.toFixed(2)}</td>
                            </tr>
                          );
                       })}
                     </tbody>
                 </table>
               </PrintTemplate>
               
               <div className="flex gap-4 mt-6 no-print flex-col p-4 border-t border-gray-200 rounded-b-xl">
                 <button onClick={() => printElement('receipt-closing')} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700">
                    <Printer size={20} /> Imprimir Cupom
                 </button>
                 <button onClick={() => { setShowCloseRegister(false); setClosingStep('input'); setClosingCounts({money:'',pix:'',debit:'',credit:'',ticket:'',transfer:''}); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200">
                    Fechar Tela
                 </button>
               </div>
             </div>
           </div>
        )}

        {/* Incluindo o MasterPasswordModal para que ele renderize quando showCloseRegister for true */}
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
  }

  // --- Main Cashier View (Default) ---
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in">
       {/* Header Section */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Frente de Caixa</h2>
            <p className="text-gray-500">
               Operador: <span className="font-bold text-emerald-600">{currentSession?.userName}</span> | 
               Abertura: {new Date(currentSession?.openedAt || '').toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
             <div className="px-4">
                <p className="text-xs text-gray-400 uppercase font-bold">Saldo em Dinheiro</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {cashBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </p>
             </div>
             <div className="h-10 w-px bg-gray-200"></div>
             <div className="flex gap-2">
                {/* BOTÃO DE SAÍDA/DESPESA - DESTAQUE */}
                <button 
                  onClick={() => setShowExpenseModal(true)}
                  className="px-3 py-2 bg-red-50 text-red-700 border border-red-100 font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                  title="Retirar dinheiro do caixa (Sangria/Despesa)"
                >
                  <ArrowUpRight size={18} />
                  <span className="hidden sm:inline">Lançar Saída</span>
                </button>
                
                <button 
                  onClick={() => setShowCloseRegister(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <LogOut size={18} /> <span className="hidden sm:inline">Fechar Caixa</span>
                </button>
             </div>
          </div>
       </div>

       {/* Tabs */}
       <div className="flex gap-2 border-b border-gray-200 mb-4">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'pending' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
          >
            <Clock size={16} /> Pedidos Pendentes ({pendingOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
          >
            <FileText size={16} /> Histórico do Caixa
          </button>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-gray-100 relative">
          
          {/* PENDING TAB */}
          {activeTab === 'pending' && (
             <div className="p-0">
               {pendingOrders.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                   <Clock size={48} className="mb-4 opacity-20" />
                   <p>Nenhum pedido aguardando pagamento.</p>
                 </div>
               ) : (
                 <table className="w-full text-left">
                   <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200 sticky top-0">
                     <tr>
                       <th className="p-4">Hora</th>
                       <th className="p-4">Parceiro</th>
                       <th className="p-4">Tipo</th>
                       <th className="p-4">Itens</th>
                       <th className="p-4 text-right">Total</th>
                       <th className="p-4 text-center">Ação</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-sm">
                     {pendingOrders.map(order => (
                       <tr key={order.id} className="hover:bg-emerald-50/30 transition-colors">
                         <td className="p-4 font-mono text-gray-500">
                           {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </td>
                         <td className="p-4 font-bold text-gray-700">
                           {getPartnerName(order.partnerId)}
                         </td>
                         <td className="p-4">
                           {order.type === 'buy' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold uppercase">
                                <ArrowDownLeft size={12} /> Compra
                              </span>
                           ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold uppercase">
                                <ArrowUpRight size={12} /> Venda
                              </span>
                           )}
                         </td>
                         <td className="p-4 text-gray-500 max-w-xs truncate">
                           {order.items.length} itens
                         </td>
                         <td className="p-4 text-right font-bold text-lg text-gray-800">
                           {order.totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                         </td>
                         <td className="p-4 text-center">
                           <div className="flex justify-center gap-2">
                             <button 
                               onClick={() => initiatePayment(order)}
                               className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                             >
                               <DollarSign size={16} /> {order.type === 'buy' ? 'Pagar' : 'Receber'}
                             </button>
                             <button 
                               onClick={() => setCancelModal({open: true, orderId: order.id})}
                               className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                               title="Cancelar Pedido"
                             >
                               <XCircle size={20} />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
             <div className="flex flex-col h-full">
               <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-100 bg-gray-50">
                  <div className="text-center">
                     <p className="text-xs text-gray-500 uppercase font-bold">Entradas (Vendas)</p>
                     <p className="text-lg font-bold text-emerald-600">+{sessionSummary.in.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                  </div>
                  <div className="text-center border-l border-r border-gray-200">
                     <p className="text-xs text-gray-500 uppercase font-bold">Saídas (Compras)</p>
                     <p className="text-lg font-bold text-orange-600">-{sessionSummary.out.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                  </div>
                  <div className="text-center">
                     <p className="text-xs text-gray-500 uppercase font-bold">Outras Saídas</p>
                     <p className="text-lg font-bold text-red-600">-{sessionSummary.manualOut.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                  </div>
               </div>
               
               <div className="flex-1 overflow-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-white text-gray-500 border-b border-gray-200 sticky top-0 shadow-sm">
                     <tr>
                       <th className="p-3">Hora</th>
                       <th className="p-3">Descrição</th>
                       <th className="p-3">Tipo</th>
                       <th className="p-3">Método</th>
                       <th className="p-3 text-right">Valor</th>
                       <th className="p-3 text-center">Recibo</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {sessionTransactions.map(t => (
                       <tr key={t.id} className="hover:bg-gray-50">
                         <td className="p-3 text-gray-500 font-mono">
                           {new Date(t.createdAt).toLocaleTimeString()}
                         </td>
                         <td className="p-3 font-medium text-gray-800">
                           {t.description}
                         </td>
                         <td className="p-3">
                           {t.category === 'sale' && <span className="text-emerald-600 font-bold text-xs">VENDA</span>}
                           {t.category === 'purchase' && <span className="text-orange-600 font-bold text-xs">COMPRA</span>}
                           {t.category === 'expense' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Despesa</span>}
                           {t.category === 'bleed' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Sangria</span>}
                           {t.category === 'payment_out' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Pagamento</span>}
                           {t.category === 'manual_entry' && <span className="text-blue-600 font-bold text-xs">APORTE</span>}
                         </td>
                         <td className="p-3 text-gray-500 text-xs">
                            {paymentMethodsList.find(pm => pm.id === t.paymentMethod)?.label || t.paymentMethod || 'Dinheiro'}
                         </td>
                         <td className={`p-3 text-right font-bold ${t.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                           {t.type === 'in' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                         </td>
                         <td className="p-3 text-center">
                            {/* Always allow reprint if transaction exists */}
                            <button 
                                 onClick={() => handleReprintTransaction(t)}
                                 className="text-gray-400 hover:text-emerald-600" title="Reimprimir"
                               >
                                 <Printer size={16} />
                            </button>
                         </td>
                       </tr>
                     ))}
                     {sessionTransactions.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma transação nesta sessão.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
          )}
       </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Lançar Saída de Caixa</h3>
                <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleExpense}>
              
              {/* TIPO DE SAÍDA - SELETOR */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                 <button 
                   type="button"
                   onClick={() => setExpenseType('expense')}
                   className={`flex flex-col items-center p-3 rounded-lg border transition-all ${expenseType === 'expense' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                 >
                    <ArrowUpRight size={20} className="mb-1" />
                    <span className="text-xs font-bold">Despesa</span>
                 </button>
                 <button 
                   type="button"
                   onClick={() => setExpenseType('bleed')}
                   className={`flex flex-col items-center p-3 rounded-lg border transition-all ${expenseType === 'bleed' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                 >
                    <Banknote size={20} className="mb-1" />
                    <span className="text-xs font-bold">Sangria</span>
                 </button>
                 <button 
                   type="button"
                   onClick={() => setExpenseType('payment_out')}
                   className={`flex flex-col items-center p-3 rounded-lg border transition-all ${expenseType === 'payment_out' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                 >
                    <FileCheck size={20} className="mb-1" />
                    <span className="text-xs font-bold">Pagamento</span>
                 </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Motivo</label>
                <input 
                  type="text" required autoFocus
                  placeholder={expenseType === 'bleed' ? "Retirada para cofre..." : expenseType === 'payment_out' ? "Pagamento conta de luz..." : "Compra de material limpeza..."}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800 outline-none"
                  value={expenseData.description}
                  onChange={e => setExpenseData({...expenseData, description: e.target.value})}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input 
                  type="number" step="0.01" required
                  placeholder="0,00"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-2xl font-bold text-red-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={expenseData.amount}
                  onChange={e => setExpenseData({...expenseData, amount: e.target.value})}
                />
              </div>
              
              <button type="submit" className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2">
                 <Lock size={18} /> Confirmar Saída
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Receipt Modal (NEW) */}
      {manualReceipt && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto receipt-modal-overlay backdrop-blur-sm"
          onClick={() => setManualReceipt(null)}
        >
          <div 
            className="bg-white w-full max-w-[400px] mx-auto rounded-xl p-0 relative receipt-content my-auto mt-10 print:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Close Button X (Sticky) */}
             <button 
               onClick={() => setManualReceipt(null)}
               className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
               title="Fechar"
             >
               <X size={20} />
             </button>

             <div className="p-4">
               <PrintTemplate
                 id="receipt-manual" // ID for printing
                 title={`Comprovante ${manualReceipt.category === 'bleed' ? 'Sangria' : manualReceipt.category === 'payment_out' ? 'Pagamento' : 'Despesa'}`}
                 subtitle="Movimentação Manual"
                 type="receipt"
                 format="thermal" // FORÇA TÉRMICO
                 details={[
                   { label: 'Operação', value: manualReceipt.category === 'bleed' ? 'SANGRIA' : manualReceipt.category === 'payment_out' ? 'PAGAMENTO' : 'DESPESA', highlight: true },
                   { label: 'Data', value: new Date(manualReceipt.createdAt).toLocaleString() },
                   { label: 'Responsável', value: manualReceipt.user },
                   { label: 'ID', value: `#${manualReceipt.id.slice(0,8).toUpperCase()}` },
                 ]}
                 summaryCards={[
                   { label: 'VALOR', value: manualReceipt.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) }
                 ]}
               >
                 <div className="p-2 border border-dashed border-black text-center text-xs my-2">
                    <p className="font-bold">Motivo</p>
                    <p>{manualReceipt.description}</p>
                 </div>
               </PrintTemplate>
             </div>
             
             <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col gap-3 no-print rounded-b-xl">
               <button onClick={() => printElement('receipt-manual')} className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg font-bold text-lg"><Printer size={24} /> Imprimir Cupom</button>
               <button onClick={() => setManualReceipt(null)} className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 font-medium">Fechar Tela</button>
             </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
            <button 
              onClick={() => setPaymentConfirmation(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {paymentConfirmation.type === 'buy' ? 'Confirmar Pagamento' : 'Confirmar Recebimento'}
              </h3>
              <p className="text-gray-500 text-sm">Selecione a forma de pagamento abaixo</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl mb-6 text-center">
              <p className="text-sm text-gray-500 mb-1">{paymentConfirmation.partnerName}</p>
              <p className={`text-3xl font-bold ${paymentConfirmation.type === 'buy' ? 'text-orange-600' : 'text-emerald-600'}`}>
                {paymentConfirmation.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {paymentMethodsList.map(method => {
                const Icon = method.icon;
                const isSelected = selectedPaymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={24} className={`mb-2 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">{method.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={confirmPayment}
              className={`w-full py-3 rounded-xl text-white font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-2 ${
                paymentConfirmation.type === 'buy' 
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              <CheckCircle size={20} />
              {paymentConfirmation.type === 'buy' ? 'Pagar Agora' : 'Receber Agora'}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={cancelModal.open} onClose={() => setCancelModal({ open: false, orderId: null })} onConfirm={confirmCancel} title="Cancelar Pedido" message="Tem certeza que deseja cancelar este pedido?" confirmText="Sim, Cancelar" variant="warning" />

      <MasterPasswordModal 
        isOpen={masterAuth.isOpen} 
        onClose={() => setMasterAuth({ ...masterAuth, isOpen: false })} 
        onAuthenticated={() => masterAuth.pendingAction && masterAuth.pendingAction()} 
        title={masterAuth.title} 
        logDetails={masterAuth.logDetails}
        requiredPermission={masterAuth.requiredPermission} 
      />
      
      {/* Order Receipt Modal */}
      {showReceipt && (
        // Use 'receipt-modal-overlay' to trigger print visibility
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto receipt-modal-overlay backdrop-blur-sm"
          onClick={() => setShowReceipt(null)}
        >
          <div 
            className="bg-white w-full max-w-[400px] mx-auto rounded-xl p-0 relative receipt-content my-auto mt-10 print:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Close Button X (Sticky) */}
             <button 
               onClick={() => setShowReceipt(null)}
               className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
               title="Fechar"
             >
               <X size={20} />
             </button>

             <div className="p-4">
               <PrintTemplate
                 id="receipt-main" // ID for printing
                 title={`Recibo ${showReceipt.type === 'buy' ? 'Pagamento' : 'Recebimento'}`}
                 subtitle="Comprovante Financeiro"
                 type="receipt"
                 format="thermal" // FORÇA TÉRMICO
                 details={[
                   { label: 'Parceiro', value: showReceipt.partnerName },
                   { label: 'Doc', value: showReceipt.partnerDoc },
                   { label: 'Ref', value: `#${showReceipt.orderId.slice(0,8).toUpperCase()}` },
                   { label: 'Pagamento', value: showReceipt.paymentMethod, highlight: true }, 
                 ]}
                 summaryCards={[
                   { label: 'Qtd. Itens', value: showReceipt.items.length.toString() },
                   { label: 'TOTAL', value: showReceipt.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) }
                 ]}
               >
                 <table className="w-full text-xs">
                     <thead>
                       <tr className="border-b border-dashed border-black text-left">
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
                             <td className="py-1 text-right">{(item.quantity * item.priceAtMoment).toFixed(2)}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                 </table>
               </PrintTemplate>
             </div>
             
             <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col gap-3 no-print rounded-b-xl">
               <button onClick={() => printElement('receipt-main')} className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg font-bold text-lg"><Printer size={24} /> Imprimir Cupom</button>
               <button onClick={() => setShowReceipt(null)} className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 font-medium">Fechar Tela</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cashier;
