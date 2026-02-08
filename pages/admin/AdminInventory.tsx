import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Modal } from '../../components/Modal';
import { InventoryItem, Supplier, PurchaseItemInput, PurchaseInstallment } from '../../types';
import { Plus, Trash2, Edit, ArrowDown, Info, Layers, ClipboardList, FileText, Truck, X, AlertTriangle } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const { planLimits } = state;

  // --- State Variables ---
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [invRecipeStep, setInvRecipeStep] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngredientAdd, setSelectedIngredientAdd] = useState('');
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: number }>({});
  
  // Placeholder for purchase logic (can be expanded if needed or kept simple for now)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);

  // --- Handlers ---

  const handleAddIngredientToRecipe = () => {
      if(!selectedIngredientAdd) return;
      const ing = state.inventory.find(i => i.id === selectedIngredientAdd);
      if(ing) {
          setInvRecipeStep([...invRecipeStep, { ingredientId: ing.id, qty: 1 }]);
          setSelectedIngredientAdd('');
      }
  };

  const handleSaveInventoryItem = (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;

      const finalItem: any = { ...editingInventory };
      
      // Recalculate cost for composite items
      if (finalItem.type === 'COMPOSITE') {
          finalItem.recipe = invRecipeStep;
          const cost = invRecipeStep.reduce((acc: number, step: any) => {
              const ing = state.inventory.find(i => i.id === step.ingredientId);
              return acc + ((ing?.costPrice || 0) * step.qty);
          }, 0);
          finalItem.costPrice = cost;
      }

      // Check if ID exists to determine UPDATE or CREATE
      if (finalItem.id) {
          dispatch({ type: 'UPDATE_INVENTORY_ITEM', item: finalItem as InventoryItem });
          showAlert({ title: "Sucesso", message: "Item atualizado com sucesso!", type: 'SUCCESS' });
      } else {
          dispatch({ type: 'ADD_INVENTORY_ITEM', item: finalItem as InventoryItem });
          showAlert({ title: "Sucesso", message: "Item cadastrado no estoque!", type: 'SUCCESS' });
      }

      setEditingInventory(null);
      setInvRecipeStep([]);
  };

  const handleStockUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if(!stockModal) return;
      dispatch({ 
          type: 'UPDATE_STOCK', 
          itemId: stockModal.itemId, 
          operation: stockModal.type, 
          quantity: parseFloat(stockModal.quantity), 
          reason: stockModal.reason 
      });
      setStockModal(null);
      showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
  };

  const handleInventoryInit = () => {
      const initialCounts: {[key:string]: number} = {};
      state.inventory.filter(i => i.type !== 'COMPOSITE').forEach(i => {
          initialCounts[i.id] = i.quantity;
      });
      setInventoryCounts(initialCounts);
      setInventoryModalOpen(true);
  };

  const handleInventorySave = () => {
      const adjustments = Object.keys(inventoryCounts).map(itemId => ({
          itemId,
          realQty: inventoryCounts[itemId]
      }));
      
      dispatch({ type: 'PROCESS_INVENTORY_ADJUSTMENT', adjustments });
      setInventoryModalOpen(false);
      showAlert({ title: "Sucesso", message: "Inventário atualizado com sucesso!", type: 'SUCCESS' });
  };

  // Prepares the edit modal
  const openEditModal = (item: InventoryItem) => {
      setEditingInventory({ ...item });
      // If composite, load existing recipe into state
      if (item.type === 'COMPOSITE' && item.recipe) {
          setInvRecipeStep(item.recipe.map(r => ({ ingredientId: r.ingredientId, qty: r.quantity })));
      } else {
          setInvRecipeStep([]);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Estoque</h2>
                <p className="text-sm text-gray-500">Gestão de produtos e insumos.</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button onClick={handleInventoryInit} variant="secondary" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-xs md:text-sm flex-1 md:flex-none"><ClipboardList size={16}/> Inventário (Balanço)</Button>
                <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, image: '' }); setInvRecipeStep([]); }} className="text-xs md:text-sm flex-1 md:flex-none"><Plus size={16}/> Novo Item</Button>
            </div>
        </div>

        {/* Modal: New/Edit Inventory Item */}
        <Modal 
            isOpen={!!editingInventory} 
            onClose={() => setEditingInventory(null)} 
            title={editingInventory?.id ? 'Editar Item' : 'Novo Item de Estoque'}
            variant="page"
        >
            <form onSubmit={handleSaveInventoryItem} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700">Tipo do Item</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'INGREDIENT'}))} className={`p-2 rounded border text-xs font-bold ${editingInventory?.type === 'INGREDIENT' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-gray-50'}`}>Matéria Prima</button>
                        <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'RESALE'}))} className={`p-2 rounded border text-xs font-bold ${editingInventory?.type === 'RESALE' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>Revenda</button>
                        <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'COMPOSITE'}))} className={`p-2 rounded border text-xs font-bold ${editingInventory?.type === 'COMPOSITE' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-gray-50'}`}>Produzido</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold">Nome</label>
                        <input required className="w-full border p-2 rounded" value={editingInventory?.name || ''} onChange={e => setEditingInventory(prev => ({...prev!, name: e.target.value}))} placeholder={editingInventory?.type === 'COMPOSITE' ? 'Ex: X-Salada' : 'Ex: Farinha de Trigo'} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold">Unidade</label>
                        <select className="w-full border p-2 rounded" value={editingInventory?.unit || 'UN'} onChange={e => setEditingInventory(prev => ({...prev!, unit: e.target.value}))}>
                            <option value="UN">UN</option>
                            <option value="KG">KG</option>
                            <option value="LT">LT</option>
                            <option value="GR">GR</option>
                        </select>
                    </div>
                    {editingInventory?.type !== 'COMPOSITE' && (
                        <div>
                            <label className="block text-xs font-bold">
                                {editingInventory?.id ? 'Custo Médio (R$)' : 'Custo Inicial (R$)'}
                            </label>
                            <input 
                                type="number" 
                                step="0.01" 
                                className={`w-full border p-2 rounded ${editingInventory?.id ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={editingInventory?.costPrice || 0} 
                                onChange={e => setEditingInventory(prev => ({...prev!, costPrice: parseFloat(e.target.value)}))} 
                                disabled={!!editingInventory?.id} // Disable cost editing if exists (managed by purchase)
                            />
                            {editingInventory?.id && (
                                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                    <Info size={10}/> Gerenciado via Notas de Entrada ou Ajuste Manual
                                </p>
                            )}
                        </div>
                    )}
                    {editingInventory?.type !== 'COMPOSITE' && (
                        <div>
                            <label className="block text-xs font-bold">Estoque Atual</label>
                            <input type="number" className="w-full border p-2 rounded bg-gray-50" disabled value={editingInventory?.quantity || 0} />
                            <p className="text-[10px] text-gray-400 mt-1">Use "Ajuste Manual" para alterar</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold">Estoque Mínimo</label>
                        <input type="number" className="w-full border p-2 rounded" value={editingInventory?.minQuantity || 0} onChange={e => setEditingInventory(prev => ({...prev!, minQuantity: parseFloat(e.target.value)}))} />
                    </div>
                </div>
                {(editingInventory?.type === 'RESALE' || editingInventory?.type === 'COMPOSITE') && (
                    <div>
                        <label className="block text-xs font-bold mb-1">Foto do Produto (Opcional)</label>
                        <ImageUploader 
                            value={editingInventory?.image || ''} 
                            onChange={(val) => setEditingInventory(prev => ({...prev!, image: val}))} 
                            maxSizeKB={300} 
                        />
                    </div>
                )}
                {editingInventory?.type === 'COMPOSITE' && (
                    <div className="bg-gray-50 p-4 rounded border mt-4">
                        <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Layers size={14}/> Composição (Ficha Técnica)</h4>
                        <div className="flex gap-2 mb-2">
                            <select className="flex-1 border p-1 text-sm rounded" value={selectedIngredientAdd} onChange={e => setSelectedIngredientAdd(e.target.value)}>
                                <option value="">Adicionar ingrediente...</option>
                                {state.inventory.filter(i => i.type !== 'COMPOSITE').map(i => (
                                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                ))}
                            </select>
                            <button type="button" onClick={handleAddIngredientToRecipe} className="bg-blue-600 text-white px-3 rounded"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {invRecipeStep.map((step, idx) => {
                                const ing = state.inventory.find(i => i.id === step.ingredientId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                                        <span>{ing?.name}</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" step="0.001" 
                                                className="w-16 border p-1 rounded text-right" 
                                                value={step.qty} 
                                                onChange={e => {
                                                    const newSteps = [...invRecipeStep];
                                                    newSteps[idx].qty = parseFloat(e.target.value);
                                                    setInvRecipeStep(newSteps);
                                                }}
                                            />
                                            <span className="text-xs text-gray-500">{ing?.unit}</span>
                                            <button type="button" onClick={() => setInvRecipeStep(invRecipeStep.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-2 text-right text-sm font-bold text-gray-600">
                            Custo Estimado: R$ {invRecipeStep.reduce((acc, step) => {
                                const ing = state.inventory.find(i => i.id === step.ingredientId);
                                return acc + ((ing?.costPrice || 0) * step.qty);
                            }, 0).toFixed(2)}
                        </div>
                    </div>
                )}
                <div className="flex gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar</Button>
                </div>
            </form>
        </Modal>

        {/* Modal: Manual Stock Adjustment */}
        {stockModal && (
            <Modal isOpen={!!stockModal} onClose={() => setStockModal(null)} title={stockModal.type === 'IN' ? 'Entrada Manual' : 'Saída / Perda'} variant="dialog" maxWidth="sm">
                <form onSubmit={handleStockUpdate} className="space-y-3">
                    <input type="number" step="0.001" placeholder="Quantidade" className="w-full border p-2 rounded" value={stockModal.quantity} onChange={e => setStockModal({...stockModal, quantity: e.target.value})} autoFocus />
                    <input type="text" placeholder="Motivo (Ex: Ajuste, Perda, Doação)" className="w-full border p-2 rounded" value={stockModal.reason} onChange={e => setStockModal({...stockModal, reason: e.target.value})} />
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setStockModal(null)} className="flex-1">Cancelar</Button>
                        <Button type="submit" className="flex-1">Confirmar</Button>
                    </div>
                </form>
            </Modal>
        )}

        {/* Modal: Inventory Count (Balanço) */}
        {inventoryModalOpen && (
            <Modal isOpen={inventoryModalOpen} onClose={() => setInventoryModalOpen(false)} title="Contagem de Estoque (Balanço)" variant="page">
                <div className="bg-yellow-50 p-3 rounded mb-4 text-sm text-yellow-800 flex items-center gap-2">
                    <AlertTriangle size={16}/>
                    Informe a quantidade real encontrada fisicamente. O sistema calculará a diferença automaticamente.
                </div>
                <div className="flex-1 overflow-y-auto border rounded-lg max-h-[60vh]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-center">Un</th>
                                <th className="p-3 text-right bg-blue-50">Estoque Sistema</th>
                                <th className="p-3 text-right bg-yellow-50 w-32">Estoque Real</th>
                                <th className="p-3 text-right">Diferença</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {state.inventory.filter(i => i.type !== 'COMPOSITE').map(item => {
                                const currentQty = item.quantity;
                                const realQty = inventoryCounts[item.id] ?? currentQty;
                                const diff = realQty - currentQty;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3 text-center text-xs text-gray-500">{item.unit}</td>
                                        <td className="p-3 text-right font-bold text-blue-700 bg-blue-50/30">{currentQty}</td>
                                        <td className="p-2 bg-yellow-50/30">
                                            <input 
                                                type="number" 
                                                step="0.001"
                                                className="w-full border border-yellow-300 rounded p-1 text-right font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
                                                value={inventoryCounts[item.id] ?? ''} 
                                                onChange={e => setInventoryCounts({...inventoryCounts, [item.id]: parseFloat(e.target.value)})}
                                                placeholder={currentQty.toString()}
                                            />
                                        </td>
                                        <td className={`p-3 text-right font-bold ${diff < 0 ? 'text-red-600' : (diff > 0 ? 'text-green-600' : 'text-gray-400')}`}>
                                            {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex gap-2 pt-4 border-t mt-4">
                    <Button variant="secondary" onClick={() => setInventoryModalOpen(false)} className="flex-1">Cancelar</Button>
                    <Button onClick={handleInventorySave} className="flex-1">Processar Ajustes</Button>
                </div>
            </Modal>
        )}

        {/* Inventory List Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                        <tr>
                            <th className="p-4">Item</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4 text-center">Un</th>
                            <th className="p-4 text-right">Estoque</th>
                            <th className="p-4 text-right">Custo</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {state.inventory.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium flex items-center gap-3">
                                    {item.image && <img src={item.image} className="w-8 h-8 rounded object-cover border" alt="" />}
                                    {item.name}
                                </td>
                                <td className="p-4">
                                    {item.type === 'INGREDIENT' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Matéria Prima</span>}
                                    {item.type === 'RESALE' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Revenda</span>}
                                    {item.type === 'COMPOSITE' && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Prato</span>}
                                </td>
                                <td className="p-4 text-center text-sm">{item.unit}</td>
                                <td className={`p-4 text-right font-bold ${item.type === 'COMPOSITE' ? 'text-gray-400' : (item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-800')}`}>
                                    {item.type === 'COMPOSITE' ? '-' : item.quantity}
                                </td>
                                <td className="p-4 text-right text-sm">R$ {item.costPrice.toFixed(2)}</td>
                                <td className="p-4 flex justify-end gap-2">
                                    <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit size={16}/></button>
                                    {item.type !== 'COMPOSITE' && (
                                        <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Entrada"><Plus size={16}/></button>
                                    )}
                                    {item.type !== 'COMPOSITE' && (
                                        <button onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Saída/Perda"><ArrowDown size={16}/></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};