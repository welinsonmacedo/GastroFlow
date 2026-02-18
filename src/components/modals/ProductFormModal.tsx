
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useMenu } from '../../context/MenuContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Product, ProductType } from '../../types';
import { Archive, FileText, Sparkles, Loader2 } from 'lucide-react';
import { generateProductDescription } from '../../services/geminiService';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const { state: menuState, addProduct, updateProduct } = useMenu();
  const { state: invState } = useInventory();
  const { showAlert } = useUI();

  const [selectedStockId, setSelectedStockId] = useState('');
  const [description, setDescription] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
        if (productToEdit) {
            setSelectedStockId(productToEdit.linkedInventoryItemId || '');
            setDescription(productToEdit.description || '');
        } else {
            setSelectedStockId('');
            setDescription('');
        }
    }
  }, [isOpen, productToEdit]);

  // Se seleciona um item do estoque e não estamos editando um produto existente, 
  // puxa a descrição do estoque se o campo estiver vazio
  useEffect(() => {
      if (selectedStockId && !productToEdit) {
          const stockItem = invState.inventory.find(i => i.id === selectedStockId);
          if (stockItem && stockItem.description && !description) {
              setDescription(stockItem.description);
          }
      }
  }, [selectedStockId]);

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !menuState.products.some(p => p.linkedInventoryItemId === i.id && (!productToEdit || p.id !== productToEdit.id)) &&
      !i.isExtra // Filtra fora os extras
  );

  const handleGenerateDescription = async () => {
      const stockItem = invState.inventory.find(i => i.id === selectedStockId);
      const productName = stockItem ? stockItem.name : productToEdit?.name;
      const category = stockItem ? stockItem.category : productToEdit?.category;

      if (!productName) return showAlert({ title: "Selecione um Item", message: "Escolha um item do estoque primeiro.", type: 'WARNING' });

      setLoadingAI(true);
      try {
          const generated = await generateProductDescription(productName, category || 'Geral');
          setDescription(generated);
      } catch (error) {
          showAlert({ title: "Erro IA", message: "Não foi possível gerar a descrição.", type: 'ERROR' });
      } finally {
          setLoadingAI(false);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validação de Estoque
      const stockItem = invState.inventory.find(i => i.id === selectedStockId);
      if (!selectedStockId || !stockItem) {
          return showAlert({ title: "Erro", message: "É obrigatório selecionar um item do estoque.", type: 'ERROR' });
      }

      // Valida se o item de estoque possui categoria
      if (!stockItem.category) {
          return showAlert({ 
              title: "Item sem Categoria", 
              message: "Este item no estoque não possui categoria definida. Edite o item no painel de Estoque e adicione uma categoria antes de adicionar ao cardápio.", 
              type: 'WARNING' 
          });
      }

      try {
          // Copia dados do estoque para o produto do menu
          const productData = {
              name: stockItem.name,
              price: stockItem.salePrice,
              category: stockItem.category,
              description: description, // Usa o estado da descrição
              image: stockItem.image || '',
              linkedInventoryItemId: stockItem.id, 
              isExtra: false, 
              linkedExtraIds: [],
              targetCategories: [],
              costPrice: stockItem.costPrice || 0,
              type: stockItem.type === 'RESALE' ? ProductType.BAR : ProductType.KITCHEN,
              isVisible: true
          };

          if (productToEdit) {
              await updateProduct({ 
                  ...productToEdit, 
                  ...productData,
                  // Mantém configurações específicas do produto se existirem
                  isVisible: productToEdit.isVisible,
                  sortOrder: productToEdit.sortOrder
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
          console.error("Erro ao salvar produto:", error);
          const msg = error.message || JSON.stringify(error);
          showAlert({ 
              title: "Erro ao Salvar", 
              message: `Erro ao vincular produto: ${msg}`, 
              type: 'ERROR' 
          });
      }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={productToEdit ? 'Editar Produto' : 'Adicionar ao Cardápio'}
        variant="dialog"
        maxWidth="md"
    >
        <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 mb-4">
                <p>O nome, preço e categoria são sincronizados automaticamente com o <strong>Estoque</strong>. A descrição pode ser personalizada aqui.</p>
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
                <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 uppercase font-bold">Categoria Identificada:</span>
                    <div className="font-bold text-slate-700">
                        {invState.inventory.find(i => i.id === selectedStockId)?.category || 'Nenhuma (Edite no Estoque)'}
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
                        disabled={loadingAI || !selectedStockId}
                        className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                    >
                        {loadingAI ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                        Gerar com IA
                    </button>
                </div>
                <textarea
                    className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none shadow-sm transition-all resize-none"
                    rows={4}
                    placeholder="Descreva o prato de forma apetitosa para atrair clientes..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1 text-right">{description.length}/200 caracteres</p>
            </div>

            <div className="flex gap-4 pt-4 border-t mt-4">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1 text-sm font-bold">Cancelar</Button>
                <Button type="submit" className="flex-1 text-sm font-bold shadow-lg">Salvar Produto</Button>
            </div>
        </form>
    </Modal>
  );
};
