
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useMenu } from '../../context/MenuContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Product, ProductType, InventoryItem } from '../../types';
import { Archive, FileText, DollarSign, Sparkles, Loader2 } from 'lucide-react';
import { generateProductDescription } from '../../services/geminiService';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const { state: menuState, addProduct, updateProduct } = useMenu();
  const { state: invState, addInventoryItem } = useInventory();
  const { state: restState } = useRestaurant();
  const { showAlert } = useUI();

  const { planLimits } = restState;
  const allowInventory = planLimits.allowInventory;

  // State
  const [mode, setMode] = useState<'LINK' | 'CREATE'>('LINK'); // LINK = Vincular existente, CREATE = Criar novo (Background)
  const [selectedStockId, setSelectedStockId] = useState('');
  
  // Fields for simple creation (No Inventory Plan)
  const [simpleName, setSimpleName] = useState('');
  const [simplePrice, setSimplePrice] = useState(0);
  const [simpleCategory, setSimpleCategory] = useState('');
  
  // Common
  const [description, setDescription] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (productToEdit) {
            setMode('LINK'); // Edição sempre mostra o vínculo atual
            setSelectedStockId(productToEdit.linkedInventoryItemId || '');
            setDescription(productToEdit.description || '');
            setSimpleName(productToEdit.name);
            setSimplePrice(productToEdit.price);
            setSimpleCategory(productToEdit.category);
        } else {
            // Se tem inventário, padrão é vincular. Se não tem, padrão é criar simples.
            setMode(allowInventory ? 'LINK' : 'CREATE');
            setSelectedStockId('');
            setDescription('');
            setSimpleName('');
            setSimplePrice(0);
            setSimpleCategory('');
        }
    }
  }, [isOpen, productToEdit, allowInventory]);

  // Se seleciona um item do estoque, puxa a descrição dele se o campo estiver vazio
  useEffect(() => {
      if (selectedStockId && mode === 'LINK' && !productToEdit) {
          const stockItem = invState.inventory.find(i => i.id === selectedStockId);
          if (stockItem && stockItem.description && !description) {
              setDescription(stockItem.description);
          }
      }
  }, [selectedStockId, mode]);

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !menuState.products.some(p => p.linkedInventoryItemId === i.id && (!productToEdit || p.id !== productToEdit.id)) &&
      !i.isExtra 
  );

  const defaultCategories = ['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'];

  const handleGenerateDescription = async () => {
      let name = '';
      let category = '';

      if (mode === 'LINK') {
          const item = invState.inventory.find(i => i.id === selectedStockId);
          if (item) {
              name = item.name;
              category = item.category || 'Geral';
          }
      } else {
          name = simpleName;
          category = simpleCategory;
      }

      if (!name) return showAlert({ title: "Nome Obrigatório", message: "Preencha o nome antes de gerar a descrição.", type: 'WARNING' });

      setLoadingAI(true);
      try {
          const generated = await generateProductDescription(name, category);
          setDescription(generated);
      } catch (error) {
          showAlert({ title: "Erro IA", message: "Não foi possível gerar a descrição.", type: 'ERROR' });
      } finally {
          setLoadingAI(false);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let targetStockId = selectedStockId;
      let targetName = '';
      let targetPrice = 0;
      let targetCategory = '';
      let targetImage = '';

      try {
          if (mode === 'CREATE') {
              // MODO SIMPLES (Plano Básico ou Criação Rápida)
              if (!simpleName || !simpleCategory) return showAlert({ title: "Dados Incompletos", message: "Preencha nome e categoria.", type: 'WARNING' });

              // Cria o item no inventário em background para manter a integridade referencial
              const newItem: InventoryItem = {
                  id: Math.random().toString(36).substr(2, 9), // ID temporário, será substituído
                  name: simpleName,
                  unit: 'UN',
                  type: 'RESALE',
                  quantity: 999, // Estoque infinito para planos básicos
                  minQuantity: 0,
                  costPrice: 0,
                  salePrice: simplePrice,
                  category: simpleCategory,
                  description: description, // Salva descrição no estoque também
                  isExtra: false,
                  image: ''
              };

              const createdId = await addInventoryItem(newItem);
              
              if (createdId) {
                  targetStockId = createdId;
              } else {
                  // Se falhar a criação do item de estoque (raro), não podemos criar o produto corretamente vinculado
                  throw new Error("Erro ao gerar item base no estoque.");
              }
              
              targetName = simpleName;
              targetPrice = simplePrice;
              targetCategory = simpleCategory;

          } else {
              // MODO VÍNCULO (Padrão para quem usa estoque)
              const stockItem = invState.inventory.find(i => i.id === selectedStockId);
              if (!stockItem) return showAlert({ title: "Erro", message: "Selecione um item do estoque.", type: 'ERROR' });
              
              if (!stockItem.category) {
                  return showAlert({ title: "Sem Categoria", message: "O item selecionado não tem categoria no estoque. Edite o item no painel de Estoque.", type: 'WARNING' });
              }

              targetStockId = stockItem.id;
              targetName = stockItem.name;
              targetPrice = stockItem.salePrice;
              targetCategory = stockItem.category;
              targetImage = stockItem.image || '';
          }

          const productData = {
              name: targetName,
              price: targetPrice,
              category: targetCategory,
              description: description,
              image: targetImage,
              linkedInventoryItemId: targetStockId, // Agora temos certeza que tem um ID válido
              isExtra: false,
              linkedExtraIds: [],
              targetCategories: [],
              costPrice: 0,
              type: ProductType.KITCHEN, // Default
              isVisible: true
          };

          if (productToEdit) {
              await updateProduct({ 
                  ...productToEdit, 
                  ...productData,
                  linkedExtraIds: productToEdit.linkedExtraIds || [],
              } as Product);
          } else {
              await addProduct({
                  ...productData,
                  sortOrder: menuState.products.length + 1,
              });
          }
          
          showAlert({ title: "Sucesso", message: "Produto salvo no cardápio!", type: 'SUCCESS' });
          onClose();
      } catch (error: any) {
          console.error(error);
          showAlert({ title: "Erro", message: error.message || "Falha ao salvar produto.", type: 'ERROR' });
      }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={productToEdit ? 'Editar Produto' : 'Novo Produto'}
        variant="dialog"
        maxWidth="md"
    >
        <form onSubmit={handleSave} className="space-y-6">
            
            {/* Se o plano permitir inventário, o usuário deve preferencialmente vincular, mas damos opção */}
            {allowInventory && !productToEdit && (
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                    <button type="button" onClick={() => setMode('LINK')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'LINK' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Vincular Estoque (Recomendado)</button>
                    <button type="button" onClick={() => setMode('CREATE')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'CREATE' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Criação Rápida</button>
                </div>
            )}

            {!allowInventory && (
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs text-orange-800 mb-4">
                    <p>Seu plano atual não possui controle de estoque avançado. Os produtos criados aqui terão estoque infinito.</p>
                </div>
            )}

            {mode === 'LINK' ? (
                <>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 mb-4">
                        <p>O <strong>preço</strong>, <strong>nome</strong> e <strong>categoria</strong> são sincronizados automaticamente com o Estoque.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <Archive size={16} className="text-blue-600"/> Item do Estoque (Vínculo)
                        </label>
                        <select 
                            className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none shadow-sm transition-all" 
                            value={selectedStockId} 
                            onChange={e => setSelectedStockId(e.target.value)}
                            required
                            disabled={!!productToEdit} 
                        >
                            <option value="">Selecione...</option>
                            {availableForMenu.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.category || 'Sem Categoria'}) - R$ {i.salePrice.toFixed(2)}</option>
                            ))}
                            {productToEdit && (
                                <option value={productToEdit.linkedInventoryItemId}>
                                    {invState.inventory.find(i => i.id === productToEdit.linkedInventoryItemId)?.name} (Atual)
                                </option>
                            )}
                        </select>
                    </div>

                    {selectedStockId && (
                        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                            <span className="text-xs text-gray-500 uppercase font-bold">Categoria Atual:</span>
                            <div className="font-bold text-slate-700 bg-white px-2 py-1 rounded border">
                                {invState.inventory.find(i => i.id === selectedStockId)?.category || 'Nenhuma'}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                // MODO SIMPLES (Criação Direta)
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Produto</label>
                        <input className="w-full border p-2.5 rounded-xl" value={simpleName} onChange={e => setSimpleName(e.target.value)} placeholder="Ex: X-Burger" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$)</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-3 top-3.5 text-gray-400"/>
                                <input type="number" step="0.01" className="w-full border p-2.5 pl-8 rounded-xl font-bold text-slate-800" value={simplePrice} onChange={e => setSimplePrice(parseFloat(e.target.value))} required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                            <select className="w-full border p-2.5 rounded-xl bg-white" value={simpleCategory} onChange={e => setSimpleCategory(e.target.value)} required>
                                <option value="">Selecione...</option>
                                {defaultCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <FileText size={16} className="text-blue-600"/> Descrição para o Cliente
                    </label>
                    <button 
                        type="button"
                        onClick={handleGenerateDescription}
                        disabled={loadingAI}
                        className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                    >
                        {loadingAI ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                        Gerar com IA
                    </button>
                </div>
                <textarea
                    className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none shadow-sm transition-all resize-none"
                    rows={3}
                    placeholder="Descreva o prato de forma apetitosa..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1 text-right">{description.length}/150 caracteres</p>
            </div>

            <div className="flex gap-4 pt-4 border-t mt-4">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1 text-sm font-bold">Cancelar</Button>
                <Button type="submit" className="flex-1 text-sm font-bold shadow-lg">Salvar Produto</Button>
            </div>
        </form>
    </Modal>
  );
};
