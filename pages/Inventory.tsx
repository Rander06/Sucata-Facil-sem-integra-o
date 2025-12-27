
import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Product, UnitType, UserPermissions } from '../types';
import { Plus, Search, Edit2, Trash2, AlertCircle, CheckCircle, AlertTriangle, Eye, X, History, ArrowDownLeft, ArrowUpRight, Truck, User, Clock, XCircle, Lock } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import MasterPasswordModal from '../components/ui/MasterPasswordModal';

const Inventory = () => {
  const { products, addProduct, updateProduct, deleteProduct, orders, partners, checkPermission } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteModal, setDeleteModal] = useState<{open: boolean, product: Product | null}>({ open: false, product: null });
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  
  // Validation State
  const [formError, setFormError] = useState('');
  
  // Master Password State
  const [masterAuth, setMasterAuth] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    title?: string;
    logDetails?: string;
    requiredPermission?: keyof UserPermissions;
  }>({ isOpen: false, pendingAction: null });

  // Form State - Inicializado com Strings VAZIAS para forçar validação
  const [formData, setFormData] = useState<{
    name: string, 
    buyPrice: string, 
    sellPrice: string, 
    unit: UnitType, 
    stock: string,
    minStock: string,
    maxStock: string
  }>({
    name: '', buyPrice: '', sellPrice: '', unit: 'kg', stock: '', minStock: '', maxStock: ''
  });

  // LÓGICA DE EXIBIÇÃO: TOP 10 MAIS MOVIMENTADOS
  const displayedProducts = useMemo(() => {
    // 1. Se tiver busca, filtra pelo nome e mostra TUDO que encontrar
    if (searchTerm) {
      return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 2. Se não tiver busca, calcula relevância baseada em movimentações (pedidos)
    const productUsage: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        productUsage[item.productId] = (productUsage[item.productId] || 0) + 1;
      });
    });

    // 3. Ordena por uso (descendente) e pega top 10
    return [...products]
      .sort((a, b) => (productUsage[b.id] || 0) - (productUsage[a.id] || 0))
      .slice(0, 10);
  }, [products, searchTerm, orders]);

  // Histórico do Produto Visualizado
  const productHistory = useMemo(() => {
    if (!viewingProduct) return [];
    return orders
      .filter(o => o.items.some(item => item.productId === viewingProduct.id))
      .map(order => {
        const item = order.items.find(i => i.productId === viewingProduct.id)!;
        return {
          ...order,
          itemQuantity: item.quantity,
          itemPrice: item.priceAtMoment,
          itemTotal: item.quantity * item.priceAtMoment
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [viewingProduct, orders]);

  // Wrap Critical Actions
  const requestAuth = (action: () => void, title: string, logDetails: string, requiredPermission?: keyof UserPermissions) => {
    setMasterAuth({ isOpen: true, pendingAction: action, title, logDetails, requiredPermission });
  };

  const handleOpenModal = (product?: Product) => {
    const open = () => {
      setFormError(''); // Limpa erros anteriores
      if (product) {
        setEditingProduct(product);
        setFormData({
          name: product.name,
          buyPrice: product.buyPrice.toString(),
          sellPrice: product.sellPrice.toString(),
          unit: product.unit,
          stock: product.stock.toString(),
          minStock: (product.minStock !== undefined ? product.minStock.toString() : '0'),
          maxStock: (product.maxStock !== undefined ? product.maxStock.toString() : '0')
        });
      } else {
        setEditingProduct(null);
        // Limpa campos para forçar digitação (String vazia)
        setFormData({ name: '', buyPrice: '', sellPrice: '', unit: 'kg', stock: '', minStock: '', maxStock: '' });
      }
      setIsModalOpen(true);
    };

    if (product) {
      // SEMPRE PEDIR SENHA PARA EDITAR
      const details = `Produto: ${product.name} | ID: ${product.id} | Estoque: ${product.stock}${product.unit} | Preço Compra: R$${product.buyPrice}`;
      requestAuth(open, 'Editar Produto', details, 'edit_product');
    } else {
      // Se for criar novo
      if (checkPermission('manage_inventory')) {
        open();
      } else {
        alert("Você não tem permissão para cadastrar novos produtos.");
      }
    }
  };

  const confirmDelete = () => {
    if (deleteModal.product) {
      const p = deleteModal.product;
      const doDelete = () => {
         deleteProduct(deleteModal.product!.id);
         setDeleteModal({ open: false, product: null });
      };

      // SEMPRE PEDIR SENHA PARA EXCLUIR
      const details = `Exclusão de Produto: ${p.name} | ID: ${p.id} | Estoque Residual: ${p.stock}${p.unit}`;
      requestAuth(doDelete, 'Excluir Estoque', details, 'delete_product');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validação Manual Rígida
    if (!formData.name.trim()) {
      setFormError('O Nome do Material é obrigatório.');
      return;
    }
    if (formData.buyPrice === '' || isNaN(parseFloat(formData.buyPrice))) {
      setFormError('O Preço de Compra é obrigatório.');
      return;
    }
    if (formData.sellPrice === '' || isNaN(parseFloat(formData.sellPrice))) {
      setFormError('O Preço de Venda é obrigatório.');
      return;
    }
    if (formData.stock === '' || isNaN(parseFloat(formData.stock))) {
      setFormError('O Estoque Inicial é obrigatório (digite 0 se não houver).');
      return;
    }
    if (formData.minStock === '' || isNaN(parseFloat(formData.minStock))) {
      setFormError('O Estoque Mínimo é obrigatório.');
      return;
    }
    if (formData.maxStock === '' || isNaN(parseFloat(formData.maxStock))) {
      setFormError('O Estoque Máximo é obrigatório.');
      return;
    }

    const stockVal = parseFloat(formData.stock);
    const minVal = parseFloat(formData.minStock);
    const maxVal = parseFloat(formData.maxStock);

    if (isNaN(stockVal) || isNaN(minVal) || isNaN(maxVal)) {
        setFormError('Por favor, insira valores numéricos válidos.');
        return;
    }

    const productData = {
      name: formData.name,
      buyPrice: parseFloat(formData.buyPrice),
      sellPrice: parseFloat(formData.sellPrice),
      unit: formData.unit,
      stock: stockVal,
      minStock: minVal,
      maxStock: maxVal
    };

    if (editingProduct) {
      updateProduct({ ...editingProduct, ...productData });
    } else {
      addProduct({ id: '', ...productData }); // ID is generated in store
    }
    setIsModalOpen(false);
  };

  // Helper to get Status
  const getStockStatus = (current: number, min: number, max: number) => {
    if (current <= min) return { label: 'Crítico', color: 'text-red-600 bg-red-50', icon: AlertCircle };
    if (current >= max) return { label: 'Alto', color: 'text-blue-600 bg-blue-50', icon: AlertTriangle };
    return { label: 'Normal', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle };
  };

  const canEdit = checkPermission('edit_product');
  const canDelete = checkPermission('delete_product');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Controle de Estoque</h2>
        {checkPermission('manage_inventory') && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} /> Novo Produto
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar material..."
            className="w-full pl-10 pr-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!searchTerm && (
           <p className="text-[10px] text-gray-400 font-medium text-right uppercase px-1 mt-1">
             Mostrando os 10 mais movimentados
           </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedProducts.map(product => {
          const status = getStockStatus(product.stock, product.minStock || 0, product.maxStock || Infinity);
          const StatusIcon = status.icon;

          return (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative group">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mt-1">Unidade: {product.unit}</span>
                  </div>
                  <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setViewingProduct(product)}
                      className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
                      title="Visualizar Detalhes"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenModal(product)}
                      className={`hover:bg-emerald-50 p-2 rounded-full transition-colors ${canEdit ? 'text-emerald-600' : 'text-gray-300'}`}
                      title={canEdit ? "Editar Produto" : "Sem permissão (Requer Senha)"}
                    >
                      {canEdit ? <Edit2 size={16} /> : <Lock size={16} />}
                    </button>
                    <button 
                      onClick={() => setDeleteModal({ open: true, product })}
                      className={`hover:bg-red-50 p-2 rounded-full transition-colors ${canDelete ? 'text-red-500' : 'text-gray-300'}`}
                      title={canDelete ? "Excluir Produto" : "Sem permissão (Requer Senha)"}
                    >
                      {canDelete ? <Trash2 size={16} /> : <Lock size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-xs text-gray-500">Compra</p>
                    <p className="font-bold text-emerald-700">R$ {product.buyPrice.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-gray-500">Venda</p>
                    <p className="font-bold text-blue-700">R$ {product.sellPrice.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                   <div>
                     <p className="text-xs text-gray-400 mb-1">Estoque Atual</p>
                     <p className="text-2xl font-bold text-gray-800">{product.stock} <span className="text-sm font-normal text-gray-500">{product.unit}</span></p>
                   </div>
                   <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${status.color}`}>
                      <StatusIcon size={14} />
                      {status.label}
                   </div>
                </div>
              </div>
            </div>
          );
        })}
        {displayedProducts.length === 0 && (
           <div className="col-span-full text-center py-12 text-gray-400">
              Nenhum produto encontrado.
           </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, product: null })}
        onConfirm={confirmDelete}
        title="Excluir Estoque"
        message="Tem certeza que deseja excluir este produto? O histórico de transações será mantido, mas o item não aparecerá mais em novas operações."
        confirmText="Excluir Produto"
        variant="danger"
      />

      {/* Modal de Edição / Criação */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <p className="text-xs text-gray-500 mb-4">* Todos os campos são obrigatórios</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Material <span className="text-red-500">*</span></label>
                <input 
                  required
                  className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Alumínio Latinha"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Compra (R$) <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    value={formData.buyPrice}
                    onChange={e => setFormData({...formData, buyPrice: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Venda (R$) <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    value={formData.sellPrice}
                    onChange={e => setFormData({...formData, sellPrice: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Inicial <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Medida <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value as UnitType})}
                  >
                    <option value="kg">Quilograma (kg)</option>
                    <option value="un">Unidade (un)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <h4 className="text-sm font-bold text-gray-600 mb-3">Alertas de Estoque</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Mínimo (Crítico) <span className="text-red-500">*</span></label>
                      <input 
                        type="number"
                        required
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                        value={formData.minStock}
                        onChange={e => setFormData({...formData, minStock: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Máximo (Excesso) <span className="text-red-500">*</span></label>
                      <input 
                        type="number"
                        required
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                        value={formData.maxStock}
                        onChange={e => setFormData({...formData, maxStock: e.target.value})}
                      />
                   </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Detalhes */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{viewingProduct.name}</h3>
                <p className="text-sm text-gray-500">Detalhes e Histórico do Produto</p>
              </div>
              <button onClick={() => setViewingProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                   <span className="text-xs text-gray-500 uppercase font-bold">Valor em Estoque (Custo)</span>
                   <p className="text-xl font-bold text-emerald-700 mt-1">
                     {(viewingProduct.stock * viewingProduct.buyPrice).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                   </p>
                   <p className="text-xs text-emerald-600 mt-1">Baseado no preço de compra atual</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                   <span className="text-xs text-gray-500 uppercase font-bold">Valor de Venda Potencial</span>
                   <p className="text-xl font-bold text-blue-700 mt-1">
                     {(viewingProduct.stock * viewingProduct.sellPrice).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                   </p>
                   <p className="text-xs text-blue-600 mt-1">Margem bruta estimada</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col justify-center">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500 uppercase font-bold">Status do Estoque</span>
                      {(() => {
                        const s = getStockStatus(viewingProduct.stock, viewingProduct.minStock || 0, viewingProduct.maxStock || 9999);
                        const Icon = s.icon;
                        return <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.color}`}>{s.label}</span>
                      })()}
                   </div>
                   <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                      <div 
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(5, (viewingProduct.stock / (viewingProduct.maxStock || viewingProduct.stock * 2 || 100)) * 100))}%` }}
                      ></div>
                   </div>
                   <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Min: {viewingProduct.minStock}</span>
                      <span>Max: {viewingProduct.maxStock}</span>
                   </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-2">
                   <History className="w-4 h-4 text-gray-500" />
                   <h4 className="font-bold text-gray-700 text-sm">Últimas Movimentações</h4>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Parceiro</th>
                      <th className="p-3 text-right">Quantidade</th>
                      <th className="p-3 text-right">Preço Unit.</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productHistory.length === 0 ? (
                       <tr><td colSpan={7} className="p-6 text-center text-gray-400">Nenhuma movimentação registrada.</td></tr>
                    ) : (
                       productHistory.map(h => {
                         const partnerName = partners.find(p => p.id === h.partnerId)?.name || 'Desconhecido';
                         return (
                           <tr key={h.id} className="hover:bg-gray-50">
                             <td className="p-3 whitespace-nowrap">
                               {new Date(h.createdAt).toLocaleDateString()}
                               <span className="text-xs text-gray-400 block">{new Date(h.createdAt).toLocaleTimeString()}</span>
                             </td>
                             <td className="p-3">
                               {h.type === 'buy' ? (
                                 <span className="flex items-center gap-1 text-orange-600 font-bold text-xs uppercase"><ArrowDownLeft size={14}/> Compra</span>
                               ) : (
                                 <span className="flex items-center gap-1 text-blue-600 font-bold text-xs uppercase"><ArrowUpRight size={14}/> Venda</span>
                               )}
                             </td>
                             <td className="p-3 text-gray-600 font-medium max-w-[150px] truncate" title={partnerName}>
                               {partnerName}
                             </td>
                             <td className="p-3 text-right font-bold text-gray-800">
                               {h.itemQuantity} {viewingProduct.unit}
                             </td>
                             <td className="p-3 text-right text-gray-500">
                               R$ {h.itemPrice.toFixed(2)}
                             </td>
                             <td className="p-3 text-right font-mono text-gray-700">
                               {h.itemTotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                             </td>
                             <td className="p-3 text-center">
                               {h.status === 'paid' && (
                                 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                   <CheckCircle size={12} /> Pago
                                 </span>
                               )}
                               {h.status === 'pending' && (
                                 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                   <Clock size={12} /> Pendente
                                 </span>
                               )}
                               {h.status === 'cancelled' && (
                                 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                   <XCircle size={12} /> Cancelado
                                 </span>
                               )}
                             </td>
                           </tr>
                         );
                       })
                    )}
                  </tbody>
                </table>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
               <button 
                 onClick={() => setViewingProduct(null)}
                 className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
               >
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
    </div>
  );
};

export default Inventory;
