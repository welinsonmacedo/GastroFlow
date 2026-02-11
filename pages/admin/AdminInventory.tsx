
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Modal } from '../../components/Modal';
import { InventoryItem, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../../types';
import { Plus, Trash2, Edit, ArrowDown, Layers, ClipboardList, FileText, Truck, X, Star, CheckSquare, Square, Info } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: invState, addInventoryItem, updateInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, processPurchase } = useInventory();
  const { showAlert, showConfirm } = useUI();
  
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [invRecipeStep, setInvRecipeStep] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngredientAdd, setSelectedIngredientAdd] = useState('');
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: number }>({});

  const handleSaveInventoryItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;
      const finalItem: any = { ...editingInventory };
      if (finalItem.type === 'COMPOSITE') {
          finalItem.recipe = invRecipeStep.map(s => ({ ingredientId: s.ingredientId, quantity: s.qty }));
      }
      if (finalItem.id) await updateInventoryItem(finalItem as InventoryItem);
      else await addInventoryItem({ ...finalItem, isExtra: finalItem.isExtra || false } as InventoryItem);
      setEditingInventory(null);
      setInvRecipeStep([]);
      showAlert({ title: "Sucesso", message: "Estoque atualizado!", type: 'SUCCESS' });
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!stockModal) return;
      await updateStock(stockModal.itemId, parseFloat(stockModal.quantity), stockModal.type, stockModal.reason);
      setStockModal(null);
      showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4">
            <div><h2 className="text-2xl font-bold text-gray-800">Estoque Geral</h2><p className="text-sm text-gray-500">Gestão de insumos e adicionais.</p></div>
            <div className="flex gap-2">
                <Button onClick={() => setInventoryModalOpen(true)} variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100"><ClipboardList size={16}/> Balanço</Button>
                <Button onClick={() => setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, isExtra: false })}><Plus size={16}/> Novo Item</Button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase">
                    <tr><th className="p-4">Item</th><th className="p-4 text-center">Tipo</th><th className="p-4 text-right">Qtd</th><th className="p-4 text-right">Custo</th><th className="p-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y">
                    {invState.inventory.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800">{item.name}</span>
                                    {item.isExtra && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-black uppercase"><Star size={8} fill="currentColor"/> Adicional</span>}
                                </div>
                            </td>
                            <td className="p-4 text-center"><span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100">{item.type}</span></td>
                            <td className={`p-4 text-right font-mono font-bold ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-700'}`}>{item.quantity.toFixed(2)}</td>
                            <td className="p-4 text-right text-sm text-emerald-600 font-bold">R$ {item.costPrice.toFixed(2)}</td>
                            <td className="p-4 text-right flex justify-end gap-1">
                                <button onClick={() => { setEditingInventory(item); setInvRecipeStep(item.recipe?.map(r=>({ingredientId: r.ingredientId, qty: r.quantity})) || []); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 text-green-600 hover:bg-green-50 rounded"><Plus size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {editingInventory && (
            <Modal isOpen={!!editingInventory} onClose={() => setEditingInventory(null)} title="Cadastro de Estoque" variant="page">
                <form onSubmit={handleSaveInventoryItem} className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between">
                        <div><h4 className="font-bold text-sm">Disponível como Adicional?</h4><p className="text-xs text-gray-500">Marque para oferecer como opcional em outros pratos.</p></div>
                        <button type="button" onClick={() => setEditingInventory({...editingInventory!, isExtra: !editingInventory.isExtra})} className={`p-2 rounded-lg ${editingInventory.isExtra ? 'bg-amber-500 text-white' : 'bg-white border text-gray-300'}`}>
                            {editingInventory.isExtra ? <CheckSquare size={24}/> : <Square size={24}/>}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="block text-xs font-bold mb-1">Nome</label><input required className="w-full border p-3 rounded-lg" value={editingInventory.name} onChange={e => setEditingInventory({...editingInventory!, name: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold mb-1">Tipo</label><select className="w-full border p-3 rounded-lg bg-white" value={editingInventory.type} onChange={e => setEditingInventory({...editingInventory!, type: e.target.value as InventoryType})}><option value="INGREDIENT">Matéria Prima</option><option value="RESALE">Revenda</option><option value="COMPOSITE">Composto (Prato)</option></select></div>
                        <div><label className="block text-xs font-bold mb-1">Custo Unitário (R$)</label><input type="number" step="0.01" className="w-full border p-3 rounded-lg font-bold" value={editingInventory.costPrice} onChange={e => setEditingInventory({...editingInventory!, costPrice: parseFloat(e.target.value)})} /></div>
                    </div>
                    <div className="flex gap-2 pt-6 border-t"><Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1">Salvar</Button></div>
                </form>
            </Modal>
        )}
    </div>
  );
};
