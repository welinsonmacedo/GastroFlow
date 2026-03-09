
import React, { useState } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useInventory } from '@/core/context/InventoryContext';
import { useUI } from '@/core/context/UIContext';
import { Button } from '../../../components/Button';
import { InventoryItem } from '@/types';
import { ImageUploader } from '../../../components/ImageUploader';
import { PlusCircle, Layers, Plus, X, ScanLine, Tag, DollarSign, Package, FileText, Sparkles, Loader2 } from 'lucide-react';
import { generateProductDescription } from '@/core/services/geminiService';

export const InventoryNewItemView: React.FC<{ onCancel?: () => void }> = ({ onCancel }) => {
  const { state: invState, addInventoryItem } = useInventory();
  const { state: restaurantState } = useRestaurant();
  const { planLimits } = restaurantState;
  const { showAlert } = useUI();
  
  const [newItemForm, setNewItemForm] = useState<Partial<InventoryItem>>({
    name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', description: '', isExtra: false, image: '', targetCategories: []
  });
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string, quantity: number }[]>([]);
  const [selectedIngToAdd, setSelectedIngToAdd] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  
  const defaultCategories = ['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Mercearia', 'Limpeza', 'Higiene', 'Padaria'];

  const toggleTargetCategory = (cat: string) => {
      const current = newItemForm.targetCategories || [];
      setNewItemForm({ ...newItemForm, targetCategories: current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat] });
  };

  const handleGenerateDescription = async () => {
      if (!newItemForm.name) return showAlert({ title: "Nome Obrigatório", message: "Preencha o nome do item.", type: 'WARNING' });
      
      setLoadingAI(true);
      try {
          const desc = await generateProductDescription(newItemForm.name, newItemForm.category || 'Geral');
          setNewItemForm({ ...newItemForm, description: desc });
      } catch (error) {
          showAlert({ title: "Erro IA", message: "Falha ao gerar descrição.", type: 'ERROR' });
      } finally {
          setLoadingAI(false);
      }
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
      if (finalItem.type === 'INGREDIENT') { 
          finalItem.salePrice = 0; 
          finalItem.category = ''; 
          finalItem.description = '';
      }

      await addInventoryItem(finalItem as InventoryItem);
      showAlert({ title: "Sucesso", message: "Item criado com sucesso!", type: 'SUCCESS' });
      // Reset form
      setNewItemForm({ name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', description: '', isExtra: false, image: '', targetCategories: [] });
      setRecipeItems([]);
    } catch (error: any) {
      showAlert({ title: "Erro", message: error.message, type: 'ERROR' });
    }
  };

  return (
      <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-fade-in flex flex-col h-full overflow-hidden">
          <header className="mb-6 border-b pb-4 shrink-0 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><PlusCircle size={24} className="text-blue-600"/> Cadastrar Novo Item</h2>
                <p className="text-sm text-gray-500">Adicione insumos, produtos de revenda ou pratos.</p>
              </div>
          </header>
          
          <form onSubmit={handleSaveNewItem} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto custom-scrollbar flex-1 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Coluna 1: Identificação */}
                      <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 h-fit">
                          <h3 className="font-black text-gray-600 text-xs uppercase tracking-widest border-b pb-2 mb-2 flex items-center gap-2"><Tag size={14}/> 1. Identificação</h3>
                          
                          <div>
                              <label className="block text-xs font-bold mb-1 text-slate-600">Nome do Item</label>
                              <input required className="w-full border p-2.5 rounded-xl focus:border-blue-500 outline-none bg-white" value={newItemForm.name} onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} placeholder="Ex: Queijo Mussarela" />
                          </div>
                          
                          <div>
                              <label className="block text-xs font-bold mb-1 text-slate-600">Código de Barras / EAN</label>
                              <div className="relative">
                                  <ScanLine size={16} className="absolute left-3 top-3 text-gray-400"/>
                                  <input className="w-full border p-2.5 pl-9 rounded-xl focus:border-blue-500 outline-none bg-white font-mono text-sm" value={newItemForm.barcode} onChange={e => setNewItemForm({ ...newItemForm, barcode: e.target.value })} placeholder="Sem código" />
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-xs font-bold mb-1 text-slate-600">Tipo</label>
                                  <select className="w-full border p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none text-sm" value={newItemForm.type} onChange={e => setNewItemForm({ ...newItemForm, type: e.target.value as any })}>
                                      {planLimits.allowRawMaterials && <option value="INGREDIENT">Matéria Prima</option>}
                                      <option value="RESALE">Revenda</option>
                                      {planLimits.allowCompositeProducts && <option value="COMPOSITE">Produzido</option>}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold mb-1 text-slate-600">Unidade</label>
                                  <select className="w-full border p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none text-sm" value={newItemForm.unit} onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })}>
                                      <option value="UN">UN</option>
                                      <option value="KG">KG</option>
                                      <option value="LT">LT</option>
                                  </select>
                              </div>
                          </div>
                          
                          {newItemForm.type !== 'INGREDIENT' && (
                              <div>
                                <label className="block text-xs font-bold mb-1 text-purple-700">Categoria (Cardápio)</label>
                                <input className="w-full border p-2.5 rounded-xl focus:border-purple-500 outline-none bg-white" list="categories" value={newItemForm.category} onChange={e => setNewItemForm({...newItemForm, category: e.target.value})} placeholder="Selecione ou digite..." />
                                <datalist id="categories">{defaultCategories.map(c => <option key={c} value={c}/>)}</datalist>
                              </div>
                          )}
                      </div>

                      {/* Coluna 2: Custos e Estoque */}
                      <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 h-fit">
                          <h3 className="font-black text-gray-600 text-xs uppercase tracking-widest border-b pb-2 mb-2 flex items-center gap-2"><DollarSign size={14}/> 2. Estoque & Valores</h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                              {newItemForm.type !== 'COMPOSITE' ? (
                                  <div>
                                      <label className="block text-xs font-bold mb-1 text-blue-600">Estoque Inicial</label>
                                      <input type="number" step="0.001" className="w-full border border-blue-200 p-2.5 rounded-xl font-bold bg-white text-blue-800 outline-none" value={newItemForm.quantity} onChange={e => setNewItemForm({...newItemForm, quantity: parseFloat(e.target.value)})} />
                                  </div>
                              ) : (
                                  <div>
                                      <label className="block text-xs font-bold mb-1 text-slate-400">Estoque (Pratos)</label>
                                      <input disabled className="w-full border bg-gray-100 p-2.5 rounded-xl text-slate-400" value="Automático" />
                                  </div>
                              )}
                              
                              <div>
                                  <label className="block text-xs font-bold mb-1 text-slate-600">Mínimo (Alerta)</label>
                                  <input type="number" className="w-full border p-2.5 rounded-xl focus:border-blue-500 outline-none bg-white" value={newItemForm.minQuantity} onChange={e => setNewItemForm({...newItemForm, minQuantity: parseFloat(e.target.value)})} />
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-xs font-bold mb-1 text-slate-600">Custo (R$)</label>
                                  <input 
                                      type="number" step="0.01" 
                                      className={`w-full border p-2.5 rounded-xl focus:border-blue-500 outline-none ${newItemForm.type === 'COMPOSITE' ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                                      value={newItemForm.type === 'COMPOSITE' ? newItemForm.costPrice?.toFixed(2) : newItemForm.costPrice} 
                                      onChange={e => setNewItemForm({...newItemForm, costPrice: parseFloat(e.target.value)})} 
                                      disabled={newItemForm.type === 'COMPOSITE'}
                                  />
                              </div>
                              {newItemForm.type !== 'INGREDIENT' && (
                                  <div>
                                      <label className="block text-xs font-bold mb-1 text-emerald-600">Venda (R$)</label>
                                      <input type="number" step="0.01" className="w-full border-2 border-emerald-100 p-2.5 rounded-xl font-black text-emerald-600 bg-white text-lg outline-none focus:border-emerald-400" value={newItemForm.salePrice} onChange={e => setNewItemForm({...newItemForm, salePrice: parseFloat(e.target.value)})} />
                                  </div>
                              )}
                          </div>

                          {/* Checkbox Adicional */}
                          {planLimits.allowProductExtras && (
                              <div className="p-3 bg-white rounded-xl border border-orange-100 mt-2">
                                   <label className="flex items-center gap-3 cursor-pointer">
                                       <input type="checkbox" checked={newItemForm.isExtra} onChange={e => setNewItemForm({...newItemForm, isExtra: e.target.checked})} className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"/>
                                       <span className="text-xs font-bold text-slate-700">Vender como Adicional?</span>
                                   </label>
                                   {newItemForm.isExtra && (
                                       <div className="mt-2 pl-7">
                                           <p className="text-[10px] font-bold text-orange-800 mb-1">Categorias permitidas:</p>
                                           <div className="flex flex-wrap gap-1">
                                               {defaultCategories.slice(0,5).map(cat => (
                                                   <button type="button" key={cat} onClick={() => toggleTargetCategory(cat)} className={`text-[9px] px-2 py-0.5 rounded border ${newItemForm.targetCategories?.includes(cat) ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                                                       {cat}
                                                   </button>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                              </div>
                          )}
                      </div>

                      {/* Coluna 3: Composição ou Imagem */}
                      <div className="space-y-5 h-full flex flex-col">
                          {newItemForm.type === 'COMPOSITE' ? (
                              <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 h-full flex flex-col">
                                  <h4 className="text-xs font-black text-purple-700 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Receita (Ficha Técnica)</h4>
                                  <div className="flex gap-2 mb-3">
                                      <select className="flex-1 text-sm border p-2 rounded-lg bg-white focus:border-purple-500 outline-none" value={selectedIngToAdd} onChange={e => setSelectedIngToAdd(e.target.value)}>
                                          <option value="">Adicionar Insumo...</option>
                                          {invState.inventory.filter(i => i.type === 'INGREDIENT').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                      </select>
                                      <Button type="button" size="sm" onClick={() => { if(selectedIngToAdd) { setRecipeItems([...recipeItems, { ingredientId: selectedIngToAdd, quantity: 1 }]); setSelectedIngToAdd(''); } }} className="bg-purple-600 hover:bg-purple-700 text-white"><Plus size={16}/></Button>
                                  </div>
                                  <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 bg-white/50 rounded-xl p-2 border border-purple-100 min-h-[150px]">
                                      {recipeItems.map((r, idx) => {
                                          const ing = invState.inventory.find(i => i.id === r.ingredientId);
                                          return (
                                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm text-xs">
                                                  <span className="font-bold text-slate-700 truncate max-w-[100px]">{ing?.name}</span>
                                                  <div className="flex items-center gap-1">
                                                      <input type="number" step="0.001" className="w-16 border p-1 rounded text-right font-mono" value={r.quantity} onChange={e => { const n = [...recipeItems]; n[idx].quantity = parseFloat(e.target.value); setRecipeItems(n); }} />
                                                      <span className="text-[9px] text-gray-400">{ing?.unit}</span>
                                                      <button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><X size={14}/></button>
                                                  </div>
                                              </div>
                                          )
                                      })}
                                      {recipeItems.length === 0 && <p className="text-center text-purple-300 text-xs italic py-4">Nenhum ingrediente.</p>}
                                  </div>
                              </div>
                          ) : (
                                <div className="space-y-4">
                                     {newItemForm.type !== 'INGREDIENT' && (
                                          <div className="border rounded-2xl p-5 bg-gray-50 h-full flex flex-col">
                                              <h3 className="font-bold text-gray-800 text-sm mb-3">Imagem do Produto</h3>
                                              <div className="flex-1 flex flex-col justify-center">
                                                  {planLimits.allowProductImages && (
                                                      <ImageUploader value={newItemForm.image || ''} onChange={(val) => setNewItemForm({...newItemForm, image: val})} maxSizeKB={200} />
                                                  )}
                                              </div>
                                              
                                              {planLimits.allowProductDescription && (
                                                  <div className="mt-4">
                                                      <div className="flex justify-between items-center mb-1">
                                                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                              <FileText size={14}/> Descrição do Cardápio
                                                          </label>
                                                          <button 
                                                              type="button"
                                                              onClick={handleGenerateDescription}
                                                              disabled={loadingAI}
                                                              className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                                                          >
                                                              {loadingAI ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                                                              Gerar com IA
                                                          </button>
                                                      </div>
                                                      <textarea 
                                                          className="w-full border-2 p-2 rounded-xl text-sm outline-none focus:border-blue-500 resize-none h-24"
                                                          placeholder="Descreva o produto..."
                                                          value={newItemForm.description || ''}
                                                          onChange={e => setNewItemForm({...newItemForm, description: e.target.value})}
                                                      />
                                                  </div>
                                              )}
                                          </div>
                                     )}
                                     {newItemForm.type === 'INGREDIENT' && (
                                          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 h-full">
                                              <Package size={48} className="mb-2 opacity-20"/>
                                              <p className="text-xs text-center">Matéria prima não necessita de imagem.</p>
                                          </div>
                                     )}
                                </div>
                          )}
                          
                          {/* Image Uploader for Composite */}
                          {newItemForm.type === 'COMPOSITE' && (
                              <div className="border rounded-xl p-3 bg-gray-50 mt-2 space-y-4">
                                  {planLimits.allowProductImages && (
                                      <div>
                                          <label className="block text-xs font-bold mb-2 text-slate-600">Foto do Prato</label>
                                          <ImageUploader value={newItemForm.image || ''} onChange={(val) => setNewItemForm({...newItemForm, image: val})} maxSizeKB={200} />
                                      </div>
                                  )}
                                  {planLimits.allowProductDescription && (
                                      <div>
                                          <div className="flex justify-between items-center mb-1">
                                              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                  <FileText size={14}/> Descrição do Cardápio
                                              </label>
                                              <button 
                                                  type="button"
                                                  onClick={handleGenerateDescription}
                                                  disabled={loadingAI}
                                                  className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                                              >
                                                  {loadingAI ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                                                  Gerar com IA
                                              </button>
                                          </div>
                                          <textarea 
                                              className="w-full border-2 p-2 rounded-xl text-sm outline-none focus:border-blue-500 resize-none h-24"
                                              placeholder="Descreva o produto..."
                                              value={newItemForm.description || ''}
                                              onChange={e => setNewItemForm({...newItemForm, description: e.target.value})}
                                          />
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
              
              <div className="pt-4 mt-auto border-t flex gap-4">
                  {onCancel && (
                      <Button type="button" variant="secondary" onClick={onCancel} className="w-1/3 py-4 text-lg shadow-sm font-bold">Cancelar</Button>
                  )}
                  <Button type="submit" className="flex-1 py-4 text-lg shadow-lg font-bold">Salvar Item no Estoque</Button>
              </div>
          </form>
      </div>
  );
};
