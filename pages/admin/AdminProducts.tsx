import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { Product, ProductType } from '../../types';
import { Plus, GripVertical, Edit, Eye, EyeOff, Trash2 } from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert } = useUI();
  
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
      price: 0,
      category: 'Lanches',
      type: ProductType.KITCHEN,
      image: '',
      description: '',
      isVisible: true
  });

  const availableForMenu = state.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !state.products.some(p => p.linkedInventoryItemId === i.id)
  );

  const sortedProducts = [...state.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleAddProductToMenu = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedStockId) return;
      const stockItem = state.inventory.find(i => i.id === selectedStockId);
      if(!stockItem) return;
      dispatch({
          type: 'ADD_PRODUCT_TO_MENU',
          product: {
              ...newProductForm,
              linkedInventoryItemId: stockItem.id,
              name: stockItem.name,
              costPrice: stockItem.costPrice,
              image: stockItem.image || newProductForm.image,
              sortOrder: state.products.length + 1
          } as Product
      });
      setMenuModalOpen(false);
      setSelectedStockId('');
      showAlert({ title: "Sucesso", message: "Produto adicionado ao cardápio!", type: 'SUCCESS' });
  };

  const handleUpdateMenuProduct = () => {
      if(editingProduct) {
          dispatch({ type: 'UPDATE_PRODUCT', product: editingProduct });
          setEditingProduct(null);
      }
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

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Cardápio de Venda</h2>
                <p className="text-sm text-gray-500">Gerencie os produtos visíveis para o cliente.</p>
            </div>
            <Button onClick={() => setMenuModalOpen(true)}><Plus size={16}/> Adicionar Produto</Button>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
            {sortedProducts.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum produto no cardápio. Adicione a partir do estoque.</div>}
            {sortedProducts.map((product, index) => (
                <div 
                    key={product.id} 
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className="flex items-center gap-4 p-3 border-b last:border-0 hover:bg-gray-50 cursor-move transition-colors"
                >
                    <GripVertical className="text-gray-400 cursor-grab active:cursor-grabbing" />
                    <img src={product.image} className="w-12 h-12 rounded-lg object-cover bg-gray-100 border" />
                    <div className="flex-1">
                        <div className="font-bold text-gray-800">{product.name}</div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">{product.category}</div>
                    </div>
                    <div className="text-right mr-4">
                        <div className="font-bold text-blue-600">R$ {product.price.toFixed(2)}</div>
                        {product.costPrice && <div className="text-xs text-gray-400">Custo: R$ {product.costPrice.toFixed(2)}</div>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingProduct(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit size={18}/></button>
                        <button onClick={() => dispatch({type: 'UPDATE_PRODUCT', product: {...product, isVisible: !product.isVisible}})} className={`p-2 rounded transition-colors ${product.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title={product.isVisible ? 'Ocultar' : 'Mostrar'}>
                            {product.isVisible ? <Eye size={18}/> : <EyeOff size={18}/>}
                        </button>
                        <button onClick={() => dispatch({type: 'DELETE_PRODUCT', productId: product.id})} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir"><Trash2 size={18}/></button>
                    </div>
                </div>
            ))}
        </div>

        {/* Modal */}
        <Modal 
            isOpen={menuModalOpen || !!editingProduct} 
            onClose={() => { setMenuModalOpen(false); setEditingProduct(null); }}
            title={editingProduct ? 'Editar Produto' : 'Adicionar ao Cardápio'}
        >
            <div className="space-y-4">
                {!editingProduct && (
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Selecione do Estoque (Obrigatório)</label>
                        <select 
                            className="w-full border p-2.5 rounded-lg text-sm bg-white" 
                            value={selectedStockId} 
                            onChange={e => setSelectedStockId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {availableForMenu.map(i => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Apenas itens de "Revenda" ou "Produzidos" aparecem aqui.</p>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold mb-1 text-gray-600">Nome de Exibição</label>
                        <input className="w-full border p-2.5 rounded-lg text-sm" value={editingProduct ? editingProduct.name : newProductForm.name} onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProductForm({...newProductForm, name: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Preço de Venda (R$)</label>
                        <input type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-bold text-green-700" value={editingProduct ? editingProduct.price : newProductForm.price} onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: parseFloat(e.target.value)}) : setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Categoria</label>
                        <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={editingProduct ? editingProduct.category : newProductForm.category} onChange={e => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value}) : setNewProductForm({...newProductForm, category: e.target.value})} >
                            {['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold mb-1 text-gray-600">Descrição</label>
                        <textarea className="w-full border p-2.5 rounded-lg text-sm h-20 resize-none" value={editingProduct ? editingProduct.description : newProductForm.description} onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProductForm({...newProductForm, description: e.target.value})} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold mb-1 text-gray-600">Imagem</label>
                        <ImageUploader value={editingProduct ? editingProduct.image : newProductForm.image || ''} onChange={(val) => editingProduct ? setEditingProduct({...editingProduct, image: val}) : setNewProductForm({...newProductForm, image: val})} />
                    </div>
                </div>

                <div className="flex gap-2 pt-4">
                    <Button variant="secondary" onClick={() => { setMenuModalOpen(false); setEditingProduct(null); }} className="flex-1">Cancelar</Button>
                    <Button onClick={editingProduct ? handleUpdateMenuProduct : handleAddProductToMenu} className="flex-1">Salvar</Button>
                </div>
            </div>
        </Modal>
    </div>
  );
};