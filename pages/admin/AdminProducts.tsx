
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { Product, ProductType } from '../../types';
import { Plus, GripVertical, Edit, Eye, EyeOff, Trash2, ArrowDownUp, Tag, Layers, CheckSquare, Square, Info } from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { state: restState, dispatch } = useRestaurant();
  const { state: invState } = useInventory();
  const { showAlert, showConfirm } = useUI();
  
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState('Todas');
  
  // State for Extras Management
  const [isExtra, setIsExtra] = useState(false);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

  const [productForm, setProductForm] = useState<{
      name: string;
      price: string;
      category: string;
      description: string;
      image: string;
      type: ProductType;
      isVisible: boolean;
  }>({
      price: '',
      category: 'Lanches',
      type: ProductType.KITCHEN,
      image: '',
      description: '',
      isVisible: true,
      name: ''
  });

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !restState.products.some(p => p.linkedInventoryItemId === i.id && !editingProduct)
  );

  const sortedProducts = [...restState.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const categories = ['Todas', ...Array.from(new Set(restState.products.filter(p => !p.isExtra).map(p => p.category)))];
  
  // Todos os produtos que foram marcados como adicionais
  const allAvailableExtras = restState.products.filter(p => p.isExtra && p.id !== editingProduct?.id);

  const handleOpenAdd = () => {
      setProductForm({
        price: '',
        category: 'Lanches',
        type: ProductType.KITCHEN,
        image: '',
        description: '',
        isVisible: true,
        name: ''
      });
      setSelectedStockId('');
      setEditingProduct(null);
      setIsExtra(false);
      setSelectedExtraIds([]);
      setMenuModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
      setEditingProduct(product);
      setProductForm({
          name: product.name,
          price: product.price.toString(),
          category: product.category,
          description: product.description || '',
          image: product.image || '',
          type: product.type,
          isVisible: product.isVisible
      });
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
      
      const priceValue = parseFloat(productForm.price);
      if (isNaN(priceValue) || priceValue < 0) {
          showAlert({ title: "Preço Inválido", message: "Insira um preço válido.", type: 'ERROR' });
          return;
      }

      if (editingProduct) {
          await dispatch({ 
              type: 'UPDATE_PRODUCT', 
              product: { 
                  ...editingProduct, 
                  name: productForm.name,
                  price: priceValue,
                  category: productForm.category,
                  description: productForm.description,
                  image: productForm.image,
                  type: productForm.type,
                  isVisible: productForm.isVisible,
                  isExtra: isExtra,
                  linkedExtraIds: isExtra ? [] : selectedExtraIds // Adicionais não têm outros adicionais
              } as Product 
          });
      } else {
          if (!selectedStockId) {
              showAlert({ title: "Erro", message: "Selecione um item do estoque.", type: 'ERROR' });
              return;
          }
          const stockItem = invState.inventory.find(i => i.id === selectedStockId);
          if (!stockItem) return;

          await dispatch({
              type: 'ADD_PRODUCT_TO_MENU',
              product: {
                  linkedInventoryItemId: stockItem.id,
                  name: productForm.name || stockItem.name,
                  price: priceValue,
                  costPrice: stockItem.costPrice || 0,
                  category: productForm.category,
                  type: productForm.type,
                  description: productForm.description,
                  image: productForm.image || stockItem.image || '',
                  isVisible: productForm.isVisible,
                  sortOrder: restState.products.length + 1,
                  isExtra: isExtra,
                  linkedExtraIds: isExtra ? [] : selectedExtraIds
              } as Product
          });
      }
      setMenuModalOpen(false);
  };

  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (targetIndex: number) => {
      if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
      const updatedList = [...sortedProducts];
      const [movedItem] = updatedList.splice(draggedItemIndex, 1);
      updatedList.splice(targetIndex, 0, movedItem);
      updatedList.forEach((product, index) => {
          if (product.sortOrder !== (index + 1)) {
               dispatch({ type: 'UPDATE_PRODUCT', product: { ...product, sortOrder: index + 1 } });
          }
      });
      setDraggedItemIndex(null);
  };

  const displayedProducts = sortedProducts.filter(p => {
      const matchCategory = filterCategory === 'Todas' || p.category === filterCategory;
      const matchType = filterCategory === 'Adicionais' ? p.isExtra : (filterCategory === 'Todas' ? true : !p.isExtra);
      return matchCategory && matchType;
  });

  const finalCategories = [...categories, 'Adicionais'];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ArrowDownUp size={24} className="text-blue-600"/> Organizar Cardápio
                </h2>
                <p className="text-sm text-gray-500">Defina o que aparece para o cliente e vincule adicionais.</p>
            </div>
            <Button onClick={handleOpenAdd} className="w-full md:w-auto">
                <Plus size={18}/> Adicionar do Estoque
            </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {finalCategories.map(cat => (
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
                            <div className="w-12 h-12 rounded-lg bg-gray-100 border overflow-hidden shrink-0">
                                <img src={product.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate flex items-center gap-2">
                                    {product.name}
                                    {product.isExtra && <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full uppercase">Adicional</span>}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{product.category}</span>
                                    {product.linkedExtraIds && product.linkedExtraIds.length > 0 && (
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1">
                                            <Layers size={10}/> {product.linkedExtraIds.length} Opcionais vinculados
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right font-bold text-blue-600 w-24">
                                R$ {product.price.toFixed(2)}
                            </div>
                            <div className="flex gap-1 border-l pl-3 ml-2">
                                <button onClick={() => handleOpenEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                    <Edit size={18}/>
                                </button>
                                <button onClick={() => showConfirm({ title: 'Remover do Cardápio', message: 'O item continuará no estoque.', onConfirm: () => dispatch({type: 'DELETE_PRODUCT', productId: product.id}) })} className="p-2 text-red-400 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    );
                })}
                {displayedProducts.length === 0 && (
                    <div className="p-12 text-center text-gray-400">Nenhum produto nesta categoria.</div>
                )}
            </div>
        </div>

        {/* Modal de Adicionar/Editar */}
        <Modal 
            isOpen={menuModalOpen} 
            onClose={() => setMenuModalOpen(false)}
            title={editingProduct ? 'Editar Produto' : 'Adicionar ao Cardápio'}
            variant="page"
        >
            <form onSubmit={handleSaveProduct} className="space-y-6">
                {!editingProduct && (
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <label className="block text-sm font-bold mb-2 text-blue-800 uppercase">1. Selecione do Estoque</label>
                        <select 
                            className="w-full border p-3 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={selectedStockId} 
                            onChange={e => {
                                const id = e.target.value;
                                setSelectedStockId(id);
                                const item = invState.inventory.find(i => i.id === id);
                                if (item) {
                                    setProductForm(prev => ({ ...prev, name: item.name, image: item.image || '' }));
                                }
                            }}
                            required
                        >
                            <option value="">Selecione o item...</option>
                            {availableForMenu.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 flex items-center justify-between bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <div className="flex items-center gap-3">
                            <Layers className="text-orange-600" />
                            <div>
                                <h4 className="font-bold text-orange-900 text-sm">Este produto é um Adicional/Extra?</h4>
                                <p className="text-xs text-orange-700">Adicionais não aparecem no menu principal, mas podem ser escolhidos em outros pratos.</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setIsExtra(!isExtra)}
                            className={`p-2 rounded-lg transition-colors ${isExtra ? 'bg-orange-600 text-white' : 'bg-white text-gray-300 border'}`}
                        >
                            {isExtra ? <CheckSquare size={24}/> : <Square size={24}/>}
                        </button>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-500 uppercase">Nome de Exibição</label>
                        <input className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-500 uppercase">Preço de Venda (R$)</label>
                        <input type="number" step="0.01" className="w-full border p-3 rounded-lg text-xl font-bold text-green-700 focus:ring-2 focus:ring-green-500 outline-none" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-500 uppercase">Categoria</label>
                        <select className="w-full border p-3 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} >
                            {['Promocoes', 'Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {!isExtra && (
                        <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Layers size={16}/> Vincular Adicionais Disponíveis</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                {allAvailableExtras.map(extra => (
                                    <div 
                                        key={extra.id} 
                                        onClick={() => toggleExtraSelection(extra.id)}
                                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${selectedExtraIds.includes(extra.id) ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-white/50 border-gray-200 opacity-60'}`}
                                    >
                                        <span className="text-xs font-medium">{extra.name}</span>
                                        <span className="text-[10px] font-bold text-blue-600">+ R$ {extra.price.toFixed(2)}</span>
                                    </div>
                                ))}
                                {allAvailableExtras.length === 0 && (
                                    <p className="text-xs text-blue-400 italic flex items-center gap-1"><Info size={12}/> Nenhum produto cadastrado como "Adicional" ainda.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-500 uppercase">Descrição</label>
                        <textarea className="w-full border p-3 rounded-lg h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-500 uppercase">Imagem</label>
                        <ImageUploader value={productForm.image || ''} onChange={(val) => setProductForm({...productForm, image: val})} />
                    </div>
                </div>

                <div className="flex gap-3 pt-6 border-t mt-4">
                    <Button type="button" variant="secondary" onClick={() => setMenuModalOpen(false)} className="flex-1 py-3">Cancelar</Button>
                    <Button type="submit" className="flex-1 py-3">Salvar Produto</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};
