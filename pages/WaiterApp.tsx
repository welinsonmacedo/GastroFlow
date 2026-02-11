
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { TableStatus, OrderStatus, ProductType, Product, OrderItem } from '../types';
import { Button } from '../components/Button';
import { CheckCircle, Coffee, User, Key, X, Bell, Plus, Minus, Search, ShoppingCart, ChevronRight, Utensils, Trash2, ArrowLeft, Volume2, Edit3, MessageSquare, ChevronUp, ChevronDown, AlertTriangle, Zap, Clock, UtensilsCrossed, CheckSquare, Square } from 'lucide-react';

const FALLBACK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const WaiterApp: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);

  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
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

          if (quickAddModal.selectedExtraIds.length > 0) {
              const extraNames = quickAddModal.selectedExtraIds.map(id => {
                  const prod = state.products.find(p => p.id === id);
                  return `+ ${prod?.name}`;
              }).join(', ');
              finalNote = finalNote ? `${finalNote}\nAdicionais: ${extraNames}` : `Adicionais: ${extraNames}`;
          }

          const extrasPrice = quickAddModal.selectedExtraIds.reduce((acc, id) => {
              const prod = state.products.find(p => p.id === id);
              return acc + (prod?.price || 0);
          }, 0);

          const adjustedProduct = {
              ...quickAddModal.product,
              price: quickAddModal.product.price + extrasPrice
          };

          setCart(prev => [...prev, { product: adjustedProduct, quantity: quickAddModal.qty, notes: finalNote.trim() }]); 
          setQuickAddModal(null); 
      }
  };

  if (!state.audioUnlocked) {
    return (
        <div className="h-full bg-slate-900 flex items-center justify-center p-4 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-6">
                <Bell size={48} className="text-blue-600 mx-auto" />
                <h1 className="text-2xl font-bold">Ativar Sistema</h1>
                <button onClick={enableAudio} className="bg-blue-600 text-white font-bold py-4 px-6 rounded-xl w-full">ATIVAR SOM</button>
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
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                              <h3 className="font-bold truncate pr-4">{quickAddModal.product.name}</h3>
                              <button onClick={() => setQuickAddModal(null)}><X size={24}/></button>
                          </div>
                          <div className="p-6 space-y-6 overflow-y-auto">
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2 text-center uppercase">Quantidade</label>
                                  <div className="flex items-center gap-6 justify-center">
                                      <button onClick={() => setQuickAddModal({...quickAddModal, qty: Math.max(1, quickAddModal.qty - 1)})} className="p-4 bg-gray-100 rounded-xl"><Minus size={24}/></button>
                                      <span className="text-4xl font-bold w-16 text-center text-blue-600">{quickAddModal.qty}</span>
                                      <button onClick={() => setQuickAddModal({...quickAddModal, qty: quickAddModal.qty + 1})} className="p-4 bg-gray-100 rounded-xl"><Plus size={24}/></button>
                                  </div>
                              </div>
                              {quickAddModal.product.linkedExtraIds && quickAddModal.product.linkedExtraIds.length > 0 && (
                                  <div className="border-t border-b py-4">
                                      <label className="block text-sm font-bold text-gray-700 mb-3"><Plus size={16} className="inline text-green-600 mr-1"/> Adicionais</label>
                                      <div className="space-y-2">
                                          {quickAddModal.product.linkedExtraIds.map(id => {
                                              const extra = state.products.find(p => p.id === id);
                                              if (!extra) return null;
                                              const isSelected = quickAddModal.selectedExtraIds.includes(id);
                                              return (
                                                  <div key={id} onClick={() => toggleExtra(id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${isSelected ? 'bg-orange-50 border-orange-300' : 'bg-white'}`}>
                                                      <div className="flex items-center gap-3">{isSelected ? <CheckSquare size={20} className="text-orange-600"/> : <Square size={20} className="text-gray-300"/>}<span className="text-sm font-medium">{extra.name}</span></div>
                                                      <span className="text-sm font-bold text-gray-500">+ R$ {extra.price.toFixed(2)}</span>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                              <textarea className="w-full border-2 rounded-xl p-3" rows={3} placeholder="Observações..." value={quickAddModal.note} onChange={e => setQuickAddModal({...quickAddModal, note: e.target.value})} />
                          </div>
                          <div className="p-4 border-t bg-gray-50">
                              <Button onClick={confirmQuickAdd} className="w-full py-4 text-lg">Adicionar R$ {calculateModalTotal().toFixed(2)}</Button>
                          </div>
                      </div>
                  </div>
              )}
              <header className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2"><button onClick={() => setOrderingTableId(null)} className="p-2"><ArrowLeft size={24}/></button><div><h1 className="font-bold">Novo Pedido</h1><span className="text-xs text-gray-500">Mesa {table?.number}</span></div></div>
                  <div className="font-bold text-blue-600">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</div>
              </header>
              <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="p-4 bg-white border-b space-y-3">
                          <div className="relative"><Search className="absolute left-3 top-3 text-gray-400" size={20}/><input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                          <div className="flex gap-2 overflow-x-auto pb-1">{categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-sm font-medium border ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>{cat}</button>))}</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start pb-24">
                          {filteredProducts.map(product => (
                              <div key={product.id} onClick={() => openProductModal(product)} className="bg-white p-3 rounded-xl border shadow-sm flex justify-between items-center cursor-pointer active:scale-95">
                                  <div className="flex-1 min-w-0 pr-2"><div className="font-bold truncate">{product.name}</div><div className="text-sm text-gray-500">R$ {product.price.toFixed(2)}</div></div>
                                  <div className="bg-blue-600 p-2 rounded-lg text-white"><Plus size={20} /></div>
                              </div>
                          ))}
                      </div>
                  </div>
                  {cart.length > 0 && (
                      <div className="w-80 bg-white border-l shadow-xl flex flex-col hidden md:flex">
                          <div className="p-4 border-b font-bold">Resumo ({cart.length})</div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">{cart.map((item, idx) => (<div key={idx} className="text-sm border-b pb-3 last:border-0"><div className="flex justify-between font-medium"><span>{item.quantity}x {item.product.name}</span><span>R$ {(item.product.price * item.quantity).toFixed(2)}</span></div>{item.notes && <div className="text-xs text-gray-500 mt-1 whitespace-pre-line italic">{item.notes}</div>}</div>))}</div>
                          <div className="p-4 border-t bg-gray-50"><Button onClick={() => { dispatch({ type: 'PLACE_ORDER', tableId: orderingTableId, items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })) }); setCart([]); setOrderingTableId(null); showAlert({ title: "Enviado", message: "Pedido enviado para produção!", type: 'SUCCESS' }); }} className="w-full py-4 text-lg">Enviar Pedido</Button></div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-full bg-gray-100 p-4 lg:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Painel do Garçom</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {state.tables.map(table => {
                const hasCall = pendingCalls.find(c => c.tableId === table.id);
                return (
                    <div key={table.id} onClick={() => hasCall ? dispatch({ type: 'RESOLVE_WAITER_CALL', callId: hasCall.id }) : (table.status === TableStatus.AVAILABLE ? setSelectedTableForOpen(table.id) : setSelectedTableForAction(table.id))} className={`p-4 rounded-xl shadow-sm border-2 flex flex-col items-center justify-center min-h-[120px] transition-all cursor-pointer relative ${hasCall ? 'bg-red-50 border-red-500 animate-pulse' : (table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500' : 'bg-gray-50 border-transparent')}`}>
                        <div className="text-3xl font-bold text-gray-700">{table.number}</div>
                        {hasCall && <Bell size={20} className="text-red-600 absolute top-2 right-2 animate-bounce" />}
                        <div className="text-[10px] font-bold uppercase mt-2">{hasCall ? 'CHAMANDO' : (table.status === TableStatus.AVAILABLE ? 'LIVRE' : 'OCUPADA')}</div>
                    </div>
                );
            })}
        </div>
        
        {selectedTableForOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm space-y-4">
                    <h3 className="font-bold text-xl">Abrir Mesa</h3>
                    <input className="w-full border p-3 rounded-lg" placeholder="Nome do Cliente" onChange={(e) => { const code = Math.floor(1000 + Math.random() * 9000).toString(); dispatch({ type: 'OPEN_TABLE', tableId: selectedTableForOpen, customerName: e.target.value || 'Cliente', accessCode: code }); setSelectedTableForOpen(null); }} />
                    <Button variant="secondary" onClick={() => setSelectedTableForOpen(null)} className="w-full">Cancelar</Button>
                </div>
            </div>
        )}

        {selectedTableForAction && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden">
                    <div className="p-4 space-y-3">
                        <button onClick={() => { setOrderingTableId(selectedTableForAction); setSelectedTableForAction(null); setCart([]); }} className="w-full py-4 bg-blue-50 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-3"><Utensils size={24} /> Fazer Pedido</button>
                        <button onClick={() => { dispatch({ type: 'CLOSE_TABLE', tableId: selectedTableForAction }); setSelectedTableForAction(null); }} className="w-full py-4 bg-red-50 text-red-700 font-bold rounded-xl flex items-center justify-center gap-3"><Trash2 size={24} /> Fechar Mesa</button>
                        <Button variant="secondary" onClick={() => setSelectedTableForAction(null)} className="w-full">Voltar</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
