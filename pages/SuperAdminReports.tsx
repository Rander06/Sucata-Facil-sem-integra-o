
import React, { useState, useMemo } from 'react';
import { useStore, PLANS_CONFIG } from '../services/store';
import { 
  FileBarChart, Search, Download, Calendar, Filter, CreditCard, RotateCw, Printer, ShieldCheck, FileText, User, X
} from 'lucide-react';
import PrintTemplate, { printElement } from '../components/PrintTemplate';

// HELPER: Pega a data atual no formato YYYY-MM-DD respeitando o fuso local (Brasil)
const getCurrentDateBR = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// HELPER: Pega o primeiro dia do mês atual no formato YYYY-MM-DD
const getFirstDayMonthBR = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

// HELPER: Ajusta uma data UTC (do banco) para o dia correspondente no Brasil (UTC-3)
const adjustDateToBrazil = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Subtrai 3 horas (em milissegundos) para forçar o fuso de Brasília
  const brazilTime = new Date(date.getTime() - (3 * 60 * 60 * 1000));
  return brazilTime.toISOString().split('T')[0];
};

const SuperAdminReports = () => {
  const { allCompanies, allUsers, plans } = useStore();
  const [activeTab, setActiveTab] = useState<'financial' | 'audit'>('financial');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Report Filters (Using BR Helpers)
  const [reportStartDate, setReportStartDate] = useState(getFirstDayMonthBR());
  const [reportEndDate, setReportEndDate] = useState(getCurrentDateBR());
  
  // Financial Filters
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
  const [reportCycleFilter, setReportCycleFilter] = useState<string>('all');
  const [reportPlanFilter, setReportPlanFilter] = useState<string>('all');

  // Audit Filters
  const [auditUserFilter, setAuditUserFilter] = useState('all');

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Helper for safe plan config access
  const getPlanConfig = (planId: string) => {
      const p = plans.find(plan => plan.id === planId);
      if (p) return { name: p.name, priceAnnual: p.priceAnnual, priceMonthly: p.priceMonthly };
      const legacy = PLANS_CONFIG[planId];
      return legacy ? { name: legacy.name, priceAnnual: legacy.priceAnnual, priceMonthly: legacy.priceMonthly } : { name: planId, priceAnnual: 0, priceMonthly: 0 };
  };

  // --- DADOS FINANCEIROS ---
  const reportData = useMemo(() => {
    return allCompanies.filter(c => {
       // Adjust UTC creation date to Brazil time before filtering
       const created = adjustDateToBrazil(c.createdAt);
       
       const dateMatch = created >= reportStartDate && created <= reportEndDate;
       const statusMatch = reportStatusFilter === 'all' || c.status === reportStatusFilter;
       const cycleMatch = reportCycleFilter === 'all' || (c.billingCycle || 'monthly') === reportCycleFilter;
       const planMatch = reportPlanFilter === 'all' || c.plan === reportPlanFilter;
       
       const nameMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
       
       return dateMatch && statusMatch && cycleMatch && planMatch && nameMatch;
    });
  }, [allCompanies, reportStartDate, reportEndDate, reportStatusFilter, reportCycleFilter, reportPlanFilter, searchTerm]);

  const reportTotalValue = reportData.reduce((acc, c) => {
     const planConfig = getPlanConfig(c.plan);
     let val = 0;
     val = c.billingCycle === 'annual' ? planConfig.priceAnnual : planConfig.priceMonthly;
     return acc + val;
  }, 0);

  // --- DADOS DE AUDITORIA (SUPER ADMINS) ---
  const auditLogs = useMemo(() => {
      // 1. Pega todos os super admins
      const superAdmins = allUsers.filter(u => u.role === 'super_admin' || !u.companyId);
      
      let logs: any[] = [];
      
      superAdmins.forEach(admin => {
          if (admin.logs) {
              admin.logs.forEach(log => {
                  logs.push({
                      ...log,
                      userName: admin.name,
                      userEmail: admin.email
                  });
              });
          }
      });

      // Filter
      return logs.filter(log => {
          const logDate = adjustDateToBrazil(log.timestamp);
          const dateMatch = logDate >= reportStartDate && logDate <= reportEndDate;
          const userMatch = auditUserFilter === 'all' || log.userName === auditUserFilter;
          const searchMatch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              log.details.toLowerCase().includes(searchTerm.toLowerCase());
          
          return dateMatch && userMatch && searchMatch;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  }, [allUsers, reportStartDate, reportEndDate, auditUserFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in p-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h2 className="text-2xl font-bold text-gray-800">Relatórios Gerenciais</h2>
           <p className="text-gray-500">Analise financeira e auditoria de ações administrativas</p>
         </div>
         <button 
           onClick={() => setShowPrintModal(true)}
           className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
         >
           <Printer size={18} /> Imprimir Relatório
         </button>
       </div>

       {/* Tabs */}
       <div className="flex gap-2 border-b border-gray-200">
          <button 
            onClick={() => { setActiveTab('financial'); setSearchTerm(''); }}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'financial' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
          >
            <CreditCard size={16} /> Financeiro
          </button>
          <button 
            onClick={() => { setActiveTab('audit'); setSearchTerm(''); }}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'audit' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-500 hover:text-emerald-600'}`}
          >
            <ShieldCheck size={16} /> Auditoria do Sistema
          </button>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Report Filters */}
          <div className="p-4 border-b border-gray-100 bg-white">
             <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end flex-wrap">
                
                {/* Common Date Filter */}
                <div className="w-full lg:w-auto min-w-[280px]">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Período</label>
                   <div className="flex items-center gap-2">
                      <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium" />
                      <span className="text-gray-400 font-bold">-</span>
                      <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium" />
                   </div>
                </div>

                {activeTab === 'financial' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto flex-1">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><CreditCard size={12}/> Plano</label>
                           <select value={reportPlanFilter} onChange={e => setReportPlanFilter(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                              <option value="all">Todos</option>
                              {plans.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><RotateCw size={12}/> Ciclo</label>
                           <select value={reportCycleFilter} onChange={e => setReportCycleFilter(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                              <option value="all">Todos</option>
                              <option value="monthly">Mensal</option>
                              <option value="annual">Anual</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Filter size={12}/> Status</label>
                           <select value={reportStatusFilter} onChange={e => setReportStatusFilter(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                              <option value="all">Todos</option>
                              <option value="active">Ativos</option>
                              <option value="blocked">Bloq.</option>
                              <option value="suspended">Susp.</option>
                           </select>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="w-full lg:w-auto min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><User size={12}/> Admin</label>
                        <select value={auditUserFilter} onChange={e => setAuditUserFilter(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                            <option value="all">Todos os Admins</option>
                            {Array.from(new Set(allUsers.filter(u => u.role === 'super_admin').map(u => u.name))).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Search */}
                <div className="w-full lg:w-64">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar</label>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                         type="text" 
                         placeholder={activeTab === 'financial' ? "Empresa ou Dono..." : "Ação ou Detalhes..."}
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                         className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* Report Summary */}
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div>
               <p className="text-sm text-emerald-900">
                  Registros Encontrados: <span className="font-bold">{activeTab === 'financial' ? reportData.length : auditLogs.length}</span>
               </p>
             </div>
             {activeTab === 'financial' && (
                <div>
                <p className="text-sm text-emerald-900">
                    Valor Total Contratado: <span className="font-bold text-lg">{reportTotalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                </p>
                </div>
             )}
          </div>

          {/* Tables */}
          <div className="overflow-x-auto">
             
             {/* FINANCIAL TABLE */}
             {activeTab === 'financial' && (
                <table className="w-full text-left text-sm min-w-[800px]">
                    <thead className="bg-white border-b border-gray-200 text-gray-500 uppercase font-bold text-xs sticky top-0">
                    <tr>
                        <th className="p-4">Data Cadastro</th>
                        <th className="p-4">Empresa</th>
                        <th className="p-4">Plano</th>
                        <th className="p-4 text-right">Valor Contrato</th>
                        <th className="p-4 text-center">Ciclo</th>
                        <th className="p-4 text-center">Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {reportData.map(company => {
                        const planConfig = getPlanConfig(company.plan);
                        const price = company.billingCycle === 'annual' ? planConfig.priceAnnual : planConfig.priceMonthly;
                        const isTrial = company.trialEndsAt && new Date(company.trialEndsAt) > new Date();

                        return (
                            <tr key={company.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-600">{new Date(company.createdAt).toLocaleDateString()}</td>
                                <td className="p-4">
                                <span className="font-bold text-gray-800">{company.name}</span>
                                {isTrial && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1 rounded uppercase font-bold">Em Teste</span>}
                                </td>
                                <td className="p-4">{planConfig.name}</td>
                                <td className="p-4 text-right font-mono font-bold text-emerald-700">
                                {isTrial ? 'Grátis' : price.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                </td>
                                <td className="p-4 text-center text-xs uppercase text-gray-500 font-bold">{company.billingCycle === 'annual' ? 'Anual' : 'Mensal'}</td>
                                <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${company.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {company.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                </span>
                                </td>
                            </tr>
                        );
                    })}
                    {reportData.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-gray-400 italic">Nenhum registro encontrado.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
             )}

             {/* AUDIT TABLE */}
             {activeTab === 'audit' && (
                <table className="w-full text-left text-sm min-w-[800px]">
                    <thead className="bg-white border-b border-gray-200 text-gray-500 uppercase font-bold text-xs sticky top-0">
                        <tr>
                            <th className="p-4 w-48">Data / Hora</th>
                            <th className="p-4 w-48">Administrador</th>
                            <th className="p-4 w-48">Ação</th>
                            <th className="p-4">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {auditLogs.map((log, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-4 align-top">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{new Date(log.timestamp).toLocaleDateString()}</span>
                                        <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </td>
                                <td className="p-4 align-top">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                                            {log.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-gray-700">{log.userName}</span>
                                    </div>
                                </td>
                                <td className="p-4 align-top">
                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="p-4 align-top">
                                    <div className="flex items-start gap-2 text-gray-600">
                                        <FileText size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                                        <span className="text-sm font-mono bg-gray-50 p-1.5 rounded w-full border border-gray-100">
                                            {log.details}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {auditLogs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-gray-400 italic">Nenhum registro de auditoria encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             )}
          </div>
       </div>

       {/* PRINT MODAL */}
       {showPrintModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto receipt-modal-overlay backdrop-blur-sm"
          onClick={() => setShowPrintModal(false)}
        >
          <div 
            className="bg-white w-full max-w-4xl mx-auto rounded-xl p-0 relative receipt-content my-auto mt-10 print:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Close Button X (Sticky) */}
             <button 
               onClick={() => setShowPrintModal(false)}
               className="sticky top-2 float-right m-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 no-print z-50 transition-colors shadow-sm"
               title="Fechar"
             >
               <X size={20} />
             </button>

             <div className="p-4 md:p-8">
               <PrintTemplate
                 id="super-admin-report" 
                 title={activeTab === 'financial' ? "Relatório Financeiro SaaS" : "Auditoria do Sistema"}
                 subtitle={`Período: ${new Date(reportStartDate).toLocaleDateString()} a ${new Date(reportEndDate).toLocaleDateString()}`}
                 type="report"
                 summaryCards={activeTab === 'financial' ? [
                    { label: 'Total Contratado', value: reportTotalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}), color: 'text-emerald-700' },
                    { label: 'Novas Empresas', value: reportData.length.toString() }
                 ] : [
                    { label: 'Total de Logs', value: auditLogs.length.toString() }
                 ]}
               >
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm mb-4 border-collapse border border-gray-200 text-left">
                      {activeTab === 'financial' ? (
                          <>
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-2 border border-gray-200">Data</th>
                                    <th className="p-2 border border-gray-200">Empresa</th>
                                    <th className="p-2 border border-gray-200">Plano</th>
                                    <th className="p-2 border border-gray-200 text-right">Valor</th>
                                    <th className="p-2 border border-gray-200 text-center">Ciclo</th>
                                    <th className="p-2 border border-gray-200 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map(company => {
                                    const planConfig = getPlanConfig(company.plan);
                                    const price = company.billingCycle === 'annual' ? planConfig.priceAnnual : planConfig.priceMonthly;
                                    const isTrial = company.trialEndsAt && new Date(company.trialEndsAt) > new Date();

                                    return (
                                    <tr key={company.id}>
                                        <td className="p-2 border border-gray-200">{new Date(company.createdAt).toLocaleDateString()}</td>
                                        <td className="p-2 border border-gray-200 font-bold">{company.name}</td>
                                        <td className="p-2 border border-gray-200 text-xs">
                                            {planConfig.name} {isTrial && '(Teste)'}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-right font-mono">
                                            {isTrial ? 'Grátis' : price.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-center text-xs uppercase">
                                            {company.billingCycle === 'annual' ? 'Anual' : 'Mensal'}
                                        </td>
                                        <td className="p-2 border border-gray-200 text-center text-xs">
                                            {company.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                          </>
                      ) : (
                          <>
                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                    <th className="p-2 border border-gray-200">Data</th>
                                    <th className="p-2 border border-gray-200">Admin</th>
                                    <th className="p-2 border border-gray-200">Ação</th>
                                    <th className="p-2 border border-gray-200">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2 border border-gray-200 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="p-2 border border-gray-200 font-bold">{log.userName}</td>
                                        <td className="p-2 border border-gray-200">{log.action}</td>
                                        <td className="p-2 border border-gray-200 text-xs font-mono">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                          </>
                      )}
                   </table>
                 </div>
               </PrintTemplate>
             </div>
             
             <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 no-print rounded-b-xl">
               <button onClick={() => printElement('super-admin-report')} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg">
                  <Printer size={20} /> Imprimir Agora
               </button>
               <button onClick={() => setShowPrintModal(false)} className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 rounded-lg font-bold hover:bg-gray-50">
                  Fechar
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminReports;
