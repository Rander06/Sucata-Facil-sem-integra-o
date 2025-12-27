
import React from 'react';
import { Lock, ExternalLink, CheckCircle } from 'lucide-react';
import { useStore } from '../services/store';

const SubscriptionBlock = () => {
  const { currentCompany, logout, plans } = useStore();

  // Separa os planos para exibir ordenadamente (Essencial, Profissional, Premium e outros)
  const sortedPlans = [...plans].sort((a, b) => a.priceMonthly - b.priceMonthly);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
        
        <div className="inline-flex p-4 bg-red-100 rounded-full mb-6 text-red-600">
           <Lock size={48} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Temporariamente Bloqueado</h1>
        <p className="text-gray-500 mb-8 max-w-lg mx-auto">
          Olá, o período de teste ou a assinatura da empresa <span className="font-bold text-gray-800">{currentCompany?.name}</span> expirou. 
          Escolha um dos planos abaixo para reativar seu acesso imediato.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
           {sortedPlans.slice(0, 3).map(plan => {
             // Lógica de cores simples baseada no nome ou posição
             const isPro = plan.id === 'professional' || plan.name.toLowerCase().includes('profissional');
             const isPremium = plan.id === 'premium' || plan.name.toLowerCase().includes('premium');
             
             let borderColor = 'border-gray-200';
             let btnColor = 'bg-gray-800 hover:bg-gray-700';
             let priceColor = 'text-emerald-600';
             let checkColor = 'text-emerald-500';

             if (isPro) {
                borderColor = 'border-blue-500';
                btnColor = 'bg-blue-600 hover:bg-blue-700';
                priceColor = 'text-blue-700';
                checkColor = 'text-blue-500';
             } else if (isPremium) {
                borderColor = 'border-purple-300 hover:border-purple-500';
                btnColor = 'bg-gray-800 hover:bg-gray-700'; // Premium usa dark no botão ou roxo
                priceColor = 'text-purple-600';
                checkColor = 'text-purple-500';
             }

             return (
               <div key={plan.id} className={`border-2 rounded-xl p-6 bg-white transition-all hover:shadow-lg ${borderColor} ${isPro ? 'bg-blue-50/30 relative' : 'hover:bg-gray-50'}`}>
                  {isPro && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">RECOMENDADO</div>
                  )}
                  <h3 className="font-bold text-gray-800 text-lg">{plan.name}</h3>
                  <p className={`text-3xl font-bold ${priceColor} mt-2 mb-1`}>
                    R$ {plan.priceMonthly.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">/mês</p>
                  
                  <ul className="space-y-2 text-sm text-gray-600 mb-6 min-h-[80px]">
                     <li className="flex items-center gap-2"><CheckCircle size={14} className={checkColor}/> {plan.maxUsers === 9999 ? 'Usuários Ilimitados' : `${plan.maxUsers} Usuários`}</li>
                     <li className="flex items-center gap-2"><CheckCircle size={14} className={checkColor}/> {plan.backupType === 'auto' ? 'Backup Automático' : 'Backup Manual'}</li>
                     {plan.features.slice(0,2).map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs"><CheckCircle size={14} className={checkColor}/> {feat}</li>
                     ))}
                  </ul>
                  
                  <a 
                    href={`https://wa.me/5511999999999?text=Olá,%20minha%20empresa%20${encodeURIComponent(currentCompany?.name || '')}%20foi%20bloqueada.%20Quero%20assinar%20o%20plano%20${encodeURIComponent(plan.name)}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`block w-full text-center text-white py-2 rounded-lg text-sm font-bold transition-colors ${btnColor}`}
                  >
                    Escolher
                  </a>
               </div>
             );
           })}
        </div>
        
        <div className="flex justify-center">
          <button onClick={() => logout()} className="text-gray-400 text-sm hover:text-gray-600 hover:underline flex items-center gap-2">
             <ExternalLink size={14} /> Sair e voltar para Login
          </button>
        </div>
        
        <p className="text-[10px] text-gray-400 mt-6">
           Seus dados estão salvos e seguros. Eles serão liberados imediatamente após a confirmação do pagamento.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionBlock;
