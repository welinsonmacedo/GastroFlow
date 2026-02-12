
import React, { useState } from 'react';
import { useMenu } from '../../context/MenuContext'; // Changed from RestaurantContext
import { useRestaurant } from '../../context/RestaurantContext'; // Still needed for dispatch generic updates? No, MenuContext handles product updates
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ProductFormModal } from '../../components/modals/ProductFormModal';
import { Product } from '../../types';
import { Plus, GripVertical, Edit, Eye, EyeOff, Trash2, Layers, Tag, Search, Utensils } from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { state: menuState, updateProduct, deleteProduct } = useMenu();
  const { showConfirm } = useUI();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  const sortedProducts = [...menuState.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  
  // Categorias dinâmicas + Adicionais
  const categories = ['Todas', 'Adicionais', ...Array.from(new Set(menuState.products.filter(p => !p.isExtra).map(p => p.category)))];

  const handleOpenAdd = () => {
      setEditingProduct(null);
      setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
      setEditingProduct(product);
      setIsModalOpen(true);
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
               updateProduct({ ...product, sortOrder: (index + 1) * 10 });
          }
      });
      setDraggedItemIndex(null);
  };

  const displayedProducts = sortedProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchCategory = false;
      if (filterCategory === 'Todas') {
          matchCategory = true;
      } else if (filterCategory === 'Adicionais') {
          matchCategory = p.isExtra === true;
      } else {
          matchCategory = p.category === filterCategory && !p.isExtra;
      }

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
                                <button onClick={() => updateProduct({...product, isVisible: !product.isVisible})} className={`p-2 rounded-lg transition-colors ${product.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title={product.isVisible ? "Ocultar do Cliente" : "Mostrar no Menu"}>
                                    {product.isVisible ? <Eye size={18}/> : <EyeOff size={18}/>}
                                </button>
                                <button onClick={() => showConfirm({ title: 'Remover do Cardápio', message: 'O item continuará no estoque, mas não poderá mais ser vendido.', onConfirm: () => deleteProduct(product.id) })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
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
                        {filterCategory === 'Adicionais' && (
                            <p className="text-xs text-orange-500">Certifique-se de marcar a opção "Produto Adicional" ao criar o item.</p>
                        )}
                    </div>
                )}
            </div>
        </div>

        <ProductFormModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            productToEdit={editingProduct} 
        />
    </div>
  );
};
