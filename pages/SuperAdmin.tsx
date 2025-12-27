
import React, { useMemo, useRef, useState } from 'react';
import { useStore, PLANS_CONFIG } from '../services/store';
import { 
  Building, Globe, CreditCard, TrendingUp, Wallet, PiggyBank, Ban, X, Clock, Server, HardDrive, Upload, AlertTriangle, CloudDownload
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const { allCompanies, triggerManualBackup, importBackup, backupHistory, downloadBackup } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA FINANCEIRA RIGOROSA ---
  const financialMetrics = useMemo(() => {
    const now = new Date();

    return allCompanies.reduce((acc, c) => {
        // Verifica se está no período de teste (data de fim do trial é maior que agora)
        const isInTrialPeriod = c.trialEndsAt && new Date(c.trialEndsAt) > now;
        
        let estimatedValue = 0;
        
        if (c.plan === 'trial') {
            estimatedValue = PLANS_CONFIG['professional'].priceMonthly; 
        } else {
            const config = PLANS_CONFIG[c.plan];
            estimatedValue = c.billingCycle === 'annual' ? config.priceAnnual : config.priceMonthly;
        }

        if (c.status === 'blocked' || c.status === 'suspended') {
            acc.blocked += estimatedValue;
        } else if (isInTrialPeriod) {
            // SE estiver nos primeiros 15 dias, conta como Trial/Potencial, mesmo se escolheu plano pago
            acc.trialPotential += estimatedValue;
        } else {
            // Só conta como receita recorrente se já passou do período de teste
            if (c.billingCycle === 'annual') {
                acc.annualPaid += estimatedValue;
            } else {
                acc.monthlyRecurring += estimatedValue;
            }
        }
        return acc;
    }, { monthlyRecurring: 0, annualPaid: 0, trialPotential: 0, blocked: 0 });
  }, [allCompanies]);

  // Lógica de Contagem dos Cards
  const now = new Date();
  
  const activeCompaniesCount = allCompanies.filter(c => c.status === 'active').length;
  
  // Considera Trial se o plano for 'trial' OU se ainda estiver dentro da data de teste
  const trialCompaniesCount = allCompanies.filter(c => 
    c.status === 'active' && (c.plan === 'trial' || (c.trialEndsAt && new Date(c.trialEndsAt) > now))
  ).length;

  // Considera Pagante apenas se estiver ativo E já tiver passado do trial
  const payingCompaniesCount = allCompanies.filter(c => 
    c.status === 'active' && c.plan !== 'trial' && (!c.trialEndsAt || new Date(c.trialEndsAt) <= now)
  ).length;

  // --- BACKUP HANDLERS ---
  const handleGlobalBackup = () => {
      const success = triggerManualBackup();
      if (success) {
          alert('Backup Global do sistema realizado com sucesso! Todos os dados foram salvos.');
      } else {
          alert('Erro ao criar backup.');
      }
  };

  const handleRestoreGlobal = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const confirmRestore = window.confirm(`ATENÇÃO CRÍTICA: Você está prestes a restaurar um backup GLOBAL. Isso irá SOBRESCREVER todos os dados atuais de TODAS as empresas e usuários. Tem certeza absoluta?`);
      
      if (confirmRestore) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const content = evt.target?.result as string;
              const success = importBackup(content);
              if (success) {
                  alert('Sistema restaurado com sucesso. A página será recarregada.');
                  window.location.reload();
              } else {
                  alert('Falha ao restaurar. Arquivo inválido ou incompatível.');
              }
          };
          reader.readAsText(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter system backups
  const systemBackups = backupHistory.filter(b => b.companyId === 'SYSTEM').slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in pb-20 min-h-screen bg-gray-50 p-6 -m-4 md:-m-8">
      {/* Super Admin Header */}
      <div className="bg-emerald-600 text-white p-6 md:p-8 rounded-2xl shadow-xl border border-emerald-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start gap-8">
          
          {/* Left Title Area */}
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-3">
               <div className="p-2 bg-white/20 rounded-lg shadow-sm backdrop-blur-sm">
                 <Globe size={24} className="text-white" />
               </div>
               <span className="text-emerald-100 font-bold tracking-wider text-xs uppercase">Painel Master SaaS</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">Visão Global</h1>
            <p className="text-emerald-50 text-sm md:text-base leading-relaxed">
              Resumo executivo de performance, receita e crescimento da base de clientes.
            </p>
          </div>
          
          {/* Right Financial Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full xl:w-auto">
             
             {/* 1. Recorrente Mensal (VERDE) */}
             <div className="bg-white border-l-4 border-emerald-500 p-4 rounded-xl shadow-lg flex flex-col justify-between min-w-[150px] transform hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-1.5 bg-emerald-100 rounded-lg"><Wallet size={16} className="text-emerald-600" /></div>
                   <p className="text-[10px] text-emerald-900 uppercase font-extrabold leading-tight">Recorrente<br/>Mensal (MRR)</p>
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">
                    {financialMetrics.monthlyRecurring.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', minimumFractionDigits: 2})}
                </span>
             </div>

             {/* 2. Anual Pago (AZUL) */}
             <div className="bg-white border-l-4 border-blue-500 p-4 rounded-xl shadow-lg flex flex-col justify-between min-w-[150px] transform hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-1.5 bg-blue-100 rounded-lg"><PiggyBank size={16} className="text-blue-600" /></div>
                   <p className="text-[10px] text-blue-900 uppercase font-extrabold leading-tight">Receita<br/>Anual Paga</p>
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">
                    {financialMetrics.annualPaid.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', minimumFractionDigits: 2})}
                </span>
             </div>

             {/* 3. Potencial Trial (AMARELO/LARANJA) */}
             <div className="bg-white border-l-4 border-amber-500 p-4 rounded-xl shadow-lg flex flex-col justify-between min-w-[150px] transform hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-1.5 bg-amber-100 rounded-lg"><TrendingUp size={16} className="text-amber-600" /></div>
                   <p className="text-[10px] text-amber-900 uppercase font-extrabold leading-tight">Receita em<br/>Teste (Potencial)</p>
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">
                    {financialMetrics.trialPotential.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', minimumFractionDigits: 2})}
                </span>
             </div>

             {/* 4. Retido/Bloqueado (VERMELHO) */}
             <div className="bg-white border-l-4 border-red-500 p-4 rounded-xl shadow-lg flex flex-col justify-between min-w-[150px] transform hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-1.5 bg-red-100 rounded-lg"><Ban size={16} className="text-red-600" /></div>
                   <p className="text-[10px] text-red-900 uppercase font-extrabold leading-tight">Valores<br/>Bloqueados</p>
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">
                    {financialMetrics.blocked.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', minimumFractionDigits: 2})}
                </span>
             </div>

          </div>
        </div>
      </div>

      {/* KPI Grid Secundário */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: 'Total Empresas', val: allCompanies.length, icon: Building, color: 'bg-emerald-50 text-emerald-800' },
           { label: 'Ativas Pagantes', val: payingCompaniesCount, icon: CreditCard, color: 'bg-blue-50 text-blue-800' },
           { label: 'Em Teste (Trial)', val: trialCompaniesCount, icon: Clock, color: 'bg-amber-50 text-amber-800' },
           { label: 'Bloqueadas / Inativas', val: allCompanies.length - activeCompaniesCount, icon: X, color: 'bg-red-50 text-red-800' },
         ].map((kpi, idx) => (
           <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                 <p className="text-xs font-bold text-gray-500 uppercase mb-1">{kpi.label}</p>
                 <p className="text-2xl font-bold text-gray-800">{kpi.val}</p>
              </div>
              <div className={`p-3 rounded-lg ${kpi.color}`}>
                 <kpi.icon size={20} />
              </div>
           </div>
         ))}
      </div>

      {/* SECTION: SYSTEM BACKUP */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden lg:col-span-2 flex flex-col">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <Server size={80} className="text-blue-900" />
           </div>
           <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Server size={20} className="text-indigo-600" /> Segurança do Sistema & Backup Global
              </h3>
              
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-xs font-bold text-emerald-700">
                     Backup Automático: ATIVO
                   </span>
              </div>
           </div>
           
           <p className="text-sm text-gray-500 mb-6 max-w-xl">
             Este painel permite criar "Snapshots" (cópias completas) de todo o banco de dados do SaaS, incluindo todas as empresas, usuários, transações e configurações. Use com cautela.
           </p>

           {/* Botões de Ação */}
           <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button 
                onClick={handleGlobalBackup}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex-1"
              >
                <HardDrive size={18} />
                Backup Global Manual
              </button>
              
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleRestoreGlobal} 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg font-bold hover:bg-gray-50 transition-all flex-1"
              >
                <Upload size={18} />
                Restaurar Sistema Completo
              </button>
           </div>

           {/* Tabela de Histórico de Backups do Sistema */}
           <div className="flex-1 border border-gray-100 rounded-lg overflow-hidden bg-gray-50/50">
             <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 font-bold text-xs uppercase text-gray-500 flex items-center justify-between gap-2">
               <span className="flex items-center gap-2"><Clock size={12} /> Últimos Backups Globais</span>
               <span className="text-[9px] text-indigo-500 font-bold flex items-center gap-1">
                 Armazenamento Local
               </span>
             </div>
             <div className="overflow-y-auto max-h-48">
               {systemBackups.length === 0 ? (
                 <div className="text-center py-8 text-gray-400 text-sm">
                   Nenhum backup global registrado.
                 </div>
               ) : (
                 <table className="w-full text-left text-sm">
                   <tbody className="divide-y divide-gray-100 bg-white">
                     {systemBackups.map(log => (
                       <tr key={log.id} className="hover:bg-gray-50">
                         <td className="p-3 text-gray-700">
                           <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="font-bold text-xs">{new Date(log.timestamp).toLocaleDateString()}</span>
                                <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                           </div>
                         </td>
                         <td className="p-3">
                           <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${log.type === 'auto' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                             {log.type === 'auto' ? 'Auto' : 'Manual'}
                           </span>
                         </td>
                         <td className="p-3 text-right font-mono text-xs text-gray-500">
                           {log.size}
                         </td>
                         <td className="p-3 text-right">
                           <button 
                             className="text-gray-400 hover:text-emerald-600 p-1 rounded transition-colors"
                             title="Baixar este backup"
                             onClick={() => downloadBackup(log.id)}
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
  );
};

export default SuperAdminDashboard;
