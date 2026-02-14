
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ImageUploader } from '../ImageUploader';
import { useMenu } from '../../context/MenuContext'; // NEW
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Product, ProductType } from '../../types';
import { Archive, DollarSign, Layers, CheckSquare, Square, ImageIcon } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const { state: menuState, addProduct, updateProduct } = useMenu();
  const { state: restState } = useRestaurant(); // Only needed for general restaurant info if any, actually menuState.products covers products now
  const { state: invState } = useInventory();
  const { showAlert } = useUI();

  const [selectedStockId, setSelectedStockId] = useState('');
  const [isExtra, setIsExtra] = useState(false);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  
  // Form States
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState('Lanches');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
        if (productToEdit) {
            setName(productToEdit.name);
            setPrice(productToEdit.price.toString());
            setCategory(productToEdit.category);
            setDescription(productToEdit.description);
            setImage(productToEdit.image);
            setSelectedStockId(productToEdit.linkedInventoryItemId || '');
            setIsExtra(productToEdit.isExtra || false);
            setSelectedExtraIds(productToEdit.linkedExtraIds || []);
        } else {
            setName('');
            setPrice('');
            setCategory('Lanches');
            setDescription('');
            setImage('');
            setSelectedStockId('');
            setIsExtra(false);
            setSelectedExtraIds([]);
        }
    }
  }, [isOpen, productToEdit]);

  const availableForMenu = invState.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !menuState.products.some(p => p.linkedInventoryItemId === i.id && (!productToEdit || p.id !== productToEdit.id))
  );

  const allAvailableExtras = menuState.products.filter(p => p.isExtra && (!productToEdit || p.id !== productToEdit.id));

  const toggleExtraSelection = (id: string) => {
      setSelectedExtraIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validação de Estoque
      const stockItem = invState.inventory.find(i => i.id === selectedStockId);
      if (!selectedStockId || !stockItem) {
          return showAlert({ title: "Erro", message: "É obrigatório vincular um item do estoque.", type: 'ERROR' });
      }

      try {
          const productData = {
              name: name || stockItem.name,
              price: parseFloat(price),
              category: isExtra ? 'Adicionais' : category,
              description,
              image: image || stockItem.image || '',
              linkedInventoryItemId: stockItem.id, 
              isExtra: isExtra,
              linkedExtraIds: isExtra ? [] : selectedExtraIds,
              costPrice: stockItem.costPrice || 0,
              type: stockItem.type === 'RESALE' ? ProductType.BAR : ProductType.KITCHEN,
              isVisible: true
          };

          if (productToEdit) {
              await updateProduct({ 
                  ...productToEdit, 
                  ...productData,
                  linkedInventoryItemId: productData.linkedInventoryItemId,
                  isExtra: productData.isExtra,
                  linkedExtraIds: productData.linkedExtraIds
              } as Product);
          } else {
              await addProduct({
                  ...productData,
                  sortOrder: menuState.products.length + 1,
              });
          }
          
          showAlert({ title: "Sucesso", message: isExtra ? "Adicional salvo com sucesso!" : "Produto salvo no cardápio!", type: 'SUCCESS' });
          onClose();
      } catch (error: any) {
          console.error("Erro ao salvar produto:", error);
          const msg = error.message || JSON.stringify(error);
          showAlert({ 
              title: "Erro ao Salvar", 
              message: `O banco de dados rejeitou a operação. Possível falta de colunas (erro 400). Detalhe: ${msg}.`, 
              type: 'ERROR' 
          });
      }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={productToEdit ? 'Editar Produto' : 'Novo Produto para Venda'}
        variant="page"
    >
        <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Coluna 1: Origem e Tipo */}
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Archive size={16} className="text-blue-600"/> 1. Origem no Estoque
                        </h4>
                        
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Vincular Item de Inventário</label>
                            <select 
                                className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none shadow-sm transition-all" 
                                value={selectedStockId} 
                                onChange={e => {
                                    const newId = e.target.value;
                                    setSelectedStockId(newId);
                                    // Auto-preencher preço e nome se disponível no estoque
                                    const stockItem = invState.inventory.find(i => i.id === newId);
                                    if (stockItem) {
                                        if (stockItem.salePrice > 0) setPrice(stockItem.salePrice.toString());
                                        if (!name) setName(stockItem.name);
                                        if (!image && stockItem.image) setImage(stockItem.image);
                                    }
                                }}
                                required
                            >
                                <option value="">Selecione do estoque...</option>
                                {availableForMenu.map(i => (
                                    <option key={i.id} value={i.id}>{i.name} ({i.type === 'COMPOSITE' ? 'Prato' : 'Revenda'}) - Sugerido: R$ {i.salePrice.toFixed(2)}</option>
                                ))}
                                {productToEdit && !availableForMenu.find(i => i.id === productToEdit.linkedInventoryItemId) && (
                                    <option value={productToEdit.linkedInventoryItemId}>
                                        {invState.inventory.find(i => i.id === productToEdit.linkedInventoryItemId)?.name || 'Item Atual'}
                                    </option>
                                )}
                            </select>
                            <p className="text-[10px] text-slate-400 leading-tight">Ao selecionar um item do estoque, o sistema gerencia automaticamente o custo médio e a baixa de estoque na venda.</p>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl border transition-all ${isExtra ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-sm font-bold flex items-center gap-2 ${isExtra ? 'text-orange-800' : 'text-slate-800'}`}>
                                <Layers size={16}/> 2. Tipo de Venda
                            </h4>
                            <button 
                                type="button"
                                onClick={() => {
                                    const newVal = !isExtra;
                                    setIsExtra(newVal);
                                    if(newVal) setCategory('Adicionais');
                                    else setCategory('Lanches'); // Reset padrão
                                }}
                                className={`p-1.5 rounded-lg transition-all ${isExtra ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-slate-100 text-slate-400 border'}`}
                            >
                                {isExtra ? <CheckSquare size={20}/> : <Square size={20}/>}
                            </button>
                        </div>
                        <div>
                            <p className={`text-xs font-bold mb-1 ${isExtra ? 'text-orange-700' : 'text-slate-700'}`}>
                                {isExtra ? 'PRODUTO ADICIONAL (EXTRA)' : 'PRODUTO PRINCIPAL'}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                {isExtra 
                                    ? 'Este item NÃO aparecerá no cardápio principal. Ele será oferecido como um opcional de outros pratos.' 
                                    : 'Este item aparecerá nas categorias principais do cardápio para o cliente escolher.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Coluna 2: Dados Comerciais */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign size={16} className="text-green-600"/> 3. Dados Comerciais
                        </h4>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome no Cardápio</label>
                            <input 
                                className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Coca-Cola 350ml"
                                required 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço de Venda</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-sm font-bold text-slate-400">R$</span>
                                    <input 
                                        type="number" step="0.01" 
                                        className="w-full border-2 p-3 pl-10 rounded-xl text-lg font-extrabold text-blue-600 focus:border-blue-500 outline-none" 
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        required 
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Médio</label>
                                <div className="p-3 bg-slate-50 rounded-xl border-2 border-dashed flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">R$</span>
                                    <span className="text-sm font-bold text-slate-600">
                                        {(productToEdit?.costPrice || invState.inventory.find(i => i.id === selectedStockId)?.costPrice || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {!isExtra && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria Principal</label>
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
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição Curta</label>
                            <textarea 
                                className="w-full border-2 p-3 rounded-xl text-sm h-24 resize-none focus:border-blue-500 outline-none" 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Conte mais sobre o produto..."
                            />
                        </div>
                    </div>
                </div>

                {/* Coluna 3: Adicionais e Imagem */}
                <div className="space-y-6">
                    {!isExtra && (
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col h-[300px]">
                            <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2 shrink-0">
                                <Layers size={16}/> 4. Adicionais Vinculados
                            </h4>
                            <p className="text-[10px] text-blue-600 mb-2">Selecione quais itens extras podem ser adicionados a este prato.</p>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {allAvailableExtras.map(extra => (
                                    <div 
                                        key={extra.id} 
                                        onClick={() => toggleExtraSelection(extra.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedExtraIds.includes(extra.id) ? 'bg-white border-blue-500 ring-2 ring-blue-100' : 'bg-white/50 border-transparent opacity-60 hover:opacity-100 hover:border-slate-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {selectedExtraIds.includes(extra.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18} className="text-slate-300"/>}
                                            <span className="text-xs font-bold text-slate-700">{extra.name}</span>
                                        </div>
                                        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">+ R$ {extra.price.toFixed(2)}</span>
                                    </div>
                                ))}
                                {allAvailableExtras.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-[10px] text-blue-400 italic">Nenhum "Produto Adicional" cadastrado ainda.</p>
                                        <p className="text-[9px] text-blue-300">Cadastre itens como "Adicional" (Passo 2) para que apareçam aqui.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ImageIcon size={16} className="text-purple-600"/> 5. Imagem
                        </h4>
                        <ImageUploader 
                            value={image || invState.inventory.find(i => i.id === selectedStockId)?.image || ''} 
                            onChange={(val) => {
                                setImage(val);
                            }} 
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-6 border-t mt-8 shrink-0">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-4 text-lg font-bold">Cancelar</Button>
                <Button type="submit" className="flex-1 py-4 text-lg font-bold shadow-xl shadow-blue-200">Finalizar Cadastro</Button>
            </div>
        </form>
    </Modal>
  );
};
