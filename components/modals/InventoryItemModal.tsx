
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ImageUploader } from '../ImageUploader';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { InventoryItem, InventoryType } from '../../types';
import { Layers, CheckSquare, Square, Plus, X } from 'lucide-react';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: InventoryItem | null;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ isOpen, onClose, itemToEdit }) => {
  const { state, addInventoryItem, updateInventoryItem } = useInventory();
  const { showAlert } = useUI();

  const [form, setForm] = useState<Partial<InventoryItem>>({
    name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, isExtra: false, image: ''
  });
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngToAdd, setSelectedIngToAdd] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setForm({ ...itemToEdit });
        setRecipeItems(itemToEdit.recipe?.map(r => ({ ingredientId: r.ingredientId, qty: r.quantity })) || []);
      } else {
        setForm({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, isExtra: false, image: '' });
        setRecipeItems([]);
      }
    }
  }, [isOpen, itemToEdit]);

  const calculateRecipeCost = () => {
    return recipeItems.reduce((acc, item) => {
      const ing = state.inventory.find(i => i.id === item.ingredientId);
      return acc + ((ing?.costPrice || 0) * item.qty);
    }, 0);
  };

  const handleAddIngToRecipe = () => {
    if (!selectedIngToAdd) return;
    const ing = state.inventory.find(i => i.id === selectedIngToAdd);
    if (ing) {
      setRecipeItems([...recipeItems, { ingredientId: ing.id, qty: 1 }]);
      setSelectedIngToAdd('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    try {
      const finalItem: any = { ...form };
      if (finalItem.type === 'COMPOSITE') {
        finalItem.recipe = recipeItems;
        finalItem.costPrice = calculateRecipeCost();
      }

      if (itemToEdit && itemToEdit.id) {
        await updateInventoryItem(finalItem as InventoryItem);
      } else {
        await addInventoryItem(finalItem as InventoryItem);
      }

      showAlert({ title: "Sucesso", message: "Item salvo no estoque!", type: 'SUCCESS' });
      onClose();
    } catch (error: any) {
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Tipo de Item</label>
                    <select className="w-full border-2 p-3 rounded-xl bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as InventoryType })}>
                      <option value="INGREDIENT">Matéria Prima</option>
                      <option value="RESALE">Revenda</option>
                      <option value="COMPOSITE">Ficha Técnica (Produzido)</option>
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
                          <div className="text-[10px] text-slate-400">Custo unitário: R$ {ing?.costPrice.toFixed(2)} / {ing?.unit}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.001" className="w-20 border-2 p-1 rounded-lg text-right font-bold" value={step.qty} onChange={e => {
                            const n = [...recipeItems]; n[idx].qty = parseFloat(e.target.value); setRecipeItems(n);
                          }} />
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

            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex justify-between items-center">
              <div className="pr-4">
                <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest mb-1">Adicional de Venda</h4>
                <p className="text-[10px] text-orange-600 font-medium">Permite oferecer este item como opcional pago no cardápio.</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, isExtra: !form.isExtra })} className={`p-2 rounded-xl transition-all ${form.isExtra ? 'bg-orange-600 text-white shadow-lg' : 'bg-white border text-slate-200'}`}>
                {form.isExtra ? <CheckSquare size={24} /> : <Square size={24} />}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">3. Financeiro e Alertas</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Custo Médio (R$)</label>
                  <input type="number" step="0.01" className={`w-full border-2 p-3 rounded-xl font-bold text-emerald-600 ${form.type === 'COMPOSITE' ? 'bg-gray-50' : ''}`} value={form.type === 'COMPOSITE' ? calculateRecipeCost() : form.costPrice} onChange={e => setForm({ ...form, costPrice: parseFloat(e.target.value) })} disabled={form.type === 'COMPOSITE'} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Estoque Mínimo</label>
                  <input type="number" className="w-full border-2 p-3 rounded-xl font-bold text-red-600" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: parseFloat(e.target.value) })} />
                </div>
              </div>
              {!itemToEdit && form.type !== 'COMPOSITE' && (
                <div className="mt-4">
                  <label className="block text-xs font-bold mb-1 text-blue-600 uppercase">Estoque Inicial</label>
                  <input type="number" step="0.001" className="w-full border-2 border-blue-100 p-3 rounded-xl font-bold bg-blue-50" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) })} />
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">4. Imagem do Produto</h4>
              <ImageUploader value={form.image || ''} onChange={(val) => setForm({ ...form, image: val })} maxSizeKB={250} />
            </div>
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
