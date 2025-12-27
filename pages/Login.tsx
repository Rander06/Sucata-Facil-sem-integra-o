import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../services/store';
import { Recycle, Lock, Mail, ArrowRight, Building2, User, Phone, FileText, CheckCircle, ArrowLeft, MessageCircle, Key, Loader, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CompanyPlan } from '../types';

const Login: React.FC = () => {
  const { login, registerCompany, requestPasswordReset, completePasswordReset, plans } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // View State
  const [view, setView] = useState<'login' | 'register_form' | 'forgot' | 'reset_password'>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isBlocked, setIsBlocked] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);

  // Reset Password Logic State
  const [mockResetEmail, setMockResetEmail] = useState<{visible: boolean, token: string, email: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Register State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [regData, setRegData] = useState({
    companyName: '',
    document: '',
    adminName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Helper para obter detalhes do plano selecionado de forma segura
  const selectedPlanDetails = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || plans.find(p => p.id === 'professional') || plans[0];
  }, [plans, selectedPlanId]);

  // DETECTAR PRÉ-SELEÇÃO (URL ou STATE)
  useEffect(() => {
    // 1. Verifica State do React Router (navegação interna)
    if (location.state && location.state.plan && location.state.cycle) {
       setSelectedPlanId(location.state.plan);
       setBillingCycle(location.state.cycle as 'monthly' | 'annual');
       setView('register_form');
       return;
    }

    // 2. Verifica Query Params da URL (navegação externa/link direto)
    const searchParams = new URLSearchParams(location.search);
    const planParam = searchParams.get('plan');
    const cycleParam = searchParams.get('cycle');

    if (planParam) {
       // Verifica se o plano existe na lista dinâmica
       const planExists = plans.some(p => p.id === planParam);
       if (planExists) {
          setSelectedPlanId(planParam);
          if (cycleParam === 'monthly' || cycleParam === 'annual') {
              setBillingCycle(cycleParam);
          }
          setView('register_form');
       }
    }
  }, [location, plans]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsBlocked(false);
    const result = login(email, password);
    
    if (result.success && result.user) {
      if (result.user.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message || 'Erro ao entrar.');
      if (result.isBlocked) {
        setIsBlocked(true);
      }
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regData.password !== regData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (regData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    
    // Register the company
    try {
      registerCompany({
        companyName: regData.companyName,
        document: regData.document,
        adminName: regData.adminName,
        email: regData.email,
        phone: regData.phone,
        password: regData.password,
        plan: selectedPlanId,
        billingCycle: billingCycle
      });
      
      // Ao invés de navegar direto, mostra o modal de sucesso
      setShowSuccessModal(true);
      
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, digite seu e-mail cadastrado.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // Simulation Delay
    setTimeout(() => {
      const result = requestPasswordReset(email);
      setIsLoading(false);
      
      if (result.success && result.token) {
        // Show Mock Email Modal instead of just alert
        setMockResetEmail({
          visible: true,
          token: result.token,
          email: email
        });
        setSuccessMsg('Instruções enviadas! Verifique seu e-mail.');
      } else {
        setError(result.message);
      }
    }, 1500);
  };

  const handleCompleteReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    const result = completePasswordReset(resetToken, newPassword);
    if (result.success) {
      alert('Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.');
      setView('login');
      setPassword(''); // Clear old pass field
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setError(result.message);
    }
  };

  // Triggered by clicking the link in the mock email
  const triggerResetView = (token: string) => {
    setResetToken(token);
    setMockResetEmail(null);
    setView('reset_password');
    setError('');
    setSuccessMsg('');
  };

  // Componente Interno para o Checklist Animado
  const AutomatedMessagesFeedback = () => {
    const [emailSent, setEmailSent] = useState(false);
    const [whatsappSent, setWhatsappSent] = useState(false);

    useEffect(() => {
      const t1 = setTimeout(() => setEmailSent(true), 800);
      const t2 = setTimeout(() => setWhatsappSent(true), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
      <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100 text-left mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Notificações Automáticas</p>
        
        <div className="flex items-center gap-3">
           <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${emailSent ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
              {emailSent ? <CheckCircle size={14} /> : <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>}
           </div>
           <span className={`text-sm ${emailSent ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>E-mail de boas-vindas enviado</span>
        </div>

        <div className="flex items-center gap-3">
           <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${whatsappSent ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
              {whatsappSent ? <CheckCircle size={14} /> : <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>}
           </div>
           <span className={`text-sm ${whatsappSent ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>Mensagem WhatsApp enviada</span>
        </div>
      </div>
    );
  };

  const openWhatsApp = () => {
    // Mensagem simulada que a "Empresa" enviaria para o Usuário, ou que o Usuário envia para o suporte confirmando
    const msg = `Olá! Acabei de criar minha conta no Sucata Fácil. Empresa: ${regData.companyName}.`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      
      {/* SUCCESS MODAL (POST-REGISTRATION) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-emerald-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-center relative">
              <div className="bg-emerald-600 h-2 w-full absolute top-0"></div>
              <div className="p-8">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
                    <CheckCircle size={48} strokeWidth={3} />
                 </div>
                 
                 <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Cadastro Concluído!</h2>
                 <p className="text-gray-500 mb-6">Sua conta empresarial foi criada com sucesso. Aproveite seu período de teste.</p>
                 
                 <AutomatedMessagesFeedback />

                 <button 
                   onClick={() => {
                      const res = login(regData.email, regData.password);
                      if (res.success) {
                          navigate('/dashboard');
                      } else {
                          setError('Erro ao realizar login automático. Por favor, entre com suas credenciais.');
                          setShowSuccessModal(false);
                          setView('login');
                      }
                   }}
                   className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 mb-4"
                 >
                   Acessar Painel Agora <ArrowRight size={20} />
                 </button>

                 <button 
                   onClick={openWhatsApp}
                   className="text-emerald-600 font-bold text-xs hover:underline flex items-center justify-center gap-1 w-full"
                 >
                   <MessageCircle size={14} /> Não recebeu o Zap? Clique aqui
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MOCK EMAIL MODAL (DEMONSTRATION ONLY) */}
      {mockResetEmail && mockResetEmail.visible && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden border border-gray-200">
              {/* Fake Email Header */}
              <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-500" />
                    <span className="font-bold text-sm text-gray-700">Caixa de Entrada (Simulação)</span>
                 </div>
                 <button onClick={() => setMockResetEmail(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              
              {/* Fake Email Content */}
              <div className="p-6">
                 <div className="border-b border-gray-100 pb-4 mb-4">
                    <h3 className="font-bold text-lg text-gray-800">Redefinição de Senha</h3>
                    <p className="text-xs text-gray-500">De: sistema@sucatafacil.com</p>
                    <p className="text-xs text-gray-500">Para: {mockResetEmail.email}</p>
                 </div>
                 <div className="space-y-4 text-sm text-gray-600">
                    <p>Olá,</p>
                    <p>Recebemos uma solicitação para redefinir sua senha no Sucata Fácil.</p>
                    <p>Clique no botão abaixo para criar uma nova senha:</p>
                    
                    <button 
                      onClick={() => triggerResetView(mockResetEmail.token)}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors mx-auto block shadow-md"
                    >
                      Redefinir Minha Senha
                    </button>
                    
                    <p className="text-xs text-gray-400 mt-4">
                      Se você não solicitou isso, ignore este e-mail. O link expira em 1 hora.
                    </p>
                 </div>
              </div>
              <div className="bg-yellow-50 p-2 text-center text-[10px] text-yellow-700 font-medium border-t border-yellow-100">
                 MODO DE DEMONSTRAÇÃO: Em produção, este e-mail seria enviado via SMTP.
              </div>
           </div>
        </div>
      )}

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-emerald-100 overflow-hidden animate-fade-in my-8 transition-all duration-500 relative">
        
        {/* Header */}
        <div className="p-8 text-center bg-emerald-50/50 border-b border-emerald-100 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white shadow-sm border border-emerald-100 rounded-full mb-4">
            <Recycle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-900">Sucata Fácil SaaS</h1>
          <p className="text-emerald-600 text-sm mt-1">
             {view.includes('register') ? 'Cadastro de Empresa' : view === 'reset_password' ? 'Nova Senha' : 'Sistema Integrado de Gestão'}
          </p>
        </div>

        <div className="p-8">
          
          {/* TABS FOR LOGIN / REGISTER (Hidden in Forgot/Reset modes) */}
          {view !== 'forgot' && view !== 'reset_password' && view !== 'register_form' && (
             <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                <button 
                  onClick={() => { setView('login'); setError(''); setIsBlocked(false); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${view === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Entrar
                </button>
                <button 
                  onClick={() => navigate('/', { state: { scrollTo: 'planos' } })}
                  className="flex-1 py-2 text-sm font-bold rounded-md transition-all text-gray-500 hover:text-gray-700"
                >
                  Criar Conta
                </button>
             </div>
          )}

          {/* LOGIN FORM */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                  <input 
                    type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                  <input 
                    type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800"
                    placeholder="••••••"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                    Esqueceu a senha?
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 animate-pulse">
                  {error}
                  {isBlocked && (
                    <a 
                      href="https://w.app/sucatafacilacessobloqueado" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-3 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <MessageCircle size={20} />
                      Regularize Aqui
                    </a>
                  )}
                </div>
              )}

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                Entrar no Sistema <ArrowRight size={20} />
              </button>
              
              <div className="text-center mt-6 space-y-3">
                 <button 
                    type="button" 
                    onClick={() => navigate('/', { state: { scrollTo: 'planos' } })} 
                    className="text-emerald-600 font-bold hover:underline text-sm block w-full"
                 >
                    Ainda não tem conta? Teste Grátis
                 </button>
                 <button type="button" onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase flex items-center justify-center gap-1 w-full">
                    <ArrowLeft size={12} /> Voltar ao Site
                 </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-6 animate-slide-up">
              <div className="text-center mb-4">
                <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                   <Key size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Recuperar Senha</h2>
                <p className="text-sm text-gray-500">Digite seu e-mail e enviaremos um link seguro para redefinir sua senha.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                  <input 
                    type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="seu@email.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">{error}</div>}
              {successMsg && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm text-center border border-green-100 font-medium">{successMsg}</div>}

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader size={20} className="animate-spin" /> : 'Enviar Instruções'}
                </button>
                <button type="button" onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} className="w-full bg-white text-gray-600 border border-gray-200 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Voltar para Login
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {view === 'reset_password' && (
            <form onSubmit={handleCompleteReset} className="space-y-6 animate-slide-up">
              <div className="text-center mb-4">
                <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full mb-3">
                   <CheckCircle size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Criar Nova Senha</h2>
                <p className="text-sm text-gray-500">Sua identidade foi verificada. Defina sua nova senha de acesso.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input 
                  type="password" required
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input 
                  type="password" required
                  value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Repita a senha"
                />
              </div>

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">{error}</div>}

              <div className="flex flex-col gap-3">
                <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-colors">
                  Redefinir Senha
                </button>
                <button type="button" onClick={() => { setView('login'); setError(''); }} className="w-full bg-white text-gray-600 border border-gray-200 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM (Dynamic Plan Data) */}
          {view === 'register_form' && (
             <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                <div className={`mb-4 p-4 rounded-lg border flex justify-between items-center ${selectedPlanDetails.color.includes('bg-') ? selectedPlanDetails.color.replace('bg-', 'bg-opacity-20 bg-') + ' border-opacity-30' : 'bg-emerald-50 border-emerald-100'}`}>
                   <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Plano Selecionado</p>
                      <p className="font-bold text-emerald-800 text-lg">{selectedPlanDetails.name} <span className="text-sm font-normal">({billingCycle === 'monthly' ? 'Mensal' : 'Anual'})</span></p>
                      <p className="text-xs text-emerald-700">
                        {billingCycle === 'monthly' 
                            ? `R$ ${selectedPlanDetails.priceMonthly.toFixed(2)} /mês` 
                            : `R$ ${selectedPlanDetails.priceAnnual.toFixed(2)} /ano`
                        }
                      </p>
                   </div>
                   <button type="button" onClick={() => navigate('/', { state: { scrollTo: 'planos' } })} className="text-xs text-emerald-600 hover:underline font-bold">Alterar</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Empresa</label>
                     <div className="relative">
                       <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input 
                         required
                         className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                         value={regData.companyName} onChange={e => setRegData({...regData,companyName: e.target.value})}
                         placeholder="Minha Reciclagem Ltda"
                       />
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ / CPF</label>
                     <div className="relative">
                       <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input 
                         required
                         className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                         value={regData.document} onChange={e => setRegData({...regData,document: e.target.value})}
                         placeholder="00.000.000/0001-00"
                       />
                     </div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Celular/WhatsApp</label>
                     <div className="relative">
                       <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input 
                         required
                         className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                         value={regData.phone} onChange={e => setRegData({...regData,phone: e.target.value})}
                         placeholder="(11) 99999-9999"
                       />
                     </div>
                   </div>
                </div>

                <div className="border-t border-gray-100 pt-2">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Administrador</label>
                   <div className="relative mb-3">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        required
                        className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        value={regData.adminName} onChange={e => setRegData({...regData,adminName: e.target.value})}
                        placeholder="Seu nome completo"
                      />
                   </div>
                   
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail de Login</label>
                   <div className="relative mb-3">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="email" required
                        className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        value={regData.email} onChange={e => setRegData({...regData,email: e.target.value})}
                        placeholder="admin@empresa.com"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                        <input 
                          type="password" required
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          value={regData.password} onChange={e => setRegData({...regData,password: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Senha</label>
                        <input 
                          type="password" required
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          value={regData.confirmPassword} onChange={e => setRegData({...regData,confirmPassword: e.target.value})}
                        />
                      </div>
                   </div>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-2 rounded text-xs text-center border border-red-100">{error}</div>}

                <div className="flex gap-3">
                   <button type="button" onClick={() => navigate('/')} className="px-4 py-3 border border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                      Voltar ao Site
                   </button>
                   <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition-all shadow-md">
                     Finalizar Cadastro
                   </button>
                </div>
                
                <div className="text-center mt-4">
                    <button type="button" onClick={() => setView('login')} className="text-emerald-600 font-bold hover:underline text-xs">
                        Já tenho cadastro, voltar a tela de login (entrar)
                    </button>
                </div>

                <p className="text-[10px] text-center text-gray-400 mt-2">
                   Ao criar a conta, você concorda com os Termos de Uso. Seus 15 dias grátis começam imediatamente.
                </p>
             </form>
          )}
        </div>
        <div className="bg-emerald-50/50 p-4 text-center text-xs text-emerald-600/60">
          &copy; {new Date().getFullYear()} Sucata Fácil SaaS - v2.0 Multi-tenant
        </div>
      </div>
    </div>
  );
};

export default Login;