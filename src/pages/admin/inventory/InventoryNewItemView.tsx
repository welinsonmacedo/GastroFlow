
import React, { useState } from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { InventoryItem } from '../../../types';
import { ImageUploader } from '../../../components/ImageUploader';
import { PlusCircle, Layers, Plus, X } from 'lucide-react';

export const InventoryNewItemView: React.FC = () => {
  const { state: invState, addInventoryItem } = useInventory();
  const { showAlert } = useUI();
  
  const [newItemForm, setNewItemForm] = useState<Partial<InventoryItem>>({
    name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', isExtra: false, image: '', targetCategories: []
  });
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string, quantity: number }[]>([]);
  const [selectedIngToAdd, setSelectedIngToAdd] = useState('');
  
  const defaultCategories = ['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Mercearia', 'Limpeza', 'Higiene', 'Padaria'];

  const toggleTargetCategory = (cat: string) => {
      const current = newItemForm.targetCategories || [];
      setNewItemForm({ ...newItemForm, targetCategories: current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat] });
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name) return;
    if (newItemForm.type !== 'INGREDIENT' && !newItemForm.category) {
        return showAlert({ title: "Categoria Obrigatória", message: "Itens de venda precisam de uma categoria.", type: 'WARNING' });
    }

    try {
      const finalItem: any = { ...newItemForm };
      if (finalItem.type === 'COMPOSITE') {
        finalItem.recipe = recipeItems;
        finalItem.costPrice = recipeItems.reduce((acc: number, item: any) => {
             const ing = invState.inventory.find(i => i.id === item.ingredientId);
             return acc + ((ing?.costPrice || 0) * item.quantity);
        }, 0);
      }
      if (finalItem.type === 'INGREDIENT') { finalItem.salePrice = 0; finalItem.category = ''; }

      await addInventoryItem(finalItem as InventoryItem);
      showAlert({ title: "Sucesso", message: "Item criado com sucesso!", type: 'SUCCESS' });
      // Reset form
      setNewItemForm({ name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', isExtra: false, image: '', targetCategories: [] });
      setRecipeItems([]);
    } catch (error: any) {
      showAlert({ title: "Erro", message: error.message, type: 'ERROR' });
    }
  };

  return (
      <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in flex flex-col h-full overflow-y-auto custom-scrollbar">
          <header className="mb-6 border-b pb-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><PlusCircle size={24} className="text-blue-600"/> Cadastrar Novo Item</h2>
              <p className="text-sm text-gray-500">Adicione insumos ou produtos para venda.</p>
          </header>
          
          <form onSubmit={handleSaveNewItem} className="space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Coluna 1 */}
                  <div className="space-y-5">
                      <div><label className="block text-xs font-bold mb-1 text-slate-600">Nome do Item</label><input required className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none transition-colors bg-gray-50 focus:bg-white" value={newItemForm.name} onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} placeholder="Ex: Queijo Mussarela" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold mb-1 text-slate-600">Tipo</label><select className="w-full border p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={newItemForm.type} onChange={e => setNewItemForm({ ...newItemForm, type: e.target.value as any })}><option value="INGREDIENT">Matéria Prima</option><option value="RESALE">Revenda</option><option value="COMPOSITE">Produzido (Prato)</option></select></div>
                          <div><label className="block text-xs font-bold mb-1 text-slate-600">Unidade</label><select className="w-full border p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={newItemForm.unit} onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })}><option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option></select></div>
                      </div>
                      
                      {/* Categoria apenas para Venda */}
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div>
                            <label className="block text-xs font-bold mb-1 text-purple-700">Categoria (Cardápio)</label>
                            <input className="w-full border p-3 rounded-xl focus:border-purple-500 outline-none" list="categories" value={newItemForm.category} onChange={e => setNewItemForm({...newItemForm, category: e.target.value})} placeholder="Selecione ou digite..." />
                            <datalist id="categories">{defaultCategories.map(c => <option key={c} value={c}/>)}</datalist>
                          </div>
                      )}

                      {/* Checkbox Adicional */}
                      <div className="p-5 bg-orange-50/50 rounded-xl border border-orange-100">
                           <label className="flex items-center gap-3 cursor-pointer">
                               <input type="checkbox" checked={newItemForm.isExtra} onChange={e => setNewItemForm({...newItemForm, isExtra: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"/>
                               <span className="text-sm font-bold text-slate-700">Item Adicional (Extra)?</span>
                           </label>
                           {newItemForm.isExtra && (
                               <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                   <p className="text-xs font-bold text-orange-800 mb-2">Disponível nas categorias:</p>
                                   {defaultCategories.map(cat => (
                                       <label key={cat} className="flex items-center gap-2 text-xs p-2 bg-white rounded-lg border border-orange-100 hover:border-orange-300 cursor-pointer transition-all">
                                           <input type="checkbox" checked={newItemForm.targetCategories?.includes(cat)} onChange={() => toggleTargetCategory(cat)} className="rounded text-orange-500 focus:ring-0"/> {cat}
                                       </label>
                                   ))}
                               </div>
                           )}
                      </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-5">
                      {newItemForm.type === 'COMPOSITE' ? (
                          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 h-full flex flex-col">
                              <h4 className="text-xs font-black text-purple-700 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Receita (Ficha Técnica)</h4>
                              <div className="flex gap-2 mb-3">
                                  <select className="flex-1 text-sm border p-2.5 rounded-lg bg-white focus:border-purple-500 outline-none" value={selectedIngToAdd} onChange={e => setSelectedIngToAdd(e.target.value)}>
                                      <option value="">Adicionar Insumo...</option>
                                      {invState.inventory.filter(i => i.type === 'INGREDIENT').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                  </select>
                                  <Button type="button" size="sm" onClick={() => { if(selectedIngToAdd) { setRecipeItems([...recipeItems, { ingredientId: selectedIngToAdd, quantity: 1 }]); setSelectedIngToAdd(''); } }} className="bg-purple-600 hover:bg-purple-700 text-white"><Plus size={16}/></Button>
                              </div>
                              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 bg-white/50 rounded-xl p-2 border border-purple-100">
                                  {recipeItems.map((r, idx) => {
                                      const ing = invState.inventory.find(i => i.id === r.ingredientId);
                                      return (
                                          <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
                                              <span className="font-bold text-slate-700">{ing?.name}</span>
                                              <div className="flex items-center gap-2"><input type="number" step="0.001" className="w-20 border p-1.5 rounded text-right font-mono" value={r.quantity} onChange={e => { const n = [...recipeItems]; n[idx].quantity = parseFloat(e.target.value); setRecipeItems(n); }} /><button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded hover:bg-red-100 transition-colors"><X size={14}/></button></div>
                                          </div>
                                      )
                                  })}
                                  {recipeItems.length === 0 && <p className="text-center text-purple-300 text-xs italic py-4">Nenhum ingrediente adicionado.</p>}
                              </div>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold mb-1 text-blue-600">Estoque Inicial</label><input type="number" step="0.001" className="w-full border-2 border-blue-100 p-3 rounded-xl font-bold bg-blue-50 text-blue-800 outline-none focus:border-blue-400" value={newItemForm.quantity} onChange={e => setNewItemForm({...newItemForm, quantity: parseFloat(e.target.value)})} /></div>
                              <div><label className="block text-xs font-bold mb-1 text-slate-600">Estoque Mínimo</label><input type="number" className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none" value={newItemForm.minQuantity} onChange={e => setNewItemForm({...newItemForm, minQuantity: parseFloat(e.target.value)})} /></div>
                              <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-slate-600">Custo Médio (R$)</label><input type="number" step="0.01" className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none" value={newItemForm.costPrice} onChange={e => setNewItemForm({...newItemForm, costPrice: parseFloat(e.target.value)})} /></div>
                          </div>
                      )}
                      
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div><label className="block text-xs font-bold mb-1 text-emerald-600">Preço de Venda (R$)</label><input type="number" step="0.01" className="w-full border-2 border-emerald-100 p-3 rounded-xl font-black text-emerald-600 bg-emerald-50 text-xl outline-none focus:border-emerald-400" value={newItemForm.salePrice} onChange={e => setNewItemForm({...newItemForm, salePrice: parseFloat(e.target.value)})} /></div>
                      )}

                      {/* Image Uploader */}
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div className="border rounded-xl p-4 bg-gray-50">
                              <label className="block text-xs font-bold mb-2 text-slate-600">Imagem do Produto</label>
                              <ImageUploader value={newItemForm.image || ''} onChange={(val) => setNewItemForm({...newItemForm, image: val})} maxSizeKB={200} />
                          </div>
                      )}
                  </div>
              </div>
              <div className="border-t pt-4 mt-auto">
                  <Button type="submit" className="w-full py-4 text-lg shadow-lg font-bold">Salvar Item no Estoque</Button>
              </div>
          </form>
      </div>
  );
};
