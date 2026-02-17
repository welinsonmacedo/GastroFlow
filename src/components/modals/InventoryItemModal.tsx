
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ImageUploader } from '../ImageUploader';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { InventoryItem, InventoryType } from '../../types';
import { Layers, CheckSquare, Square, Plus, X, Tag, ScanLine, FileText, Sparkles, Loader2 } from 'lucide-react';
import { generateProductDescription } from '../../services/geminiService';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: InventoryItem | null;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ isOpen, onClose, itemToEdit }) => {
  const { state, addInventoryItem, updateInventoryItem } = useInventory();
  const { showAlert } = useUI();

  const [form, setForm] = useState<Partial<InventoryItem>>({
    name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', description: '', isExtra: false, image: '', targetCategories: []
  });

  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string, quantity: number }[]>([]);
  const [selectedIngToAdd, setSelectedIngToAdd] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setForm({ ...itemToEdit, description: itemToEdit.description || '' });
        setRecipeItems(itemToEdit.recipe?.map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity })) || []);
      } else {
        setForm({ name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', description: '', isExtra: false, image: '', targetCategories: [] });
        setRecipeItems([]);
      }
    }
  }, [isOpen, itemToEdit]);

  const defaultCategories = ['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Mercearia', 'Limpeza', 'Higiene', 'Padaria'];

  const toggleTargetCategory = (cat: string) => {
      const current = form.targetCategories || [];
      if (current.includes(cat)) {
          setForm({ ...form, targetCategories: current.filter(c => c !== cat) });
      } else {
          setForm({ ...form, targetCategories: [...current, cat] });
      }
  };

  const calculateRecipeCost = () => {
    return recipeItems.reduce((acc, item) => {
      const ing = state.inventory.find(i => i.id === item.ingredientId);
      return acc + ((ing?.costPrice || 0) * item.quantity);
    }, 0);
  };

  const handleAddIngToRecipe = () => {
    if (!selectedIngToAdd) return;
    const ing = state.inventory.find(i => i.id === selectedIngToAdd);
    if (ing) {
      setRecipeItems([...recipeItems, { ingredientId: ing.id, quantity: 1 }]);
      setSelectedIngToAdd('');
    }
  };

  const handleGenerateDescription = async () => {
      if (!form.name) return showAlert({ title: "Nome Obrigatório", message: "Preencha o nome do item.", type: 'WARNING' });
      
      setLoadingAI(true);
      try {
          const desc = await generateProductDescription(form.name, form.category || 'Geral');
          setForm({ ...form, description: desc });
      } catch (error) {
          showAlert({ title: "Erro IA", message: "Falha ao gerar descrição.", type: 'ERROR' });
      } finally {
          setLoadingAI(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (form.type !== 'INGREDIENT' && !form.category) {
        return showAlert({ title: "Categoria Obrigatória", message: "Itens de venda (Revenda/Produzido) precisam de uma categoria.", type: 'WARNING' });
    }

    try {
      const finalItem: any = { ...form };
      
      if (finalItem.type === 'COMPOSITE') {
        finalItem.recipe = recipeItems; 
        finalItem.costPrice = calculateRecipeCost();
      }

      if (finalItem.type === 'INGREDIENT') {
          finalItem.salePrice = 0;
          finalItem.category = ''; 
          finalItem.description = ''; // Ingredientes não precisam de descrição de venda
      }

      if (itemToEdit && itemToEdit.id) {
        await updateInventoryItem(finalItem as InventoryItem);
      } else {
        await addInventoryItem(finalItem as InventoryItem);
      }

      showAlert({ title: "Sucesso", message: "Item salvo no estoque!", type: 'SUCCESS' });
      onClose();
    } catch (error: any) {
      console.error("Erro no submit:", error);
      showAlert({ title: "Erro", message: error.message || "Erro ao salvar item.", type: 'ERROR' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={itemToEdit ? "Editar Item" : "Novo Item de Estoque"} variant="page">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Identificação</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Nome do Item</label>
                  <input required className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Filé de Frango, Coca-Cola 350ml" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold mb-1">Código de Barras (EAN)</label>
                  <div className="relative">
                      <ScanLine className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                      <input className="w-full border-2 pl-10 p-3 rounded-xl focus:border-blue-500 outline-none" value={form.barcode || ''} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Escaneie ou digite..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Tipo de Item</label>
                    <select className="w-full border-2 p-3 rounded-xl bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as InventoryType })}>
                      <option value="INGREDIENT">Matéria Prima (Uso Interno)</option>
                      <option value="RESALE">Revenda (Venda Direta)</option>
                      <option value="COMPOSITE">Produzido (Prato/Ficha)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Unidade</label>
                    <select className="w-full border-2 p-3 rounded-xl bg-white" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="LT">LT</option>
                      <option value="GR">GR</option>
                    </select>
                  </div>
                </div>
                
                {form.type !== 'INGREDIENT' && (
                    <div>
                        <label className="block text-xs font-bold mb-1 text-purple-700">Categoria</label>
                        <input className="w-full border-2 p-3 rounded-xl bg-white border-purple-200" list="categories" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} placeholder="Selecione ou digite..." />
                        <datalist id="categories">
                            {defaultCategories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                )}
              </div>
            </div>

            {form.type === 'COMPOSITE' && (
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                <h4 className="text-xs font-black text-purple-700 uppercase tracking-widest mb-4 flex items-center gap-2"><Layers size={14} /> 2. Composição da Ficha Técnica</h4>
                <div className="flex gap-2 mb-4">
                  <select className="flex-1 border-2 p-2 rounded-xl text-sm bg-white" value={selectedIngToAdd} onChange={e => setSelectedIngToAdd(e.target.value)}>
                    <option value="">Escolher Ingrediente...</option>
                    {state.inventory.filter(i => i.type === 'INGREDIENT').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                  <Button type="button" onClick={handleAddIngToRecipe} variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700"><Plus size={18} /></Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {recipeItems.map((step, idx) => {
                    const ing = state.inventory.find(i => i.id === step.ingredientId);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-slate-800 text-sm truncate">{ing?.name}</div>
                          <div className="text-[10px] text-slate-400">Custo unitário: R$ {(ing?.costPrice || 0).toFixed(2)} / {ing?.unit}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.001" 
                            className="w-20 border-2 p-1 rounded-lg text-right font-bold" 
                            value={step.quantity} 
                            onChange={e => {
                                const n = [...recipeItems]; 
                                n[idx].quantity = parseFloat(e.target.value); 
                                setRecipeItems(n);
                            }} 
                          />
                          <button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><X size={16} /></button>
                        </div>
                      </div>
                    );
                  })}
                  {recipeItems.length === 0 && <p className="text-center py-4 text-purple-300 text-xs italic">Nenhum ingrediente adicionado.</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-700 uppercase">Custo Total Calculado:</span>
                  <span className="text-lg font-black text-purple-900">R$ {calculateRecipeCost().toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className={`p-6 rounded-2xl border transition-all ${form.isExtra ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex justify-between items-center mb-4">
                  <div className="pr-4">
                    <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${form.isExtra ? 'text-orange-700' : 'text-slate-500'}`}>Adicional de Venda</h4>
                    <p className={`text-[10px] font-medium ${form.isExtra ? 'text-orange-600' : 'text-slate-400'}`}>Permite oferecer este item como opcional pago no cardápio.</p>
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, isExtra: !form.isExtra })} className={`p-2 rounded-xl transition-all ${form.isExtra ? 'bg-orange-600 text-white shadow-lg' : 'bg-white border text-slate-200'}`}>
                    {form.isExtra ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>
              </div>

              {form.isExtra && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                      <label className="block text-xs font-bold text-orange-800 uppercase mb-2 flex items-center gap-2">
                          <Tag size={12}/> Disponível nas Categorias:
                      </label>
                      <div className="max-h-40 overflow-y-auto space-y-1 bg-white/50 p-2 rounded-xl border border-orange-100">
                          {defaultCategories.map(cat => (
                              <label key={cat} className="flex items-center gap-2 p-1.5 hover:bg-orange-100 rounded cursor-pointer">
                                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${form.targetCategories?.includes(cat) ? 'bg-orange-600 border-orange-600' : 'bg-white border-orange-300'}`}>
                                      {form.targetCategories?.includes(cat) && <CheckSquare size={12} className="text-white"/>}
                                  </div>
                                  <input 
                                      type="checkbox" 
                                      className="hidden" 
                                      checked={form.targetCategories?.includes(cat)} 
                                      onChange={() => toggleTargetCategory(cat)} 
                                  />
                                  <span className="text-xs font-bold text-orange-900">{cat}</span>
                              </label>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">3. Financeiro e Alertas</h4>
              <div className="grid grid-cols-2 gap-4">
                {form.type !== 'INGREDIENT' && (
                    <div>
                        <label className="block text-xs font-bold mb-1 text-emerald-700">Preço de Venda (PDV/Extra)</label>
                        <input type="number" step="0.01" className="w-full border-2 p-3 rounded-xl font-black text-emerald-600 border-emerald-100 bg-emerald-50" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: parseFloat(e.target.value) })} />
                        <p className="text-[10px] text-gray-400 mt-1">Valor de venda final para o cliente.</p>
                    </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold mb-1">Custo Médio (R$)</label>
                  <input type="number" step="0.01" className={`w-full border-2 p-3 rounded-xl font-bold text-gray-600 ${form.type === 'COMPOSITE' ? 'bg-gray-50' : ''}`} value={form.type === 'COMPOSITE' ? calculateRecipeCost() : form.costPrice} onChange={e => setForm({ ...form, costPrice: parseFloat(e.target.value) })} disabled={form.type === 'COMPOSITE'} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Estoque Mínimo</label>
                  <input type="number" className="w-full border-2 p-3 rounded-xl font-bold text-red-600" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: parseFloat(e.target.value) })} />
                </div>
                {!itemToEdit && form.type !== 'COMPOSITE' && (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-blue-600 uppercase">Estoque Inicial</label>
                    <input type="number" step="0.001" className="w-full border-2 border-blue-100 p-3 rounded-xl font-bold bg-blue-50" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) })} />
                  </div>
                )}
              </div>
            </div>
            
            {/* Seção de Imagem e Descrição */}
            {form.type !== 'INGREDIENT' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">4. Detalhes do Produto</h4>
                    
                    <ImageUploader value={form.image || ''} onChange={(val) => setForm({ ...form, image: val })} maxSizeKB={250} />

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
                            value={form.description || ''}
                            onChange={e => setForm({...form, description: e.target.value})}
                        />
                    </div>
                </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 pt-6 border-t">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-4">Cancelar</Button>
          <Button type="submit" className="flex-1 py-4 shadow-xl">Salvar Item de Estoque</Button>
        </div>
      </form>
    </Modal>
  );
};
