import React from 'react';
import { useStore } from '../services/store';
import { Wallet, ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Dashboard = () => {
  const { cashBalance, orders, products } = useStore();

  // Calculate Metrics
  const today = new Date().toDateString();
  const todaysOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  
  const dailyBuy = todaysOrders
    .filter(o => o.type === 'buy' && o.status === 'paid')
    .reduce((acc, curr) => acc + curr.totalValue, 0);

  const dailySell = todaysOrders
    .filter(o => o.type === 'sell' && o.status === 'paid')
    .reduce((acc, curr) => acc + curr.totalValue, 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  // Chart Data: Stock Value Estimation
  const chartData = products.map(p => ({
    name: p.name,
    valor: Math.round(p.stock * p.buyPrice)
  })).sort((a, b) => b.valor - a.valor).slice(0, 5);

  // Sort products by Critical Status priority (Critical first, then High, then Normal)
  const sortedStock = [...products].sort((a, b) => {
    const aRatio = a.stock <= a.minStock ? 0 : (a.stock >= a.maxStock ? 2 : 1);
    const bRatio = b.stock <= b.minStock ? 0 : (b.stock >= b.maxStock ? 2 : 1);
    return aRatio - bRatio; // 0 comes first (Critical)
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
          <p className="text-gray-500">Resumo da operação do dia</p>
        </div>
        <span className="text-sm bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-medium">
          {new Date().toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Saldo em Caixa" 
          value={`R$ ${cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          color="emerald"
          subtext="Disponível para operações"
        />
        <StatCard 
          title="Compras Hoje" 
          value={`R$ ${dailyBuy.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowDownLeft}
          color="rose"
          subtext="Saída de caixa"
        />
        <StatCard 
          title="Vendas Hoje" 
          value={`R$ ${dailySell.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowUpRight}
          color="blue"
          subtext="Entrada de caixa"
        />
        <StatCard 
          title="Pedidos Pendentes" 
          value={pendingOrders.toString()}
          icon={AlertTriangle}
          color="amber"
          subtext="Aguardando caixa"
        />
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Valor em Estoque (Top 5 Produtos)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  cursor={{fill: '#f0fdf4'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar name="Valor Estimado (R$)" dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Stock Levels */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Níveis de Estoque</h3>
          <div className="flex-1 overflow-y-auto pr-2">
            <ul className="space-y-3">
              {sortedStock.slice(0, 8).map(product => {
                let statusColor = 'text-emerald-600 bg-emerald-50';
                let statusText = 'Normal';

                if (product.stock <= product.minStock) {
                  statusColor = 'text-red-600 bg-red-50';
                  statusText = 'Crítico';
                } else if (product.stock >= product.maxStock) {
                  statusColor = 'text-blue-600 bg-blue-50';
                  statusText = 'Alto';
                }

                return (
                  <li key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${statusColor}`}>
                            {statusText}
                         </span>
                         <span className="text-xs text-gray-500">Min: {product.minStock}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-800">
                        {product.stock} {product.unit}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;