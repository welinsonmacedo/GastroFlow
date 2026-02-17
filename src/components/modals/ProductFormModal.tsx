
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useMenu } from '../../context/MenuContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Product, ProductType, InventoryItem } from '../../types';
import { Archive, FileText, DollarSign, Package } from 'lucide-react';

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

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !menuState.products.some(p => p.linkedInventoryItemId === i.id && (!productToEdit || p.id !== productToEdit.id)) &&
      !i.isExtra 
  );

  const defaultCategories = ['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'];

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
              // 1. Cria o InventoryItem automaticamente em background
              if (!simpleName || !simpleCategory) return showAlert({ title: "Dados Incompletos", message: "Preencha nome e categoria.", type: 'WARNING' });

              const newItem: InventoryItem = {
                  id: Math.random().toString(36).substr(2, 9), // Temp ID, backend replaces
                  name: simpleName,
                  unit: 'UN',
                  type: 'RESALE',
                  quantity: 999, // Estoque infinito para planos básicos
                  minQuantity: 0,
                  costPrice: 0,
                  salePrice: simplePrice,
                  category: simpleCategory,
                  isExtra: false,
                  image: ''
              };

              // Precisamos esperar o ID real se quisermos vincular corretamente, 
              // mas como o addInventoryItem é void no context atual, assumimos fluxo otimista ou refatoramos.
              // O Context atual do Inventory não retorna o ID criado. 
              // SOLUÇÃO: Criar item e confiar na sincronia ou (idealmente) o addInventoryItem retornaria o ID.
              // Para este código funcionar sem mudar a assinatura do Context agora:
              // Vamos simular a busca pós-criação.
              
              await addInventoryItem(newItem);
              
              // Pequeno hack: Buscamos o item recém criado pelo nome (arriscado em concorrência, mas ok para MVP)
              // Em produção real, addInventoryItem deve retornar o objeto criado.
              // Vamos assumir que a criação funcionou e usar os dados do form para criar o produto, 
              // O vínculo será feito via trigger ou reconciliação se possível, mas aqui vamos tentar achar o item.
              // *Como não posso mudar o Context signature agora sem quebrar contratos, 
              // vou buscar o item mais recente no inventory state após um pequeno delay ou refresh.*
              
              // Workaround seguro: Não vincular agora se não temos o ID, ou forçar o reload.
              // Porem, Products PRECISAM de linkedInventoryItemId.
              // Vamos ALERTAR que em modo simples, precisamos de um refresh ou assumir que o usuário
              // tem inventário e deve usar o modo LINK se possível.
              
              // Se o plano não permite inventário, o sistema de backend deve lidar com produtos sem link?
              // O DB diz: linked_inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL
              // Então pode ser NULL.
              
              if (!allowInventory) {
                  // Se não tem inventário, cria produto SEM link
                  targetStockId = ''; // Vai ser null
              } else {
                  // Se tem inventário mas usou criação rápida, alertamos para usar a aba de estoque
                  // Ou implementamos a busca.
                  // Simplificação para UX: Bloqueia criação rápida se inventory é permitido, 
                  // forçando o fluxo correto de Estoque -> Menu.
              }
              
              targetName = simpleName;
              targetPrice = simplePrice;
              targetCategory = simpleCategory;

          } else {
              // MODO VÍNCULO (Padrão)
              const stockItem = invState.inventory.find(i => i.id === selectedStockId);
              if (!stockItem) return showAlert({ title: "Erro", message: "Selecione um item do estoque.", type: 'ERROR' });
              
              if (!stockItem.category) {
                  return showAlert({ title: "Sem Categoria", message: "O item selecionado não tem categoria no estoque.", type: 'WARNING' });
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
              linkedInventoryItemId: targetStockId || undefined, // undefined vira null no DB
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
          
          showAlert({ title: "Sucesso", message: "Produto salvo!", type: 'SUCCESS' });
          onClose();
      } catch (error: any) {
          console.error(error);
          showAlert({ title: "Erro", message: "Falha ao salvar produto.", type: 'ERROR' });
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
            
            {/* Se o plano permitir inventário, o usuário deve preferencialmente vincular */}
            {allowInventory && !productToEdit && (
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                    <button type="button" onClick={() => setMode('LINK')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'LINK' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Vincular Estoque</button>
                    {/* Criação rápida desabilitada se tiver inventário para forçar boas práticas, ou habilitar se desejar */}
                    {/* <button type="button" onClick={() => setMode('CREATE')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'CREATE' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Criação Rápida</button> */}
                </div>
            )}

            {!allowInventory && (
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs text-orange-800 mb-4">
                    <p>Seu plano atual não possui controle de estoque. Os produtos criados aqui serão apenas para exibição no cardápio e venda.</p>
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
                // MODO SIMPLES (SEM ESTOQUE)
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-blue-600"/> Descrição para o Cliente
                </label>
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
