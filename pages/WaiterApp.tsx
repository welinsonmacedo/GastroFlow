
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { TableStatus, OrderStatus, ProductType, Product, OrderItem } from '../types';
import { Button } from '../components/Button';
// Added Modal import
import { Modal } from '../components/Modal';
import { CheckCircle, Coffee, User, Key, X, Bell, Plus, Minus, Search, ShoppingCart, ChevronRight, Utensils, Trash2, ArrowLeft, Volume2, Edit3, MessageSquare, ChevronUp, ChevronDown, AlertTriangle, Zap, Clock, UtensilsCrossed, CheckSquare, Square } from 'lucide-react';

const FALLBACK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const WaiterApp: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string; extras?: Product[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  const [quickAddModal, setQuickAddModal] = useState<{ 
      product: Product; 
      qty: number; 
      note: string;
      drinkTiming: 'IMMEDIATE' | 'WITH_FOOD';
      selectedExtraIds: string[];
  } | null>(null);

  const pendingCalls = state.serviceCalls.filter(c => c.status === 'PENDING');

  useEffect(() => {
      audioRef.current = new Audio(FALLBACK_SOUND_URL);
      audioRef.current.preload = 'auto';
  }, []);

  const enableAudio = () => {
      if (audioRef.current) {
          audioRef.current.play().then(() => { dispatch({ type: 'UNLOCK_AUDIO' }); }).catch(err => console.error(err));
      } else {
          dispatch({ type: 'UNLOCK_AUDIO' });
      }
  };

  const openProductModal = (product: Product) => {
      setQuickAddModal({ 
          product, 
          qty: 1, 
          note: '',
          drinkTiming: 'IMMEDIATE',
          selectedExtraIds: []
      });
  };

  const toggleExtra = (id: string) => {
      if (!quickAddModal) return;
      setQuickAddModal(prev => {
          if (!prev) return null;
          const exists = prev.selectedExtraIds.includes(id);
          return {
              ...prev,
              selectedExtraIds: exists ? prev.selectedExtraIds.filter(i => i !== id) : [...prev.selectedExtraIds, id]
          };
      });
  };

  const calculateModalTotal = () => {
      if (!quickAddModal) return 0;
      const extrasTotal = (quickAddModal.product.linkedExtraIds || []).reduce((acc, id) => {
          if (!quickAddModal.selectedExtraIds.includes(id)) return acc;
          const extraProd = state.products.find(p => p.id === id);
          return acc + (extraProd?.price || 0);
      }, 0);
      return (quickAddModal.product.price + extrasTotal) * quickAddModal.qty;
  };

  const confirmQuickAdd = () => {
      if (quickAddModal) { 
          let finalNote = quickAddModal.note;
          if (quickAddModal.product.category === 'Bebidas') {
              const timing = quickAddModal.drinkTiming === 'IMMEDIATE' ? '[IMEDIATA] ' : '[COM COMIDA] ';
              finalNote = timing + finalNote;
          }

          const chosenExtras = quickAddModal.selectedExtraIds
              .map(id => state.products.find(p => p.id === id))
              .filter(Boolean) as Product[];

          setCart(prev => [
              ...prev, 
              { 
                  product: quickAddModal.product, 
                  quantity: quickAddModal.qty, 
                  notes: finalNote.trim(),
                  extras: chosenExtras
              }
          ]); 
          setQuickAddModal(null); 
      }
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

    await dispatch({ 
        type: 'PLACE_ORDER', 
        tableId: orderingTableId, 
        items: flattenedItems
    });

    setCart([]); 
    setOrderingTableId(null);
    showAlert({ title: "Sucesso", message: "Pedido enviado para produção!", type: 'SUCCESS' });
  };

  if (!state.audioUnlocked) {
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
      const table = state.tables.find(t => t.id === orderingTableId);
      const filteredProducts = state.products.filter(p => !p.isExtra && (selectedCategory === 'Todos' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const categories = ['Todos', ...Array.from(new Set(state.products.filter(p => !p.isExtra).map(p => p.category)))];

      return (
          <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
              {quickAddModal && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                              <h3 className="font-bold truncate pr-4">{quickAddModal.product.name}</h3>
                              <button onClick={() => setQuickAddModal(null)}><X size={24}/></button>
                          </div>
                          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-widest">Quantidade</label>
                                  <div className="flex items-center gap-6 justify-center">
                                      <button onClick={() => setQuickAddModal({...quickAddModal, qty: Math.max(1, quickAddModal.qty - 1)})} className="p-4 bg-gray-100 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"><Minus size={24}/></button>
                                      <span className="text-4xl font-bold w-16 text-center text-blue-600">{quickAddModal.qty}</span>
                                      <button onClick={() => setQuickAddModal({...quickAddModal, qty: quickAddModal.qty + 1})} className="p-4 bg-gray-100 rounded-xl hover:bg-green-50 hover:text-green-600 transition-colors"><Plus size={24}/></button>
                                  </div>
                              </div>
                              {quickAddModal.product.linkedExtraIds && quickAddModal.product.linkedExtraIds.length > 0 && (
                                  <div className="border-t border-b py-4 space-y-3">
                                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider"><Plus size={14} className="inline text-green-600 mr-1"/> Adicionais</label>
                                      <div className="space-y-2">
                                          {quickAddModal.product.linkedExtraIds.map(id => {
                                              const extra = state.products.find(p => p.id === id);
                                              if (!extra) return null;
                                              const isSelected = quickAddModal.selectedExtraIds.includes(id);
                                              return (
                                                  <div key={id} onClick={() => toggleExtra(id)} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                                                      <div className="flex items-center gap-3">
                                                          {isSelected ? <CheckSquare size={20} className="text-orange-600"/> : <Square size={20} className="text-gray-300"/>}
                                                          <span className="text-sm font-bold text-slate-700">{extra.name}</span>
                                                      </div>
                                                      <span className="text-xs font-bold text-slate-400">R$ {extra.price.toFixed(2)}</span>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações</label>
                                  <textarea className="w-full border-2 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all" rows={2} placeholder="Sem cebola, etc..." value={quickAddModal.note} onChange={e => setQuickAddModal({...quickAddModal, note: e.target.value})} />
                              </div>
                          </div>
                          <div className="p-4 border-t bg-gray-50">
                              <Button onClick={confirmQuickAdd} className="w-full py-4 text-lg font-black shadow-lg">Confirmar R$ {calculateModalTotal().toFixed(2)}</Button>
                          </div>
                      </div>
                  </div>
              )}
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
                              <div key={product.id} onClick={() => openProductModal(product)} className="bg-white p-3 rounded-2xl border-2 border-transparent shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-200 active:scale-95 transition-all">
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
            {state.tables.map(table => {
                const hasCall = pendingCalls.find(c => c.tableId === table.id);
                return (
                    <div 
                        key={table.id} 
                        onClick={() => hasCall ? dispatch({ type: 'RESOLVE_WAITER_CALL', callId: hasCall.id }) : (table.status === TableStatus.AVAILABLE ? setSelectedTableForOpen(table.id) : setSelectedTableForAction(table.id))} 
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
        
        {/* Modais de controle simplificados */}
        {selectedTableForOpen && (
            <Modal isOpen={!!selectedTableForOpen} onClose={() => setSelectedTableForOpen(null)} title="Abrir Mesa" variant="dialog" maxWidth="sm">
                <div className="space-y-4">
                    <input className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none text-center font-bold" placeholder="Nome do Cliente" id="customerNameInput" autoFocus />
                    <Button onClick={() => {
                        const name = (document.getElementById('customerNameInput') as HTMLInputElement).value || 'Cliente';
                        const code = Math.floor(1000 + Math.random() * 9000).toString();
                        dispatch({ type: 'OPEN_TABLE', tableId: selectedTableForOpen, customerName: name, accessCode: code });
                        setSelectedTableForOpen(null);
                    }} className="w-full py-4 font-bold">INICIAR ATENDIMENTO</Button>
                </div>
            </Modal>
        )}

        {selectedTableForAction && (
            <Modal isOpen={!!selectedTableForAction} onClose={() => setSelectedTableForAction(null)} title={`Mesa ${state.tables.find(t => t.id === selectedTableForAction)?.number}`} variant="dialog" maxWidth="sm">
                <div className="p-1 space-y-3">
                    <button onClick={() => { setOrderingTableId(selectedTableForAction); setSelectedTableForAction(null); setCart([]); }} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all"><Utensils size={24} /> LANÇAR PEDIDO</button>
                    <button onClick={() => { dispatch({ type: 'CLOSE_TABLE', tableId: selectedTableForAction }); setSelectedTableForAction(null); }} className="w-full py-5 bg-red-50 text-red-600 font-black rounded-2xl flex items-center justify-center gap-3 border-2 border-red-100 hover:bg-red-100 transition-all"><Trash2 size={24} /> CANCELAR MESA</button>
                </div>
            </Modal>
        )}
    </div>
  );
};
