
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { Product, ProductType } from '../../types';
import { Plus, GripVertical, Edit, Eye, EyeOff, Trash2, Tag, Layers, CheckSquare, Square, Info, Search, Utensils, Archive, DollarSign, Image as ImageIcon } from 'lucide-react';

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
  
  const [isExtra, setIsExtra] = useState(false);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !restState.products.some(p => p.linkedInventoryItemId === i.id && !editingProduct)
  );

  const sortedProducts = [...restState.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const categories = ['Todas', 'Adicionais', ...Array.from(new Set(restState.products.filter(p => !p.isExtra).map(p => p.category)))];
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
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Utensils size={24} className="text-blue-600"/> Cardápio</h2>
                <p className="text-sm text-gray-500">Gestão de produtos e adicionais vinculados ao estoque.</p>
            </div>
            <Button onClick={handleOpenAdd}><Plus size={18}/> Novo Produto</Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${filterCategory === cat ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{cat}</button>
                ))}
            </div>
            <div className="relative w-full md:w-64"><Search size={18} className="absolute left-3 top-2.5 text-gray-400"/><input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buscar no cardápio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="divide-y divide-gray-100">
                {displayedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                        <div className="w-14 h-14 rounded-lg bg-gray-100 border overflow-hidden shrink-0 shadow-inner"><img src={product.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" /></div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 truncate flex items-center gap-2">{product.name}{product.isExtra && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">Adicional</span>}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5"><span className="bg-gray-100 px-2 py-0.5 rounded">{product.category}</span>{product.linkedExtraIds && product.linkedExtraIds.length > 0 && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1 font-medium"><Layers size={10}/> {product.linkedExtraIds.length} Adicionais vinculados</span>}</div>
                        </div>
                        <div className="text-right shrink-0"><div className="font-bold text-blue-600">R$ {product.price.toFixed(2)}</div><div className="text-[10px] text-gray-400 font-medium">Custo: R$ {(product.costPrice || 0).toFixed(2)}</div></div>
                        <div className="flex gap-1 border-l pl-3 ml-2 shrink-0">
                            <button onClick={() => handleOpenEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
                            <button onClick={() => dispatch({type: 'UPDATE_PRODUCT', product: {...product, isVisible: !product.isVisible}})} className={`p-2 rounded-lg transition-colors ${product.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>{product.isVisible ? <Eye size={18}/> : <EyeOff size={18}/>}</button>
                            <button onClick={() => showConfirm({ title: 'Remover', message: 'Deseja remover do menu?', onConfirm: () => dispatch({type: 'DELETE_PRODUCT', productId: product.id}) })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <Modal isOpen={menuModalOpen} onClose={() => setMenuModalOpen(false)} title={editingProduct ? 'Editar Produto' : 'Novo Produto'} variant="page">
            <form onSubmit={handleSaveProduct} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Archive size={16} className="text-blue-600"/> 1. Origem no Estoque</h4>
                            {!editingProduct ? (
                                <select className="w-full border-2 p-3 rounded-xl text-sm bg-white" value={selectedStockId} onChange={e => setSelectedStockId(e.target.value)} required>
                                    <option value="">Selecione do estoque...</option>
                                    {availableForMenu.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
                                </select>
                            ) : (<div className="p-4 bg-white rounded-xl border border-blue-100 font-bold text-slate-700">{invState.inventory.find(i => i.id === editingProduct.linkedInventoryItemId)?.name}</div>)}
                        </div>
                        <div className={`p-6 rounded-2xl border transition-all ${isExtra ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-4"><h4 className="text-sm font-bold flex items-center gap-2">Tipo de Venda</h4><button type="button" onClick={() => setIsExtra(!isExtra)} className={`p-1.5 rounded-lg ${isExtra ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 border'}`}>{isExtra ? <CheckSquare size={20}/> : <Square size={20}/>}</button></div>
                            <p className="text-[10px] text-slate-500">{isExtra ? 'PRODUTO ADICIONAL (EXTRA)' : 'PRODUTO PRINCIPAL'}</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><DollarSign size={16} className="text-green-600"/> 2. Comercial</h4>
                            <input name="name" className="w-full border-2 p-3 rounded-xl text-sm" defaultValue={editingProduct?.name || invState.inventory.find(i => i.id === selectedStockId)?.name || ''} placeholder="Nome no Cardápio" required />
                            <div className="relative"><span className="absolute left-3 top-3 text-sm font-bold text-slate-400">R$</span><input name="price" type="number" step="0.01" className="w-full border-2 p-3 pl-10 rounded-xl text-lg font-extrabold text-blue-600" defaultValue={editingProduct?.price || ''} required /></div>
                            {!isExtra && <select name="category" className="w-full border-2 p-3 rounded-xl text-sm bg-white" defaultValue={editingProduct?.category || 'Lanches'}>{['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(c => <option key={c} value={c}>{c}</option>)}</select>}
                            <textarea name="description" className="w-full border-2 p-3 rounded-xl text-sm h-24 resize-none" defaultValue={editingProduct?.description || ''} placeholder="Descrição Curta" />
                        </div>
                    </div>
                    <div className="space-y-6">
                        {!isExtra && (
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 h-[300px] overflow-y-auto">
                                <h4 className="text-sm font-bold text-blue-800 mb-4">Adicionais Vinculados</h4>
                                {allAvailableExtras.map(extra => (
                                    <div key={extra.id} onClick={() => toggleExtraSelection(extra.id)} className={`flex items-center justify-between p-3 rounded-xl border-2 mb-2 cursor-pointer transition-all ${selectedExtraIds.includes(extra.id) ? 'bg-white border-blue-500' : 'bg-white/50 border-transparent opacity-60'}`}>
                                        <div className="flex items-center gap-3">{selectedExtraIds.includes(extra.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18} className="text-slate-300"/>}<span className="text-xs font-bold text-slate-700">{extra.name}</span></div>
                                        <span className="text-[10px] font-extrabold text-blue-600">+ R$ {extra.price.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-4"><ImageIcon size={16} className="inline mr-2"/> 3. Imagem</h4>
                            <ImageUploader value={editingProduct?.image || ''} onChange={(val) => { const input = document.getElementById('productImageInput') as HTMLInputElement; if(input) input.value = val; }} />
                            <input type="hidden" name="productImage" id="productImageInput" defaultValue={editingProduct?.image || ''} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 pt-6 border-t mt-8"><Button type="button" variant="secondary" onClick={() => setMenuModalOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1 shadow-lg shadow-blue-200">Salvar Produto</Button></div>
            </form>
        </Modal>
    </div>
  );
};
