
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Recycle, CheckCircle, Database, Printer, BarChart3, ArrowRight, ChevronDown, Star, Leaf, ArrowDownLeft, ArrowUpRight, Users, X, ZoomIn, Play, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

const LandingPage = () => {
  const [pricingMode, setPricingMode] = useState<'monthly' | 'annual'>('monthly');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const location = useLocation();

  // Scroll handler on load from other pages (e.g., Login)
  useEffect(() => {
    if (location.state && (location.state as any).scrollTo === 'planos') {
       const section = document.getElementById('planos');
       if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
       }
    }
  }, [location]);

  // Scroll handler to prevent HashRouter interference on local links
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const faqs = [
    {
      question: "O que é o Sucata Fácil?",
      answer: "O Sucata Fácil é um sistema online (em nuvem) e aplicativo para gestão completa de reciclagem e sucata, permitindo controlar compras, vendas, caixa e estoque, fornecedores, clientes e emitir recibos de forma rápida e profissional."
    },
    {
      question: "Posso cancelar minha assinatura quando quiser?",
      answer: "Sim. Não exigimos fidelidade nos planos você pode cancelar a qualquer momento ou parar de pagar, sem surpresas, sem taxas ou multas."
    },
    {
      question: "Posso mudar de plano?",
      answer: "Sim! Você pode fazer upgrade (para ter mais usuários) a qualquer momento."
    },
    {
      question: "Quais são as formas de pagamento da assinatura?",
      answer: "Aceitamos PIX, Boleto Bancário e Cartão de Crédito. No plano anual, oferecemos a opção de parcelamento em até 6x no cartão de crédito. A liberação para pagamentos via PIX e Cartão é imediata."
    },
    {
      question: "Como recebo as faturas e comprovantes?",
      answer: "Todas as faturas são enviadas automaticamente para o seu e-mail e WhatsApp cadastrado antes do vencimento."
    },
    {
      question: "Quando o caixa dá baixa no pedido, o estoque atualiza automaticamente?",
      answer: "Sim! Ao pagar um fornecedor, o estoque aumenta; ao concluir uma venda, o estoque diminui e o caixa registra automaticamente."
    },
    {
      question: "Preciso instalar algo no computador?",
      answer: "Não! Além de aplicativo o Sucata Fácil é 100% online (em nuvem). Você pode acessar pelo computador, tablet ou celular, de qualquer lugar, sem precisar baixar nada."
    },
    {
      question: "O sistema possui sistema de impressão de recibos e relatórios?",
      answer: "Perfeitamente. O sistema gera pedidos e relatórios para impressoras térmicas de 80mm, além de impressoras A4 comuns."
    },
    {
      question: "Quantos usuários posso cadastrar?",
      answer: "Depende do plano escolhido — você pode ter desde um usuário único até múltiplos acessos com permissões diferentes (ex.: administrador, caixa, comprador, financeiro)."
    },
    {
      question: "O sistema registra o faturamento diário e mensal?",
      answer: "Sim. Há dashboards com gráficos e relatórios automáticos de compras, vendas, saldo do caixa e estoque."
    },
    {
      question: "Meu estoque é atualizado automaticamente?",
      answer: "Sim. Toda compra adiciona ao estoque e toda venda subtrai, sem precisar alterar manualmente."
    },
    {
      question: "Posso controlar diferentes tipos de materiais recicláveis?",
      answer: "Sim. Você pode cadastrar alumínio, cobre, ferro, plástico, papelão e qualquer material que sua empresa trabalhe. O sistema calcula automaticamente peso, unidade e valor."
    },
    {
      question: "O sistema registra histórico de compras e vendas?",
      answer: "Sim. Todo pedido de compra ou venda fica salvo, permitindo consultar qualquer transação antiga com data, valores, peso, fornecedor ou cliente."
    },
    {
      question: "O Sucata Fácil tem controle de caixa diário?",
      answer: "Sim. Você acompanha entradas, saídas, pagamentos, recebimentos e saldo final do dia, tudo automático e com relatórios, podendo abrir mais de um caixa por dia."
    },
    {
      question: "Tem Controle de permissões para cada usuário?",
      answer: "Sim. Cada usuário tem um nível de acesso pré-definido automaticamente podendo mudar conforme , como administrador, gerente, operador de caixa, comprador, vendedor ou financeiro."
    },
    {
      question: "Posso emitir relatórios completos para auditoria ou conferência?",
      answer: "Sim. O sistema gera relatórios de estoque, faturamento, compras, vendas, diário de caixa e movimentações separadas por usuário."
    },
    {
      question: "Consigo usar o Sucata Fácil para mais de uma unidade da empresa?",
      answer: "Não. O sistema ainda não consegue gerenciar as unidades e controlar fluxos separados de estoque e caixa. (mais em breve estamos em desenvolvimento)"
    },
    {
      question: "O sistema calcula automaticamente o valor da sucata pelo peso?",
      answer: "Sim. Basta informar o peso por quilo/unidade; o sistema faz o cálculo na mesma hora e gera o pedido automaticamente."
    },
    {
      question: "Meus dados estão seguros?",
      answer: "Sim. Utilizamos servidores de última geração com criptografia de ponta a ponta. Além disso, o plano Profissional e Premium contam com backups automáticos diários."
    },
    {
      question: "Como funciona o suporte do Sucata Fácil?",
      answer: "Depende do plano escolhido. Você pode solicitar suporte por WhatsApp, e-mail ou chat dentro do sistema, com atendimento rápido e direto."
    }
  ];

  // Componente interno para o Mockup Visual (Usado na pagina e no lightbox)
  const DashboardMockupVisual = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
    
    // Gera automaticamente um array de 16 imagens: ["/1.png", "/2.png", ... "/16.png"]
    const slides = useMemo(() => Array.from({ length: 16 }, (_, i) => `/${i + 1}.png`), []);

    const nextSlide = useCallback(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, [slides.length]);

    const prevSlide = useCallback(() => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }, [slides.length]);

    const handleImageError = (index: number) => {
        setImageErrors(prev => ({ ...prev, [index]: true }));
    };

    useEffect(() => {
        const interval = setInterval(nextSlide, 8000);
        return () => clearInterval(interval);
    }, [nextSlide]);

    return (
        <div className="w-full h-full relative overflow-hidden bg-transparent group/slider">
            <div className="relative flex text-left flex-1 w-full h-full overflow-hidden">
                <div 
                    className="flex w-full h-full transition-transform duration-1000 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {slides.map((src, index) => (
                        <div key={index} className="w-full h-full flex-shrink-0 flex items-center justify-center">
                            {!imageErrors[index] ? (
                                <img 
                                    src={src}
                                    alt={`Apresentação Slide ${index + 1}`} 
                                    className="w-full h-auto max-h-full object-contain"
                                    onError={() => handleImageError(index)}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400 bg-gray-50/10 w-full h-full rounded-xl border border-white/10">
                                    <ImageOff size={48} className="mb-2 opacity-50" />
                                    <p className="text-sm">Imagem {index + 1} não encontrada</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Arrows */}
            <button 
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white transition-all opacity-0 group-hover/slider:opacity-100 z-20"
                title="Anterior"
            >
                <ChevronLeft size={32} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white transition-all opacity-0 group-hover/slider:opacity-100 z-20"
                title="Próximo"
            >
                <ChevronRight size={32} />
            </button>
        </div>
    );
  };

  return (
    <div className="font-sans text-gray-900 bg-white min-h-screen scroll-smooth">
      
      {/* Lightbox Modal (Image) */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsLightboxOpen(false)}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white z-50 p-2 bg-white/10 rounded-full">
                <X size={32} />
            </button>
            <div className="w-full h-full relative p-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <DashboardMockupVisual />
            </div>
        </div>
      )}

      {/* Video Modal (YouTube) */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsVideoModalOpen(false)}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white z-50 p-2 bg-white/10 rounded-full">
                <X size={32} />
            </button>
            <div className="w-full max-w-5xl aspect-video relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800" onClick={e => e.stopPropagation()}>
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/yCiL3eT64Sk?autoplay=1" 
                    title="Apresentação Sucata Fácil" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                ></iframe>
            </div>
        </div>
      )}

      {/* Navbar Glass */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={scrollToTop} title="Voltar ao topo">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                        <Recycle size={24} />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-900">Sucata Fácil</span>
                </div>
                
                <div className="hidden md:flex items-center gap-8">
                    <a 
                      href="#funcionalidades" 
                      onClick={(e) => scrollToSection(e, 'funcionalidades')}
                      className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      Funcionalidades
                    </a>
                    <a 
                      href="#planos" 
                      onClick={(e) => scrollToSection(e, 'planos')}
                      className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      Preços
                    </a>
                    <a 
                      href="#faq" 
                      onClick={(e) => scrollToSection(e, 'faq')}
                      className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      Dúvidas
                    </a>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/login" className="text-sm font-bold text-gray-700 hover:text-emerald-600">Entrar</Link>
                    <a 
                      href="#planos" 
                      onClick={(e) => scrollToSection(e, 'planos')}
                      className="hidden sm:flex bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 hover:shadow-lg cursor-pointer"
                    >
                        Começar Grátis
                    </a>
                </div>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 via-gray-950 to-black">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-soft-light"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-overlay filter blur-[120px] opacity-20 animate-pulse"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-emerald-300 text-sm font-medium mb-8">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Novo: Módulo de Balanço e Auditoria
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                O Sistema Operacional para <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">Reciclagem Moderna</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                Abandone as planilhas e cadernos. Controle compras, vendas, caixa e estoque em uma plataforma segura, simples e feita para quem lucra com reciclagem.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 flex-wrap">
                <a 
                  href="#planos" 
                  onClick={(e) => scrollToSection(e, 'planos')}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                    Criar Conta Grátis
                    <ArrowRight size={20} />
                </a>
                
                {/* NEW VIDEO BUTTON */}
                <button 
                  onClick={() => setIsVideoModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white border border-red-500/50 hover:bg-red-500/20 hover:border-red-500 transition-all flex items-center justify-center gap-3 group"
                >
                    <div className="bg-red-600 rounded-full p-1 group-hover:scale-110 transition-transform shadow-lg shadow-red-900/50">
                        <Play size={16} fill="white" className="text-white ml-0.5" />
                    </div>
                    Veja Apresentação
                </button>

                <a 
                  href="#funcionalidades" 
                  onClick={(e) => scrollToSection(e, 'funcionalidades')}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white border border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                    Ver como funciona
                </a>
            </div>

            {/* Slider Mockup Container (CLEAN - No Borders) */}
            <div className="relative max-w-6xl mx-auto group">
                {/* Zoom Hint */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/10 text-white px-3 py-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 pointer-events-none">
                    <ZoomIn size={14} /> Clique para ampliar
                </div>

                {/* Main Mockup Wrapper */}
                <div 
                    className="relative cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]"
                    onClick={() => setIsLightboxOpen(true)}
                >
                    {/* Mantém aspect ratio mas remove bordas */}
                    <div className="w-full aspect-[16/9] relative z-10">
                        <DashboardMockupVisual />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Trust Badge Section */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Confiança de quem lidera o mercado</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="flex items-center gap-2 font-bold text-xl text-gray-800"><div className="w-6 h-6 bg-gray-800 rounded"></div> ReciclaMais</div>
                <div className="flex items-center gap-2 font-bold text-xl text-gray-800"><div className="w-6 h-6 bg-gray-800 rounded"></div> FerroNorte</div>
                <div className="flex items-center gap-2 font-bold text-xl text-gray-800"><div class="w-6 h-6 bg-gray-800 rounded"></div> EcoMetal</div>
                <div className="flex items-center gap-2 font-bold text-xl text-gray-800"><div className="w-6 h-6 bg-gray-800 rounded"></div> SucataSul</div>
            </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="funcionalidades" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-sm mb-2">Tudo em um só lugar</h2>
                <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Funcionalidades poderosas, design simples.</h3>
                <p className="text-gray-500 text-lg">Desenvolvemos cada ferramenta pensando no dia a dia real de um depósito de reciclagem.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Feature 1 - Large */}
                <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                            <BarChart3 size={24} />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">Controle Financeiro Completo</h4>
                        <p className="text-gray-500 max-w-md">Fechamento de caixa cego, controle de sangrias, despesas e fluxo de pagamentos. Saiba exatamente quanto entra e sai.</p>
                    </div>
                    <div className="absolute right-0 bottom-0 w-1/3 h-2/3 bg-blue-50 rounded-tl-3xl group-hover:scale-105 transition-transform duration-500"></div>
                </div>

                {/* Feature 2 - Small */}
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                        <Database size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Estoque em Tempo Real</h4>
                    <p className="text-gray-500 text-sm">Controle por KG ou Unidade. Saiba seu custo médio e margem de lucro instantaneamente.</p>
                </div>

                {/* Feature 2.1 - Compra Rápida (Pequeno) */}
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                        <ArrowDownLeft size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Compra Rápida</h4>
                    <p className="text-gray-500 text-sm">Selecione o material, digite o peso e pronto. O valor é calculado na hora.</p>
                </div>

                {/* Feature 2.2 - Venda Inteligente (Largo) */}
                <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <ArrowUpRight size={24} />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">Venda Inteligente</h4>
                        <p className="text-gray-500 max-w-md">Monte a carga e finalize. O sistema gera o recibo e lança no caixa automaticamente. Agilidade para não formar filas.</p>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                </div>

                {/* Feature 4 - Large */}
                <div className="md:col-span-2 bg-emerald-900 rounded-3xl p-8 border border-emerald-800 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-800 rounded-xl flex items-center justify-center text-emerald-300 mb-6">
                            <Printer size={24} />
                        </div>
                        <h4 className="text-2xl font-bold text-white mb-2">Impressão de Recibos e Relatórios</h4>
                        <p className="text-emerald-200/80 max-w-md">Compatível com impressoras térmicas (80mm) e impressoras comuns em folha A4. Gere comprovantes de compra e venda com 1 clique.</p>
                    </div>
                    <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-800 to-transparent opacity-30"></div>
                </div>

                {/* Feature 3 - Small */}
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-6">
                        <Users size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Múltiplos Usuários</h4>
                    <p className="text-gray-500 text-sm">Defina o que cada funcionário pode ver. Operador de caixa não vê lucro, por exemplo.</p>
                </div>

            </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="planos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-black text-gray-900 mb-4">Planos Transparentes</h2>
                <p className="text-lg text-gray-500 mb-2">Sem fidelidade. Sem taxas escondidas. Todos incluem 15 dias grátis.</p>
                
                <p className="text-4xl md:text-5xl font-black text-emerald-500 uppercase tracking-widest animate-pulse mb-8">
                    TESTE GRÁTIS
                </p>
                
                {/* Toggle */}
                <div className="inline-flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setPricingMode('monthly')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${pricingMode === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                      Mensal
                    </button>
                    <button 
                      onClick={() => setPricingMode('annual')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${pricingMode === 'annual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                      Anual <span className="text-orange-500 ml-1 bg-orange-100 px-1.5 py-0.5 rounded text-[10px]">-33%</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
                
                {/* Plan 1: Essencial */}
                <div className="p-6 rounded-2xl border-2 border-emerald-300 lg:border lg:border-gray-200 bg-white lg:hover:border-2 lg:hover:border-emerald-500 hover:shadow-emerald-100 transition-all hover:-translate-y-2 duration-300 h-full flex flex-col relative overflow-hidden group">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Essencial</h3>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">Para pequenos depósitos e iniciantes.</p>
                    <div className="mb-6">
                        <p className="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-2">Teste Grátis por 15 Dias</p>
                        <span className="text-3xl font-extrabold text-gray-900">
                           R$ {pricingMode === 'monthly' ? '49,90' : '399,90'}
                        </span>
                        <span className="text-gray-400 text-[10px] font-medium block mt-1">
                           {pricingMode === 'monthly' ? '/mês' : '(em até 6x de R$66,67 sem juros no cartão)'}
                        </span>
                        {pricingMode === 'monthly' && (
                          <p className="text-sm font-bold text-emerald-600 mt-2">(não necessita de cartões de crédito)</p>
                        )}
                        <p className="text-sm font-extrabold text-emerald-500 mt-1 animate-pulse uppercase tracking-wide">pague quando quiser usar</p>
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-gray-600 font-medium flex-1">
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> 1 Usuário</li>
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Backup Manual</li>
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Suporte por E-mail</li>
                    </ul>
                    <Link to="/login" state={{ plan: 'essential', cycle: pricingMode }} className="block w-full py-3 bg-emerald-600 text-white font-bold rounded-lg text-center hover:bg-emerald-700 transition-colors text-sm shadow-md shadow-emerald-200">Teste Grátis 15 Dias</Link>
                    {pricingMode === 'monthly' && (
                      <p className="text-[10px] text-gray-400 text-center mt-2">(não necessita de cartões de crédito)</p>
                    )}
                </div>

                {/* Plan 2: Profissional (Featured) */}
                <div className="p-6 rounded-2xl border-2 border-blue-500 bg-white shadow-xl hover:shadow-2xl hover:-translate-y-6 transition-all duration-300 h-full flex flex-col relative transform md:-translate-y-4 lg:border-2 lg:border-blue-500 lg:hover:border-blue-600">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md z-20">Mais Vendido</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 mt-2">Profissional</h3>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">Ideal para empresas em crescimento.</p>
                    <div className="mb-6">
                        <p className="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-2">Teste Grátis por 15 Dias</p>
                        <span className="text-4xl font-extrabold text-blue-700">
                           R$ {pricingMode === 'monthly' ? '99,90' : '799,90'}
                        </span>
                        <span className="text-gray-400 text-[10px] font-medium block mt-1">
                           {pricingMode === 'monthly' ? '/mês' : '(em até 6x de R$133,32 sem juros no cartão)'}
                        </span>
                        {pricingMode === 'monthly' && (
                          <p className="text-sm font-bold text-blue-600 mt-2">(não necessita de cartões de crédito)</p>
                        )}
                        <p className="text-sm font-extrabold text-blue-500 mt-1 animate-pulse uppercase tracking-wide">pague quando quiser usar</p>
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-gray-700 font-bold flex-1">
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500" /> 3 Usuários</li>
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500" /> Backup Automático</li>
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500" /> Suporte Prioritário</li>
                    </ul>
                    <Link to="/login" state={{ plan: 'professional', cycle: pricingMode }} className="block w-full py-3 bg-blue-600 text-white font-bold rounded-lg text-center hover:bg-blue-700 transition-colors text-sm shadow-md shadow-blue-200">Teste Grátis 15 Dias</Link>
                    {pricingMode === 'monthly' && (
                      <p className="text-[10px] text-gray-400 text-center mt-2">(não necessita de cartões de crédito)</p>
                    )}
                </div>

                {/* Plan 3: Premium */}
                <div className="p-6 rounded-2xl border-2 border-purple-300 lg:border lg:border-gray-200 bg-white lg:hover:border-2 lg:hover:border-purple-500 hover:shadow-purple-100 transition-all hover:-translate-y-2 duration-300 h-full flex flex-col relative overflow-hidden group">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-1">Premium <Star size={14} className="text-orange-400 fill-orange-400" /></h3>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">Para grandes operações e redes.</p>
                    <div className="mb-6">
                        <p className="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-2">Teste Grátis por 15 Dias</p>
                        <span className="text-3xl font-extrabold text-purple-700">
                           R$ {pricingMode === 'monthly' ? '149,90' : '1.199,90'}
                        </span>
                        <span className="text-gray-400 text-[10px] font-medium block mt-1">
                           {pricingMode === 'monthly' ? '/mês' : '(em até 6x de R$199,99 sem juros no cartão)'}
                        </span>
                        {pricingMode === 'monthly' && (
                          <p className="text-sm font-bold text-purple-600 mt-2">(não necessita de cartões de crédito)</p>
                        )}
                        <p className="text-sm font-extrabold text-purple-500 mt-1 animate-pulse uppercase tracking-wide">pague quando quiser usar</p>
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-gray-600 font-medium flex-1">
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-500" /> Usuários Ilimitados</li>
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-500" /> Backup Automático</li>
                        <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-500" /> Suporte WhatsApp VIP</li>
                    </ul>
                    <Link to="/login" state={{ plan: 'premium', cycle: pricingMode }} className="block w-full py-3 bg-purple-600 text-white font-bold rounded-lg text-center hover:bg-purple-700 transition-colors text-sm shadow-md shadow-purple-200">Teste Grátis 15 Dias</Link>
                    {pricingMode === 'monthly' && (
                      <p className="text-[10px] text-gray-400 text-center mt-2">(não necessita de cartões de crédito)</p>
                    )}
                </div>

            </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-12">Perguntas Frequentes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {faqs.map((item, index) => (
                  <details key={index} className="bg-white p-6 rounded-2xl border border-gray-200 cursor-pointer group hover:border-emerald-300 transition-colors h-fit">
                      <summary className="font-bold text-gray-900 flex justify-between items-start list-none">
                          <span className="pr-4">{item.question}</span>
                          <ChevronDown className="text-emerald-600 group-open:rotate-180 transition-transform flex-shrink-0" />
                      </summary>
                      <p className="text-gray-600 mt-4 leading-relaxed text-sm">
                          {item.answer}
                      </p>
                  </details>
                ))}
            </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="bg-emerald-900 py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Pronto para profissionalizar sua gestão?</h2>
            <p className="text-emerald-200 text-lg mb-10">Junte-se a centenas de empresas que já modernizaram seus centros de reciclagem.</p>
            <a 
              href="#planos" 
              onClick={(e) => scrollToSection(e, 'planos')}
              className="inline-block bg-white text-emerald-900 px-10 py-5 rounded-xl font-bold text-xl hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 cursor-pointer"
            >
                Começar Teste Grátis
            </a>
            <p className="text-emerald-400/60 text-2xl mt-6 font-medium">Teste de 15 dias • Sem compromisso</p>
        </div>
    </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={scrollToTop} title="Voltar ao topo">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                    <Recycle size={20} />
                </div>
                <span className="font-bold text-gray-900">Sucata Fácil</span>
            </div>
            <div className="text-sm text-gray-500">
                &copy; 2024 Sucata Fácil Tecnologia. Feito para o Brasil.
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
