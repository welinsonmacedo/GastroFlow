
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { Product, ProductType } from '../../types';
// Added missing icons: Utensils, Archive, DollarSign, Image as ImageIcon
import { Plus, GripVertical, Edit, Eye, EyeOff, Trash2, ArrowDownUp, Tag, Layers, CheckSquare, Square, Info, Search, Utensils, Archive, DollarSign, Image as ImageIcon } from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { state: restState, dispatch } = useRestaurant();
  const { state: invState } = useInventory();
  const { showAlert, showConfirm } = useUI();
  
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Extras Management
  const [isExtra, setIsExtra] = useState(false);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !restState.products.some(p => p.linkedInventoryItemId === i.id && !editingProduct)
  );

  const sortedProducts = [...restState.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  
  // Categorias incluindo filtro de Adicionais
  const categories = ['Todas', 'Adicionais', ...Array.from(new Set(restState.products.filter(p => !p.isExtra).map(p => p.category)))];
  
  // Todos os produtos que podem ser usados como adicionais (exclui o próprio se estiver editando)
  const allAvailableExtras = restState.products.filter(p => p.isExtra && p.id !== editingProduct?.id);

  const handleOpenAdd = () => {
      setEditingProduct(null);
      setSelectedStockId('');
      setIsExtra(false);
      setSelectedExtraIds([]);
      setMenuModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
      setEditingProduct(product);
      setSelectedStockId(product.linkedInventoryItemId);
      setIsExtra(product.isExtra || false);
      setSelectedExtraIds(product.linkedExtraIds || []);
      setMenuModalOpen(true);
  };

  const toggleExtraSelection = (id: string) => {
      setSelectedExtraIds(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      
      const price = parseFloat(formData.get('price') as string);
      const name = formData.get('name') as string;
      const category = formData.get('category') as string;
      const description = formData.get('description') as string;
      const image = (e.currentTarget as any).elements.productImage.value;

      if (editingProduct) {
          await dispatch({ 
              type: 'UPDATE_PRODUCT', 
              product: { 
                  ...editingProduct, 
                  name, price, category, description, image,
                  isExtra,
                  linkedExtraIds: isExtra ? [] : selectedExtraIds
              } as Product 
          });
      } else {
          const stockItem = invState.inventory.find(i => i.id === selectedStockId);
          if (!stockItem) return showAlert({ title: "Erro", message: "Selecione um item do estoque.", type: 'ERROR' });

          await dispatch({
              type: 'ADD_PRODUCT_TO_MENU',
              product: {
                  linkedInventoryItemId: stockItem.id,
                  name: name || stockItem.name,
                  price,
                  costPrice: stockItem.costPrice || 0,
                  category: isExtra ? 'Adicionais' : category,
                  type: stockItem.type === 'RESALE' ? ProductType.BAR : ProductType.KITCHEN,
                  description,
                  image: image || stockItem.image || '',
                  isVisible: true,
                  sortOrder: restState.products.length + 1,
                  isExtra,
                  linkedExtraIds: isExtra ? [] : selectedExtraIds
              } as Product
          });
      }
      setMenuModalOpen(false);
      showAlert({ title: "Sucesso", message: "Produto salvo no cardápio!", type: 'SUCCESS' });
  };

  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (targetIndex: number) => {
      if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
      const updatedList = [...sortedProducts];
      const [movedItem] = updatedList.splice(draggedItemIndex, 1);
      updatedList.splice(targetIndex, 0, movedItem);
      updatedList.forEach((product, index) => {
          if (product.sortOrder !== (index + 1) * 10) {
               dispatch({ type: 'UPDATE_PRODUCT', product: { ...product, sortOrder: (index + 1) * 10 } });
          }
      });
      setDraggedItemIndex(null);
  };

  const displayedProducts = sortedProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'Todas' || 
                           (filterCategory === 'Adicionais' ? p.isExtra : (p.category === filterCategory && !p.isExtra));
      return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Utensils size={24} className="text-blue-600"/> Gestão de Cardápio
                </h2>
                <p className="text-sm text-gray-500">Configure produtos de venda e seus opcionais (adicionais).</p>
            </div>
            <Button onClick={handleOpenAdd} className="w-full md:w-auto">
                <Plus size={18}/> Novo Produto
            </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap
                            ${filterCategory === cat 
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                        `}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            <div className="relative w-full md:w-64">
                <Search size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                <input 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Buscar no cardápio..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="divide-y divide-gray-100">
                {displayedProducts.map((product, index) => {
                    const realIndex = sortedProducts.findIndex(p => p.id === product.id);
                    return (
                        <div 
                            key={product.id} 
                            draggable={filterCategory === 'Todas'} 
                            onDragStart={() => handleDragStart(realIndex)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(realIndex)}
                            className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group ${filterCategory === 'Todas' ? 'cursor-move' : ''}`}
                        >
                            <div className={`text-gray-300 ${filterCategory === 'Todas' ? 'group-hover:text-gray-500 cursor-grab active:cursor-grabbing' : 'opacity-20'}`}>
                                <GripVertical size={20} />
                            </div>
                            <div className="w-14 h-14 rounded-lg bg-gray-100 border overflow-hidden shrink-0 shadow-inner">
                                <img src={product.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate flex items-center gap-2">
                                    {product.name}
                                    {product.isExtra && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">Adicional</span>}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{product.category}</span>
                                    {product.linkedExtraIds && product.linkedExtraIds.length > 0 && (
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                                            <Layers size={10}/> {product.linkedExtraIds.length} Adicionais vinculados
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="font-bold text-blue-600">R$ {product.price.toFixed(2)}</div>
                                <div className="text-[10px] text-gray-400 font-medium">Lucro: R$ {(product.price - (product.costPrice || 0)).toFixed(2)}</div>
                            </div>
                            <div className="flex gap-1 border-l pl-3 ml-2 shrink-0">
                                <button onClick={() => handleOpenEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                    <Edit size={18}/>
                                </button>
                                <button onClick={() => dispatch({type: 'UPDATE_PRODUCT', product: {...product, isVisible: !product.isVisible}})} className={`p-2 rounded-lg transition-colors ${product.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title={product.isVisible ? "Ocultar do Cliente" : "Mostrar no Menu"}>
                                    {product.isVisible ? <Eye size={18}/> : <EyeOff size={18}/>}
                                </button>
                                <button onClick={() => showConfirm({ title: 'Remover do Cardápio', message: 'O item continuará no estoque, mas não poderá mais ser vendido.', onConfirm: () => dispatch({type: 'DELETE_PRODUCT', productId: product.id}) })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    );
                })}
                {displayedProducts.length === 0 && (
                    <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-2">
                        <Tag size={48} className="opacity-10"/>
                        <p>Nenhum produto encontrado nesta visualização.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Modal de Adicionar/Editar */}
        <Modal 
            isOpen={menuModalOpen} 
            onClose={() => setMenuModalOpen(false)}
            title={editingProduct ? 'Editar Produto' : 'Novo Produto para Venda'}
            variant="page"
        >
            <form onSubmit={handleSaveProduct} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Coluna 1: Origem e Tipo */}
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Archive size={16} className="text-blue-600"/> 1. Origem no Estoque
                            </h4>
                            {!editingProduct ? (
                                <div className="space-y-4">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Vincular Item de Inventário</label>
                                    <select 
                                        className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none shadow-sm transition-all" 
                                        value={selectedStockId} 
                                        onChange={e => setSelectedStockId(e.target.value)}
                                        required
                                    >
                                        <option value="">Selecione do estoque...</option>
                                        {availableForMenu.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.type === 'COMPOSITE' ? 'Prato' : 'Revenda'})</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 leading-tight">Ao selecionar um item do estoque, o sistema gerencia automaticamente o custo médio e a baixa de estoque na venda.</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-white rounded-xl border border-blue-100 flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Archive size={20}/></div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Item Vinculado</div>
                                        <div className="font-bold text-slate-700 truncate">{invState.inventory.find(i => i.id === editingProduct.linkedInventoryItemId)?.name || 'Desconhecido'}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`p-6 rounded-2xl border transition-all ${isExtra ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className={`text-sm font-bold flex items-center gap-2 ${isExtra ? 'text-orange-800' : 'text-slate-800'}`}>
                                    <Layers size={16}/> 2. Tipo de Venda
                                </h4>
                                <button 
                                    type="button"
                                    onClick={() => setIsExtra(!isExtra)}
                                    className={`p-1.5 rounded-lg transition-all ${isExtra ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-slate-100 text-slate-400 border'}`}
                                >
                                    {isExtra ? <CheckSquare size={20}/> : <Square size={20}/>}
                                </button>
                            </div>
                            <div>
                                <p className={`text-xs font-bold mb-1 ${isExtra ? 'text-orange-700' : 'text-slate-700'}`}>
                                    {isExtra ? 'PRODUTO ADICIONAL (EXTRA)' : 'PRODUTO PRINCIPAL'}
                                </p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    {isExtra 
                                        ? 'Este item NÃO aparecerá no cardápio principal. Ele será oferecido como um opcional de outros pratos.' 
                                        : 'Este item aparecerá nas categorias principais do cardápio para o cliente escolher.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Coluna 2: Dados Comerciais */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <DollarSign size={16} className="text-green-600"/> 3. Dados Comerciais
                            </h4>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome no Cardápio</label>
                                <input 
                                    name="name"
                                    className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none" 
                                    defaultValue={editingProduct?.name || invState.inventory.find(i => i.id === selectedStockId)?.name || ''} 
                                    placeholder="Ex: Coca-Cola 350ml"
                                    required 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço de Venda</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-sm font-bold text-slate-400">R$</span>
                                        <input 
                                            name="price"
                                            type="number" step="0.01" 
                                            className="w-full border-2 p-3 pl-10 rounded-xl text-lg font-extrabold text-blue-600 focus:border-blue-500 outline-none" 
                                            defaultValue={editingProduct?.price || ''} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Médio</label>
                                    <div className="p-3 bg-slate-50 rounded-xl border-2 border-dashed flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">R$</span>
                                        <span className="text-sm font-bold text-slate-600">
                                            {(editingProduct?.costPrice || invState.inventory.find(i => i.id === selectedStockId)?.costPrice || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {!isExtra && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria Principal</label>
                                    <select 
                                        name="category"
                                        className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none" 
                                        defaultValue={editingProduct?.category || 'Lanches'}
                                    >
                                        {['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição Curta</label>
                                <textarea 
                                    name="description"
                                    className="w-full border-2 p-3 rounded-xl text-sm h-24 resize-none focus:border-blue-500 outline-none" 
                                    defaultValue={editingProduct?.description || ''} 
                                    placeholder="Conte mais sobre o produto..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Coluna 3: Adicionais e Imagem */}
                    <div className="space-y-6">
                        {!isExtra && (
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col h-[300px]">
                                <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2 shrink-0">
                                    <Layers size={16}/> 4. Adicionais Disponíveis
                                </h4>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {allAvailableExtras.map(extra => (
                                        <div 
                                            key={extra.id} 
                                            onClick={() => toggleExtraSelection(extra.id)}
                                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedExtraIds.includes(extra.id) ? 'bg-white border-blue-500 ring-2 ring-blue-100' : 'bg-white/50 border-transparent opacity-60 hover:opacity-100 hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {selectedExtraIds.includes(extra.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18} className="text-slate-300"/>}
                                                <span className="text-xs font-bold text-slate-700">{extra.name}</span>
                                            </div>
                                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">+ R$ {extra.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {allAvailableExtras.length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-[10px] text-blue-400 italic">Nenhum "Produto Adicional" cadastrado ainda.</p>
                                            <p className="text-[9px] text-blue-300">Marque outros itens como adicional primeiro.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-2xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <ImageIcon size={16} className="text-purple-600"/> 5. Imagem
                            </h4>
                            <ImageUploader 
                                value={editingProduct?.image || invState.inventory.find(i => i.id === selectedStockId)?.image || ''} 
                                onChange={(val) => {
                                    const input = document.getElementById('productImageInput') as HTMLInputElement;
                                    if(input) input.value = val;
                                }} 
                            />
                            {/* Hidden input to store image URL from uploader */}
                            <input type="hidden" name="productImage" id="productImageInput" defaultValue={editingProduct?.image || ''} />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-6 border-t mt-8 shrink-0">
                    <Button type="button" variant="secondary" onClick={() => setMenuModalOpen(false)} className="flex-1 py-4 text-lg font-bold">Cancelar</Button>
                    <Button type="submit" className="flex-1 py-4 text-lg font-bold shadow-xl shadow-blue-200">Finalizar Cadastro</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};
