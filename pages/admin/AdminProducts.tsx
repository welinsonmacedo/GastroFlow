import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { Product, ProductType } from '../../types';
import { Plus, GripVertical, Edit, Eye, EyeOff, Trash2, Search, ArrowDownUp, Tag } from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState('Todas');
  
  // Form para "Adicionar do Estoque" ou "Editar"
  const [productForm, setProductForm] = useState<Partial<Product>>({
      price: 0,
      category: 'Lanches',
      type: ProductType.KITCHEN,
      image: '',
      description: '',
      isVisible: true,
      name: ''
  });

  // Filtra itens do estoque que podem virar produto (Revenda ou Produzido) e que AINDA NÃO estão no menu
  const availableForMenu = state.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !state.products.some(p => p.linkedInventoryItemId === i.id)
  );

  // Produtos ordenados
  const sortedProducts = [...state.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  
  // Categorias únicas para filtro
  const categories = ['Todas', ...Array.from(new Set(state.products.map(p => p.category)))];

  // --- Handlers ---

  const handleOpenAdd = () => {
      setProductForm({
        price: 0,
        category: 'Lanches',
        type: ProductType.KITCHEN,
        image: '',
        description: '',
        isVisible: true,
        name: ''
      });
      setSelectedStockId('');
      setEditingProduct(null);
      setMenuModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
      setEditingProduct(product);
      setProductForm({ ...product });
      setMenuModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (editingProduct) {
          // Editar existente
          dispatch({ type: 'UPDATE_PRODUCT', product: { ...editingProduct, ...productForm } as Product });
          showAlert({ title: "Atualizado", message: "Produto atualizado com sucesso.", type: 'SUCCESS' });
      } else {
          // Adicionar do Estoque
          if (!selectedStockId) return;
          const stockItem = state.inventory.find(i => i.id === selectedStockId);
          if (!stockItem) return;

          dispatch({
              type: 'ADD_PRODUCT_TO_MENU',
              product: {
                  ...productForm,
                  linkedInventoryItemId: stockItem.id,
                  name: productForm.name || stockItem.name, // Usa nome do form ou fallback do estoque
                  costPrice: stockItem.costPrice,
                  image: productForm.image || stockItem.image, // Usa imagem do form ou fallback
                  sortOrder: state.products.length + 1
              } as Product
          });
          showAlert({ title: "Adicionado", message: "Item do estoque adicionado ao cardápio.", type: 'SUCCESS' });
      }
      setMenuModalOpen(false);
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (targetIndex: number) => {
      if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
      
      const updatedList = [...sortedProducts];
      const [movedItem] = updatedList.splice(draggedItemIndex, 1);
      updatedList.splice(targetIndex, 0, movedItem);
      
      // Atualiza a ordem no banco para TODOS os itens afetados
      // Isso garante consistência
      updatedList.forEach((product, index) => {
          if (product.sortOrder !== (index + 1)) {
               dispatch({ type: 'UPDATE_PRODUCT', product: { ...product, sortOrder: index + 1 } });
          }
      });
      
      setDraggedItemIndex(null);
  };

  // Filtragem visual
  const displayedProducts = filterCategory === 'Todas' 
      ? sortedProducts 
      : sortedProducts.filter(p => p.category === filterCategory);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ArrowDownUp size={24} className="text-blue-600"/> Organizar Cardápio
                </h2>
                <p className="text-sm text-gray-500">Defina o que aparece para o cliente e a ordem de exibição.</p>
            </div>
            <Button onClick={handleOpenAdd} className="w-full md:w-auto">
                <Plus size={18}/> Adicionar do Estoque
            </Button>
        </div>

        {/* Filtros de Categoria */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap
                        ${filterCategory === cat 
                            ? 'bg-slate-800 text-white border-slate-800' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                    `}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Lista de Produtos */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {displayedProducts.length === 0 && (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                    <Tag size={48} className="mb-4 opacity-20"/>
                    <p>Nenhum produto encontrado nesta categoria.</p>
                </div>
            )}

            <div className="divide-y divide-gray-100">
                {displayedProducts.map((product, index) => {
                    // Encontra o index real na lista completa para o Drag & Drop funcionar corretamente mesmo filtrado
                    const realIndex = sortedProducts.findIndex(p => p.id === product.id);

                    return (
                        <div 
                            key={product.id} 
                            draggable={filterCategory === 'Todas'} // Só permite arrastar se estiver vendo TUDO (para não quebrar índices)
                            onDragStart={() => handleDragStart(realIndex)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(realIndex)}
                            className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group ${filterCategory === 'Todas' ? 'cursor-move' : ''}`}
                        >
                            {/* Grip Icon */}
                            <div className={`text-gray-300 ${filterCategory === 'Todas' ? 'group-hover:text-gray-500 cursor-grab active:cursor-grabbing' : 'opacity-20'}`}>
                                <GripVertical size={20} />
                            </div>

                            {/* Imagem */}
                            <div className="w-12 h-12 rounded-lg bg-gray-100 border overflow-hidden shrink-0">
                                {product.image ? (
                                    <img src={product.image} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Tag size={16}/></div>
                                )}
                            </div>

                            {/* Infos Principais */}
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate">{product.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{product.category}</span>
                                    {product.costPrice && <span>Custo: R$ {product.costPrice.toFixed(2)}</span>}
                                </div>
                            </div>

                            {/* Preço de Venda */}
                            <div className="text-right font-bold text-blue-600 w-24">
                                R$ {product.price.toFixed(2)}
                            </div>

                            {/* Toggle Visibilidade */}
                            <button 
                                onClick={() => dispatch({type: 'UPDATE_PRODUCT', product: {...product, isVisible: !product.isVisible}})}
                                className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold
                                    ${product.isVisible ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                                `}
                                title={product.isVisible ? "Visível no Cardápio" : "Oculto do Cliente"}
                            >
                                {product.isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                                <span className="hidden md:inline">{product.isVisible ? 'Visível' : 'Oculto'}</span>
                            </button>

                            {/* Ações */}
                            <div className="flex gap-1 border-l pl-3 ml-2">
                                <button onClick={() => handleOpenEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar Detalhes">
                                    <Edit size={18}/>
                                </button>
                                <button onClick={() => showConfirm({ title: 'Remover do Cardápio', message: 'O item continuará no estoque, mas sumirá das vendas.', onConfirm: () => dispatch({type: 'DELETE_PRODUCT', productId: product.id}) })} className="p-2 text-red-400 hover:bg-red-50 rounded transition-colors" title="Remover">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Modal de Adicionar/Editar */}
        <Modal 
            isOpen={menuModalOpen} 
            onClose={() => setMenuModalOpen(false)}
            title={editingProduct ? 'Editar Produto' : 'Adicionar ao Cardápio'}
        >
            <form onSubmit={handleSaveProduct} className="space-y-5">
                
                {/* Se for Novo: Selecionar do Estoque */}
                {!editingProduct && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-xs font-bold mb-2 text-blue-800 uppercase">1. Selecione do Estoque</label>
                        <select 
                            className="w-full border p-3 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={selectedStockId} 
                            onChange={e => {
                                const id = e.target.value;
                                setSelectedStockId(id);
                                const item = state.inventory.find(i => i.id === id);
                                if (item) {
                                    // Auto-preenche dados ao selecionar
                                    setProductForm(prev => ({
                                        ...prev,
                                        name: item.name,
                                        image: item.image || ''
                                    }));
                                }
                            }}
                            required
                        >
                            <option value="">Selecione o item...</option>
                            {availableForMenu.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                            ))}
                        </select>
                        <p className="text-xs text-blue-600 mt-2">
                            Apenas itens marcados como <strong>Revenda</strong> ou <strong>Produzido</strong> no estoque aparecem aqui.
                        </p>
                    </div>
                )}

                {/* Dados de Exibição */}
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Nome de Exibição</label>
                    <input 
                        className="w-full border p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={productForm.name} 
                        onChange={e => setProductForm({...productForm, name: e.target.value})} 
                        placeholder="Ex: X-Bacon Especial"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Preço de Venda (R$)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            className="w-full border p-3 rounded-lg text-lg font-bold text-green-700 focus:ring-2 focus:ring-green-500 outline-none" 
                            value={productForm.price} 
                            onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value)})} 
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Categoria</label>
                        <select 
                            className="w-full border p-3 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={productForm.category} 
                            onChange={e => setProductForm({...productForm, category: e.target.value})}
                        >
                            {['Promocoes', 'Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Descrição (App Cliente)</label>
                    <textarea 
                        className="w-full border p-3 rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={productForm.description} 
                        onChange={e => setProductForm({...productForm, description: e.target.value})} 
                        placeholder="Ingredientes, modo de preparo..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Imagem do Produto</label>
                    <ImageUploader 
                        value={productForm.image || ''} 
                        onChange={(val) => setProductForm({...productForm, image: val})} 
                    />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={() => setMenuModalOpen(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar Produto</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};