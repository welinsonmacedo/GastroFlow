
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product } from '../types';
import { Button } from '../components/Button';
import { WaiterProductModal, OpenTableModal, TableActionsModal } from '../components/modals/WaiterModals';
import { Bell, Plus, Search, ShoppingCart, ArrowLeft, Utensils, Trash2 } from 'lucide-react';

const FALLBACK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const WaiterApp: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: menuState } = useMenu();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  
  const { showAlert } = useUI();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string; extras?: Product[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  const [productModal, setProductModal] = useState<Product | null>(null);

  const pendingCalls = orderState.serviceCalls.filter(c => c.status === 'PENDING');

  useEffect(() => {
      audioRef.current = new Audio(FALLBACK_SOUND_URL);
      audioRef.current.preload = 'auto';
  }, []);

  const enableAudio = () => {
      if (audioRef.current) {
          audioRef.current.play().then(() => { orderDispatch({ type: 'UNLOCK_AUDIO' }); }).catch(err => console.error(err));
      } else {
          orderDispatch({ type: 'UNLOCK_AUDIO' });
      }
  };

  const handleAddToCart = (item: { product: Product, qty: number, note: string, selectedExtraIds: string[] }) => {
      const chosenExtras = item.selectedExtraIds
          .map(id => menuState.products.find(p => p.id === id))
          .filter(Boolean) as Product[];

      setCart(prev => [
          ...prev, 
          { 
              product: item.product, 
              quantity: item.qty, 
              notes: item.note,
              extras: chosenExtras
          }
      ]); 
  };

  const submitOrder = async () => {
    if (!orderingTableId || cart.length === 0) return;

    const flattenedItems: { productId: string; quantity: number; notes: string }[] = [];

    cart.forEach(item => {
        flattenedItems.push({
            productId: item.product.id,
            quantity: item.quantity,
            notes: item.notes
        });

        item.extras?.forEach(extra => {
            flattenedItems.push({
                productId: extra.id,
                quantity: item.quantity,
                notes: `[ADICIONAL DE: ${item.product.name}]`
            });
        });
    });

    await orderDispatch({ 
        type: 'PLACE_ORDER', 
        tableId: orderingTableId, 
        items: flattenedItems
    });

    setCart([]); 
    setOrderingTableId(null);
    showAlert({ title: "Sucesso", message: "Pedido enviado para produção!", type: 'SUCCESS' });
  };

  if (!orderState.audioUnlocked) {
    return (
        <div className="h-full bg-slate-900 flex items-center justify-center p-4 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-6">
                <Bell size={48} className="text-blue-600 mx-auto" />
                <h1 className="text-2xl font-bold">Ativar Sistema</h1>
                <p className="text-gray-500 text-sm">O sistema de áudio e tela precisa ser ativado para alertas em tempo real.</p>
                <button onClick={enableAudio} className="bg-blue-600 text-white font-bold py-4 px-6 rounded-xl w-full shadow-lg">ATIVAR GARÇOM</button>
            </div>
        </div>
    );
  }

  if (orderingTableId) {
      const table = orderState.tables.find(t => t.id === orderingTableId);
      const filteredProducts = menuState.products.filter(p => !p.isExtra && (selectedCategory === 'Todos' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const categories = ['Todos', ...Array.from(new Set(menuState.products.filter(p => !p.isExtra).map(p => p.category)))];

      return (
          <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
              <WaiterProductModal 
                  isOpen={!!productModal} 
                  onClose={() => setProductModal(null)} 
                  product={productModal}
                  onConfirm={handleAddToCart}
              />

              <header className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                      <button onClick={() => setOrderingTableId(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><ArrowLeft size={24}/></button>
                      <div>
                          <h1 className="font-black text-slate-800 leading-none">Novo Pedido</h1>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Mesa {table?.number}</span>
                      </div>
                  </div>
                  <div className="bg-blue-600 px-3 py-1.5 rounded-xl font-black text-white shadow-lg shadow-blue-200">
                      R$ {cart.reduce((acc, i) => {
                          const extras = (i.extras || []).reduce((s, e) => s + e.price, 0);
                          return acc + ((i.product.price + extras) * i.quantity);
                      }, 0).toFixed(2)}
                  </div>
              </header>
              <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="p-4 bg-white border-b space-y-3">
                          <div className="relative">
                              <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                              <input type="text" placeholder="Buscar produto..." className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {categories.map(cat => (
                                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${selectedCategory === cat ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}>{cat}</button>
                              ))}
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start pb-24 custom-scrollbar">
                          {filteredProducts.map(product => (
                              <div key={product.id} onClick={() => setProductModal(product)} className="bg-white p-3 rounded-2xl border-2 border-transparent shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-200 active:scale-95 transition-all">
                                  <div className="flex-1 min-w-0 pr-2">
                                      <div className="font-bold text-slate-800 truncate leading-tight">{product.name}</div>
                                      <div className="text-[10px] text-gray-400 font-bold uppercase">{product.category}</div>
                                      <div className="text-sm font-black text-blue-600 mt-1">R$ {product.price.toFixed(2)}</div>
                                  </div>
                                  <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors"><Plus size={20} strokeWidth={3} /></div>
                              </div>
                          ))}
                      </div>
                  </div>
                  {cart.length > 0 && (
                      <div className="w-full md:w-80 bg-white border-l shadow-2xl flex flex-col z-20 absolute md:relative bottom-0 h-[60vh] md:h-auto rounded-t-3xl md:rounded-none">
                          <div className="p-5 border-b font-black flex justify-between items-center text-slate-800">
                              <div className="flex items-center gap-2"><ShoppingCart size={20}/> ITENS ({cart.length})</div>
                              <button onClick={() => setCart([])} className="text-[10px] text-red-500 hover:underline uppercase">Limpar</button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                              {cart.map((item, idx) => (
                                  <div key={idx} className="text-sm border-b border-gray-100 pb-4 last:border-0">
                                      <div className="flex justify-between font-black text-slate-800 mb-1">
                                          <span>{item.quantity}x {item.product.name}</span>
                                          <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                      {item.extras?.map(ex => (
                                          <div key={ex.id} className="text-[10px] font-bold text-orange-600 flex justify-between">
                                              <span>+ {ex.name}</span>
                                              <span>R$ {(ex.price * item.quantity).toFixed(2)}</span>
                                          </div>
                                      ))}
                                      {item.notes && <div className="text-[11px] text-blue-500 mt-2 italic bg-blue-50 p-2 rounded-lg leading-tight">"{item.notes}"</div>}
                                  </div>
                              ))}
                          </div>
                          <div className="p-5 border-t bg-gray-50">
                              <Button onClick={submitOrder} className="w-full py-4 text-lg font-black shadow-xl shadow-blue-200">LANÇAR PEDIDO</Button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-full bg-gray-100 p-4 lg:p-6 space-y-6">
        <header className="flex justify-between items-center">
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Atendimento</h1>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sistema Ativo</span>
            </div>
        </header>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {orderState.tables.map(table => {
                const hasCall = pendingCalls.find(c => c.tableId === table.id);
                return (
                    <div 
                        key={table.id} 
                        onClick={() => hasCall ? orderDispatch({ type: 'RESOLVE_WAITER_CALL', callId: hasCall.id }) : (table.status === TableStatus.AVAILABLE ? setSelectedTableForOpen(table.id) : setSelectedTableForAction(table.id))} 
                        className={`p-6 rounded-3xl shadow-sm border-4 flex flex-col items-center justify-center min-h-[140px] transition-all cursor-pointer relative group active:scale-95
                            ${hasCall ? 'bg-red-500 border-red-200 text-white animate-pulse' : 
                              (table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500 text-slate-800 hover:shadow-lg' : 'bg-gray-100 border-transparent text-slate-400 grayscale')}
                        `}
                    >
                        <div className={`text-4xl font-black mb-1 ${hasCall ? 'text-white' : 'text-slate-800'}`}>{table.number}</div>
                        {hasCall && <Bell size={24} className="absolute top-3 right-3 animate-bounce fill-white" />}
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {hasCall ? 'CHAMANDO!' : (table.status === TableStatus.AVAILABLE ? 'LIVRE' : 'OCUPADA')}
                        </div>
                        {table.status === TableStatus.OCCUPIED && (
                            <div className="mt-2 text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {table.customerName || 'Cliente'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        
        <OpenTableModal 
            isOpen={!!selectedTableForOpen} 
            onClose={() => setSelectedTableForOpen(null)} 
            tableId={selectedTableForOpen}
        />

        <TableActionsModal
            isOpen={!!selectedTableForAction}
            onClose={() => setSelectedTableForAction(null)}
            tableId={selectedTableForAction}
            onOrder={() => { setOrderingTableId(selectedTableForAction); setSelectedTableForAction(null); setCart([]); }}
        />
    </div>
  );
};
