
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useMenu } from '../../context/MenuContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Product, ProductType } from '../../types';
import { Archive, Layers } from 'lucide-react';

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
  const [category, setCategory] = useState('Lanches');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
        if (productToEdit) {
            setCategory(productToEdit.category);
            setSelectedStockId(productToEdit.linkedInventoryItemId || '');
        } else {
            setCategory('Lanches');
            setSelectedStockId('');
        }
    }
  }, [isOpen, productToEdit]);

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !menuState.products.some(p => p.linkedInventoryItemId === i.id && (!productToEdit || p.id !== productToEdit.id)) &&
      !i.isExtra // Filtra fora os extras
  );

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validação de Estoque
      const stockItem = invState.inventory.find(i => i.id === selectedStockId);
      if (!selectedStockId || !stockItem) {
          return showAlert({ title: "Erro", message: "É obrigatório selecionar um item do estoque.", type: 'ERROR' });
      }

      try {
          // Copia dados do estoque para o produto do menu
          const productData = {
              name: stockItem.name,
              price: stockItem.salePrice, // Usa o preço de venda definido no estoque
              category: category,
              description: '', // Descrição pode ser gerida no futuro ou puxada de algum lugar
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
              } as Product);
          } else {
              await addProduct({
                  ...productData,
                  sortOrder: menuState.products.length + 1,
              });
          }
          
          showAlert({ title: "Sucesso", message: "Produto adicionado ao cardápio!", type: 'SUCCESS' });
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
        title={productToEdit ? 'Alterar Categoria' : 'Adicionar ao Cardápio'}
        variant="dialog"
        maxWidth="md"
    >
        <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 mb-4">
                <p>Selecione um item do estoque para exibir no cardápio. O preço e a foto serão puxados automaticamente do estoque.</p>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Archive size={16} className="text-blue-600"/> 1. Item do Estoque
                </label>
                <select 
                    className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none shadow-sm transition-all" 
                    value={selectedStockId} 
                    onChange={e => setSelectedStockId(e.target.value)}
                    required
                    disabled={!!productToEdit} // Não permite mudar o link se estiver editando (apenas categoria)
                >
                    <option value="">Selecione...</option>
                    {availableForMenu.map(i => (
                        <option key={i.id} value={i.id}>{i.name} - R$ {i.salePrice.toFixed(2)}</option>
                    ))}
                    {productToEdit && (
                        <option value={productToEdit.linkedInventoryItemId}>
                            {invState.inventory.find(i => i.id === productToEdit.linkedInventoryItemId)?.name} (Atual)
                        </option>
                    )}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Layers size={16} className="text-purple-600"/> 2. Categoria no Menu
                </label>
                <select 
                    className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none" 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                >
                    {['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            <div className="flex gap-4 pt-4 border-t mt-4">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1 text-sm font-bold">Cancelar</Button>
                <Button type="submit" className="flex-1 text-sm font-bold shadow-lg">Salvar no Cardápio</Button>
            </div>
        </form>
    </Modal>
  );
};
