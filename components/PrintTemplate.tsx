
import React from 'react';
import { Recycle } from 'lucide-react';

interface PrintTemplateProps {
  title: string;
  subtitle?: string;
  type: 'receipt' | 'report' | 'balance';
  format?: 'thermal' | 'a4'; // Novo formato suportado
  details?: { label: string; value: string | number | undefined; highlight?: boolean; fullWidth?: boolean }[];
  children: React.ReactNode;
  summaryCards?: { label: string; value: string; color?: string }[];
  id?: string; // ID para o sistema de impressão via Iframe
}

// Utilitário de Impressão Robusta (Mobile Friendly)
export const printElement = (elementId: string) => {
  const content = document.getElementById(elementId);
  if (!content) {
    console.error('Elemento para impressão não encontrado:', elementId);
    return;
  }

  // DETECÇÃO DE MOBILE
  // Em dispositivos móveis, a impressão via Iframe oculto frequentemente falha ou sai em branco.
  // A melhor abordagem é imprimir a janela atual, confiando no CSS @media print (já configurado no index.html)
  // para ocultar tudo exceto o modal do recibo.
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    window.print();
    return;
  }

  // --- LÓGICA DESKTOP (IFRAME ISOLADO) ---
  // Cria um iframe oculto
  const iframe = document.createElement('iframe');
  
  // Ajuste CSS para Desktop: Não usar display:none, mas sim mover para fora da tela
  // Isso garante que o navegador renderize os estilos antes de imprimir
  iframe.style.position = 'fixed';
  iframe.style.right = '-9999px';
  iframe.style.bottom = '0';
  iframe.style.width = '210mm'; // Largura A4 padrão para garantir quebras corretas
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-1'; 
  
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  // Clona o head para pegar scripts (Tailwind) e estilos
  const headContent = document.head.innerHTML;
  
  doc.open();
  doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
          <head>
              ${headContent}
              <style>
                  body { 
                    background: white; 
                    margin: 0; 
                    padding: 0; 
                    font-family: ui-sans-serif, system-ui, sans-serif;
                  }
                  /* Garante que o conteúdo ocupe a largura correta */
                  #root-print { width: 100%; }
                  
                  /* Força visibilidade total */
                  * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  
                  /* Esconde elementos marcados como no-print */
                  .no-print { display: none !important; }
              </style>
          </head>
          <body>
              <div id="root-print">
                ${content.outerHTML}
              </div>
              <script>
                  // Aguarda um momento para o Tailwind processar os estilos no novo documento
                  window.onload = () => {
                      setTimeout(() => {
                          window.focus();
                          window.print();
                      }, 800); // Delay para garantir renderização de fontes/estilos
                  };
              </script>
          </body>
      </html>
  `);
  doc.close();
  
  // Remove o iframe após um tempo suficiente para o dialog de impressão abrir
  setTimeout(() => {
      document.body.removeChild(iframe);
  }, 10000); 
};

const PrintTemplate: React.FC<PrintTemplateProps> = ({ 
  title, 
  subtitle, 
  type, 
  format = 'a4', // Default para A4 se não especificado
  details, 
  children,
  summaryCards,
  id
}) => {
  const currentDate = new Date().toLocaleString('pt-BR');

  // --- LAYOUT TÉRMICO (CUPOM 80mm) ---
  if (format === 'thermal') {
    return (
      <div id={id} className="print-thermal w-full max-w-[300px] mx-auto bg-white text-black font-mono text-xs leading-tight p-2">
        {/* Cabeçalho Centralizado */}
        <div className="text-center mb-2 pb-2 border-b border-dashed border-black">
           <div className="flex justify-center mb-1">
              <Recycle size={24} className="text-black" />
           </div>
           <h1 className="text-sm font-extrabold uppercase text-black">Sucata Fácil</h1>
           <p className="text-[10px] text-black">Gestão de Reciclagem</p>
           <p className="text-[10px] mt-1 text-black">Emissão: {currentDate}</p>
        </div>

        {/* Título da Operação */}
        <div className="text-center mb-2">
           <h2 className="text-sm font-bold uppercase border-b border-black inline-block px-2 text-black">{title}</h2>
           {subtitle && <p className="text-[10px] mt-1 text-black">{subtitle}</p>}
        </div>

        {/* Detalhes (Lista Simples) */}
        {details && details.length > 0 && (
          <div className="mb-2 border-b border-dashed border-black pb-2">
            {details.map((detail, idx) => (
              <div key={idx} className="flex justify-between items-start mb-1">
                 <span className="font-bold mr-2 text-black">{detail.label}:</span>
                 <span className={`text-right break-all text-black ${detail.highlight ? 'font-extrabold' : ''}`}>{detail.value || '-'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conteúdo Principal (Tabela simplificada via CSS print-thermal) */}
        <div className="mb-2">
           {children}
        </div>

        {/* Totais (Alinhados à direita) */}
        {summaryCards && summaryCards.length > 0 && (
          <div className="mb-4 pt-2 border-t border-dashed border-black">
             {summaryCards.map((card, idx) => (
               <div key={idx} className="flex justify-between items-center text-sm mb-1">
                 <span className="font-bold text-black">{card.label}:</span>
                 <span className="font-extrabold text-base text-black">{card.value}</span>
               </div>
             ))}
          </div>
        )}

        {/* Assinaturas (Vertical) */}
        {type === 'receipt' && (
          <div className="mt-6 pt-4 text-center">
             <div className="border-t border-black w-3/4 mx-auto mb-1"></div>
             <p className="text-[10px] mb-6 text-black">Assinatura Responsável</p>
             
             <div className="border-t border-black w-3/4 mx-auto mb-1"></div>
             <p className="text-[10px] text-black">Assinatura Cliente</p>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center mt-4 text-[9px] text-black">
           <p>*** NÃO É DOCUMENTO FISCAL ***</p>
           <p>Sistema Sucata Fácil - v2.0</p>
        </div>
      </div>
    );
  }

  // --- LAYOUT A4 (DOCUMENTO PADRÃO) ---
  return (
    <div id={id} className="print-a4 w-full max-w-none bg-white text-gray-900 font-sans leading-relaxed print-container flex flex-col text-sm p-4">
      
      {/* Cabeçalho Corporativo */}
      <div className="flex flex-row justify-between items-center border-b-2 border-gray-800 pb-4 mb-4 print:mb-2">
        <div className="flex items-center gap-4">
          <div className="text-emerald-900 print:text-black">
            <Recycle size={42} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-tight leading-none">Sucata Fácil</h1>
            <span className="text-xs font-bold text-gray-500 tracking-widest mt-1 uppercase">Gestão de Reciclagem</span>
          </div>
        </div>

        <div className="text-right text-xs text-gray-600 leading-snug">
          <p className="font-bold">SUCATA FÁCIL LTDA</p>
          <p>Sistema de Gestão Integrada</p>
          <p>suporte@sucatafacil.com</p>
        </div>
      </div>

      {/* Box Título */}
      <div className="border border-gray-400 rounded-sm mb-6 overflow-hidden print:border-gray-800">
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex justify-between items-center print:bg-gray-200 print:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-800 uppercase">{title}</h2>
            {subtitle && <span className="text-xs text-gray-600 uppercase font-medium">{subtitle}</span>}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase">Emissão</p>
            <p className="text-xs font-bold text-gray-800">{currentDate}</p>
          </div>
        </div>

        {/* Grid Detalhes */}
        {details && details.length > 0 && (
          <div className="grid grid-cols-12 divide-y divide-gray-200 print:divide-gray-400 bg-white">
            {details.map((detail, idx) => {
              const colSpan = detail.fullWidth ? 'col-span-12' : 'col-span-6 md:col-span-3 print:col-span-3';
              return (
                <div key={idx} className={`${colSpan} p-2 border-r border-gray-200 last:border-r-0 print:border-gray-400 flex flex-col justify-center`}>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                    {detail.label}
                  </span>
                  <span className={`text-sm font-semibold truncate ${detail.highlight ? 'text-black' : 'text-gray-800'}`}>
                    {detail.value || '-'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="mb-4 min-h-[100px]">
        {children}
      </div>

      {/* Totais */}
      {summaryCards && summaryCards.length > 0 && (
        <div className="flex justify-end mb-8 print:mb-4">
          <div className="w-full md:w-1/2 print:w-1/2 border border-gray-400 rounded-sm overflow-hidden print:border-gray-800">
             {summaryCards.map((card, idx) => (
               <div key={idx} className="flex justify-between items-center p-2 border-b border-gray-300 last:border-0 bg-gray-50 print:bg-white">
                 <span className="text-xs font-bold text-gray-600 uppercase">{card.label}</span>
                 <span className={`text-lg font-bold ${card.color || 'text-gray-900'}`}>{card.value}</span>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Assinatura */}
      {type === 'receipt' && (
        <div className="mt-auto pt-8 pb-4 avoid-break">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-b border-black mb-2"></div>
              <p className="text-[10px] font-bold text-gray-600 uppercase">Assinatura do Responsável</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-2"></div>
              <p className="text-[10px] font-bold text-gray-600 uppercase">Assinatura do Parceiro</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-300 pt-2 text-center text-[9px] text-gray-500 mt-4">
        <p>Documento para controle interno sem valor fiscal. Sistema Sucata Fácil v2.0</p>
      </div>
    </div>
  );
};

export default PrintTemplate;
