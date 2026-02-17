
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useInventory } from '../context/InventoryContext'; 
import { useOrder } from '../context/OrderContext';
import { useFinance } from '../context/FinanceContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthProvider';
import { TableStatus, InventoryItem, DeliveryInfo, DeliveryPlatform, OrderStatus, DeliveryMethodConfig } from '../types'; 
import { Button } from '../components/Button';
import { DollarSign, History, ShoppingCart, Search, Wallet, Receipt, Trash2, User, Lock, XCircle, RefreshCcw, LayoutDashboard, CreditCard, Banknote, Zap, Plus, Clock, Eye, Package, Minus, CheckSquare, Square, AlertTriangle, LogOut, LayoutGrid, Bike, Phone, MessageCircle, MapPin, ClipboardList, CheckCircle, Loader2, Printer, Split } from 'lucide-react';
import { CloseRegisterModal } from '../components/modals/CloseRegisterModal';
import { CashBleedModal } from '../components/modals/CashBleedModal';
import { Modal } from '../components/Modal';

export const CashierDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { planLimits } = restState; // Acesso aos limites do plano

  const { state: invState } = useInventory(); 
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  const { state: finState, openRegister, refreshTransactions, voidTransaction } = useFinance();
  const { showAlert, showConfirm } = useUI();
  const { logout, state: authState } = useAuth();
  
  // Define a aba inicial com base no que está disponível
  const getInitialTab = () => {
      if (planLimits.allowPos) return 'PDV';
      if (planLimits.allowDelivery) return 'DELIVERY';
      return 'ACTIVE'; // Fallback
  };

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'PDV' | 'DELIVERY' | 'MANAGE'>(getInitialTab());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // Estado para abertura de caixa
  const [openRegisterAmount, setOpenRegisterAmount] = useState('');
  const [openingLoading, setOpeningLoading] = useState(false);
  
  // Modais e Estados Gerais
  const [bleedModalOpen, setBleedModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [cashPaymentModalOpen, setCashPaymentModalOpen] = useState(false);
  
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedItemForCart, setSelectedItemForCart] = useState<InventoryItem | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<InventoryItem[]>([]);

  const [transactionToVoid, setTransactionToVoid] = useState<string | null>(null);
  const [voidPin, setVoidPin] = useState('');
  const [processingSale, setProcessingSale] = useState(false);
  
  // PDV States
  const [posCart, setPosCart] = useState<{ item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [pendingCashAction, setPendingCashAction] = useState<{ type: 'TABLE' | 'POS', total: number } | null>(null);

  // States para Separação de Pedidos (Split Order)
  const [splitMode, setSplitMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // DELIVERY States
  const [deliveryCart, setDeliveryCart] = useState<{ item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[]>([]);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryInfo>({ 
      customerName: '', phone: '', address: '', platform: 'PHONE', methodId: '', deliveryFee: 0, changeFor: 0, paymentMethod: 'CASH', paymentStatus: 'PENDING' 
  });
  const [deliverySearch, setDeliverySearch] = useState('');
  
  // Fetch delivery methods ensuring they are valid
  const deliveryMethods = restState.businessInfo?.deliverySettings?.filter(m => m.isActive) || [];

  const occupiedTables = orderState.tables.filter(t => t.status !== TableStatus.AVAILABLE);
  const selectedTable = orderState.tables.find(t => t.id === selectedTableId);
  const tableOrders = orderState.orders.filter(o => o.tableId === selectedTableId && !o.isPaid);
  
  // Calcula Total baseado na seleção (se estiver em splitMode)
  const ordersToPay = (splitMode && selectedOrderIds.length > 0)
    ? tableOrders.filter(o => selectedOrderIds.includes(o.id))
    : tableOrders;

  const totalAmount = ordersToPay.reduce((sum, order) => sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0);

  const activeDeliveryOrders = orderState.orders.filter(o => o.type === 'DELIVERY' && !o.isPaid && o.status !== 'CANCELLED');

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await refreshTransactions();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleLogout = () => {
      showConfirm({ title: "Sair do Caixa?", message: "Isso fará logout do sistema.", type: 'WARNING', confirmText: "Sair", onConfirm: logout });
  };

  // Resetar split mode ao trocar de mesa
  useEffect(() => {
    setSplitMode(false);
    setSelectedOrderIds([]);
  }, [selectedTableId]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => 
        prev.includes(orderId) 
            ? prev.filter(id => id !== orderId) 
            : [...prev, orderId]
    );
  };

  // --- FUNÇÃO DE ABERTURA DE CAIXA ---
  const handleOpenRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(openRegisterAmount);
      
      if (isNaN(amount) || amount < 0) {
          return showAlert({ title: "Valor Inválido", message: "Informe um valor inicial válido (pode ser 0).", type: 'WARNING' });
      }

      setOpeningLoading(true);
      try {
          const operator = authState.currentUser?.name || 'Operador';
          await openRegister(amount, operator);
          setOpenRegisterAmount('');
      } catch (error: any) {
          console.error(error);
          showAlert({ title: "Erro ao Abrir", message: error.message || "Falha ao abrir caixa. Verifique permissões.", type: 'ERROR' });
      } finally {
          setOpeningLoading(false);
      }
  };

  // --- Lógica Comum de Carrinho (PDV e Delivery) ---
  const handleAddToCart = () => {
      if (!selectedItemForCart) return;
      
      const newItem = {
          item: selectedItemForCart,
          quantity: itemQty,
          notes: itemNotes,
          extras: selectedExtras
      };

      if (activeTab === 'DELIVERY') {
          setDeliveryCart([...deliveryCart, newItem]);
      } else {
          setPosCart([...posCart, newItem]);
      }

      setItemModalOpen(false);
      setSelectedItemForCart(null);
  };

  const openItemModal = (item: InventoryItem) => {
      setSelectedItemForCart(item);
      setItemQty(1);
      setItemNotes('');
      setSelectedExtras([]);
      setItemModalOpen(true);
  };

  const toggleExtra = (extra: InventoryItem) => {
      if (selectedExtras.find(e => e.id === extra.id)) {
          setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
      } else {
          setSelectedExtras([...selectedExtras, extra]);
      }
  };

  // --- Lógica de Delivery ---
  
  const calculateDeliveryTotal = () => {
      const subtotal = deliveryCart.reduce((acc, i) => acc + ((i.item.salePrice + i.extras.reduce((s,e)=>s+e.salePrice,0)) * i.quantity), 0);
      return subtotal + (deliveryForm.deliveryFee || 0);
  };

  const selectDeliveryMethod = (method: DeliveryMethodConfig) => {
      let fee = 0;
      if (method.feeBehavior === 'ADD_TO_TOTAL') {
          if (method.feeType === 'FIXED') fee = method.feeValue;
      }
      
      setDeliveryForm(prev => ({
          ...prev,
          methodId: method.id,
          platform: method.name,
          deliveryFee: fee
      }));
  };

  const handleDeliverySubmit = async () => {
      if (deliveryCart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione itens ao pedido.", type: 'WARNING' });
      if (!deliveryForm.customerName) return showAlert({ title: "Dados Incompletos", message: "Informe o nome do cliente.", type: 'WARNING' });
      if (!deliveryForm.methodId) return showAlert({ title: "Método de Entrega", message: "Selecione como será a entrega.", type: 'WARNING' });

      setProcessingSale(true);
      try {
          const itemsPayload = deliveryCart.map(cartItem => {
              return [
                  { 
                      inventoryItemId: cartItem.item.id, 
                      quantity: cartItem.quantity, 
                      notes: cartItem.notes, 
                      salePrice: cartItem.item.salePrice,
                      name: cartItem.item.name,
                      type: cartItem.item.type === 'RESALE' ? 'BAR' : 'KITCHEN'
                  },
                  ...cartItem.extras.map(ex => ({
                      inventoryItemId: ex.id,
                      quantity: cartItem.quantity,
                      notes: `[ADICIONAL] p/ ${cartItem.item.name}`,
                      salePrice: ex.salePrice,
                      name: ex.name,
                      type: ex.type === 'RESALE' ? 'BAR' : 'KITCHEN'
                  }))
              ];
          }).flat();

          await orderDispatch({ 
              type: 'PLACE_ORDER', 
              orderType: 'DELIVERY', 
              items: itemsPayload, 
              deliveryInfo: deliveryForm 
          });

          setDeliveryCart([]);
          setDeliveryForm({ customerName: '', phone: '', address: '', platform: 'PHONE', methodId: '', deliveryFee: 0, changeFor: 0, paymentMethod: 'CASH', paymentStatus: 'PENDING' });
          showAlert({ title: "Sucesso", message: "Pedido enviado para a cozinha!", type: 'SUCCESS' });
      } catch (error) {
          showAlert({ title: "Erro", message: "Falha ao criar pedido delivery.", type: 'ERROR' });
      } finally {
          setProcessingSale(false);
      }
  };

  const handleDispatchDelivery = async (orderId: string) => {
      const order = activeDeliveryOrders.find(o => o.id === orderId);
      if (!order) return;
      const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);
      
      showConfirm({
          title: "Despachar e Finalizar?",
          message: `Confirma que o pedido saiu para entrega e o pagamento foi/será recebido? Total: R$ ${total.toFixed(2)}`,
          onConfirm: async () => {
              await orderDispatch({ 
                  type: 'PROCESS_PAYMENT', 
                  amount: total, 
                  method: 'CASH', 
                  orderId: order.id,
                  cashierName: 'Delivery'
              });
              showAlert({ title: "Despachado", message: "Pedido finalizado e arquivado.", type: 'SUCCESS' });
          }
      });
  };

  const handlePrintCurrentDelivery = () => {
      // (Simplified Print Logic)
      showAlert({title: "Imprimir", message: "Enviado para impressora.", type: 'INFO'});
  };

  // --- Lógica de Pagamento PDV/Mesa ---
  const handlePayment = async (method: string) => {
      if (!selectedTableId || totalAmount <= 0) return;
      
      if (method === 'CASH') {
          initiateCashPayment('TABLE', totalAmount);
          return;
      }
      
      showConfirm({
          title: "Confirmar Pagamento",
          message: `Deseja confirmar o recebimento de R$ ${totalAmount.toFixed(2)} via ${method}?`,
          onConfirm: () => finalizeTablePayment(method)
      });
  };

  const initiateCashPayment = (type: 'TABLE' | 'POS', total: number) => {
      setCashReceived('');
      setPendingCashAction({ type, total });
      setCashPaymentModalOpen(true);
  };

  const confirmCashPayment = async () => {
      if (!pendingCashAction) return;
      setCashPaymentModalOpen(false);
      if (pendingCashAction.type === 'TABLE') await finalizeTablePayment('CASH');
      else await finalizePosSale('CASH');
      setPendingCashAction(null);
  };

  const finalizeTablePayment = async (method: string) => {
      if (!selectedTableId) return;
      try {
          await orderDispatch({ 
              type: 'PROCESS_PAYMENT', 
              tableId: selectedTableId, 
              amount: totalAmount, 
              method, 
              cashierName: 'Caixa',
              specificOrderIds: (splitMode && selectedOrderIds.length > 0) ? selectedOrderIds : undefined
          });
          
          if (!splitMode || totalAmount >= tableOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0)) {
              setSelectedTableId(null);
          } else {
              setSplitMode(false);
              setSelectedOrderIds([]);
          }

          showAlert({ title: "Pagamento Realizado", message: "Pagamento registrado com sucesso.", type: 'SUCCESS' });
      } catch (error) { showAlert({ title: "Erro", message: "Falha ao processar pagamento.", type: 'ERROR' }); }
  };

  const handlePosSale = async (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
      // Validação de Caixa Aberto SOMENTE se allowCashControl for true
      if (planLimits.allowCashControl && !finState.activeCashSession) {
          return showAlert({ title: "Caixa Fechado", message: "Abra o caixa antes de vender.", type: 'ERROR' });
      }

      if (posCart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione produtos.", type: 'WARNING' });
      const total = posCart.reduce((acc, cartItem) => acc + ((cartItem.item.salePrice + cartItem.extras.reduce((s, ex) => s + ex.salePrice, 0)) * cartItem.quantity), 0);
      if (method === 'CASH') { initiateCashPayment('POS', total); return; }
      await finalizePosSale(method);
  };

  const finalizePosSale = async (method: string) => {
      setProcessingSale(true);
      const total = posCart.reduce((acc, cartItem) => acc + ((cartItem.item.salePrice + cartItem.extras.reduce((s, ex) => s + ex.salePrice, 0)) * cartItem.quantity), 0);
      try {
          const itemsPayload: any[] = [];
          posCart.forEach(cartItem => {
              itemsPayload.push({ inventoryItemId: cartItem.item.id, quantity: cartItem.quantity, notes: cartItem.notes });
              cartItem.extras.forEach(extra => itemsPayload.push({ inventoryItemId: extra.id, quantity: cartItem.quantity, notes: `[ADICIONAL] para ${cartItem.item.name}` }));
          });
          await orderDispatch({ type: 'PROCESS_POS_SALE', sale: { customerName: customerName.trim() || 'Consumidor Final', items: itemsPayload, totalAmount: total, method } });
          setPosCart([]); setCustomerName('');
          showAlert({ title: "Venda Registrada", message: `Venda de R$ ${total.toFixed(2)} realizada!`, type: 'SUCCESS' });
          await refreshTransactions();
      } catch (error: any) { showAlert({ title: "Erro na Venda", message: "Não foi possível salvar.", type: 'ERROR' }); } finally { setProcessingSale(false); }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!transactionToVoid) return;
      try {
          await voidTransaction(transactionToVoid, voidPin);
          setVoidModalOpen(false); setVoidPin('');
          showAlert({ title: "Sucesso", message: "Transação estornada!", type: 'SUCCESS' });
      } catch (error: any) { showAlert({ title: "Erro", message: error.message, type: 'ERROR' }); }
  };

  // TELA DE CAIXA FECHADO (BLOQUEIO)
  // Só bloqueia se o plano tiver Controle de Caixa ativo. Caso contrário, permite acesso direto.
  if (planLimits.allowCashControl && !finState.activeCashSession) {
      return (
          <div className="h-full flex items-center justify-center bg-slate-950 p-4 font-sans">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-md w-full border border-white/10 relative">
                  <button onClick={handleLogout} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={24} /></button>
                  <div className="bg-blue-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner"><Lock size={48} className="text-blue-600" /></div>
                  <h2 className="text-3xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Frente de Caixa</h2>
                  <p className="text-gray-400 mb-8 font-medium">Informe o fundo de reserva para iniciar o turno.</p>
                  
                  <form onSubmit={handleOpenRegister}>
                      <div className="mb-8">
                          <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Saldo em Dinheiro (Gaveta)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-5 font-black text-2xl text-gray-300">R$</span>
                              <input 
                                  type="number" 
                                  step="0.01" 
                                  className="border-2 border-gray-100 p-6 rounded-3xl w-full text-center text-4xl font-black text-blue-600 focus:outline-none focus:border-blue-500 transition-all shadow-inner bg-gray-50" 
                                  placeholder="0.00" 
                                  value={openRegisterAmount} 
                                  onChange={e => setOpenRegisterAmount(e.target.value)} 
                                  autoFocus 
                                  required 
                                  disabled={openingLoading}
                              />
                          </div>
                      </div>
                      <Button type="submit" disabled={openingLoading} className="w-full py-5 text-xl font-black rounded-3xl shadow-2xl shadow-blue-200">
                          {openingLoading ? <Loader2 className="animate-spin" /> : 'ABRIR CAIXA AGORA'}
                      </Button>
                  </form>
              </div>
          </div>
      );
  }

  const NavTab = ({ tab, icon: Icon, label }: any) => (
      <button onClick={() => setActiveTab(tab)} className={`px-4 py-2 md:px-6 rounded-xl flex items-center gap-2 transition-all font-bold text-sm border-2 ${activeTab === tab ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-gray-500 border-transparent hover:bg-gray-100'}`}>
          <Icon size={18} /> <span className="hidden md:inline">{label}</span>
      </button>
  );

  return (
      <div className="h-full bg-gray-100 flex flex-col overflow-hidden font-sans">
          <header className="bg-white border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-30">
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                  <div className="flex items-center gap-2">
                      <div className="bg-blue-600 p-2 rounded-xl text-white"><DollarSign size={20}/></div>
                      <h1 className="font-black text-lg text-slate-800 uppercase tracking-tight hidden sm:block">Frente de Caixa</h1>
                  </div>
                  
                  {/* Status do Caixa só aparece se o controle estiver ativo */}
                  {planLimits.allowCashControl && (
                      <div className="flex items-center gap-2 md:ml-4">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Caixa Aberto</span>
                      </div>
                  )}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto max-w-full">
                  {/* Renderização Condicional das Abas */}
                  {planLimits.allowPos && <NavTab tab="PDV" icon={ShoppingCart} label="Balcão" />}
                  {planLimits.allowDelivery && <NavTab tab="DELIVERY" icon={Bike} label="Delivery" />}
                  {/* Mesas sempre aparecem pois são o core, mas dependem de pagamento */}
                  <NavTab tab="ACTIVE" icon={Receipt} label="Mesas" />
                  
                  <NavTab tab="HISTORY" icon={History} label="Extrato" />
                  
                  {/* Gestão de Turno/Gaveta só se tiver controle de caixa */}
                  {planLimits.allowCashControl && <NavTab tab="MANAGE" icon={Wallet} label="Turno" />}
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={handleManualRefresh} className={`p-3 rounded-xl bg-gray-50 text-blue-600 hover:bg-blue-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`} title="Sincronizar"><RefreshCcw size={20}/></button>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors text-xs uppercase tracking-wider"><LogOut size={16}/> <span className="hidden sm:inline">Sair</span></button>
              </div>
          </header>

          <main className="flex-1 p-3 md:p-6 overflow-hidden">
                  
                  {/* VIEW: DELIVERY */}
                  {activeTab === 'DELIVERY' && planLimits.allowDelivery && (
                      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                          {/* Coluna Esquerda: Novo Pedido */}
                          <div className="lg:w-1/2 flex flex-col gap-4 h-full overflow-hidden animate-fade-in">
                              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 shrink-0 overflow-y-auto custom-scrollbar">
                                  <h3 className="font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2"><Bike size={20} className="text-orange-500"/> Novo Delivery</h3>
                                  <div className="space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                          <input className="border p-2.5 rounded-xl bg-gray-50 text-sm" placeholder="Nome do Cliente" value={deliveryForm.customerName} onChange={e => setDeliveryForm({...deliveryForm, customerName: e.target.value})} />
                                          <input className="border p-2.5 rounded-xl bg-gray-50 text-sm" placeholder="Telefone / WhatsApp" value={deliveryForm.phone} onChange={e => setDeliveryForm({...deliveryForm, phone: e.target.value})} />
                                      </div>
                                      <input className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm" placeholder="Endereço Completo (Rua, Número, Bairro)" value={deliveryForm.address} onChange={e => setDeliveryForm({...deliveryForm, address: e.target.value})} />
                                      
                                      <div>
                                          <label className="text-[10px] font-bold text-gray-400 uppercase">Método de Entrega</label>
                                          <div className="flex flex-wrap gap-2 mt-2">
                                              {deliveryMethods.map(m => (
                                                  <button 
                                                    key={m.id} 
                                                    onClick={() => selectDeliveryMethod(m)} 
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 whitespace-nowrap 
                                                    ${deliveryForm.methodId === m.id 
                                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                                                        : (m.type === 'APP' ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')
                                                    }`}
                                                  >
                                                      {m.name}
                                                  </button>
                                              ))}
                                              {deliveryMethods.length === 0 && <span className="text-xs text-red-400 italic">Configure métodos em Admin.</span>}
                                          </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                          <div>
                                              <label className="text-[10px] font-bold text-gray-400 uppercase">Taxa de Entrega</label>
                                              <input type="number" className="w-full border p-2 rounded-lg text-sm" value={deliveryForm.deliveryFee} onChange={e => setDeliveryForm({...deliveryForm, deliveryFee: parseFloat(e.target.value)})} />
                                          </div>
                                          <div>
                                              <label className="text-[10px] font-bold text-gray-400 uppercase">Forma Pagto</label>
                                              <select className="w-full border p-2 rounded-lg text-sm bg-white" value={deliveryForm.paymentMethod} onChange={e => setDeliveryForm({...deliveryForm, paymentMethod: e.target.value as any})}>
                                                  <option value="CASH">Dinheiro</option>
                                                  <option value="CARD_MACHINE">Maquininha</option>
                                                  <option value="ONLINE">Pago Online / App</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label className="text-[10px] font-bold text-gray-400 uppercase">Status Pagto</label>
                                              <select className="w-full border p-2 rounded-lg text-sm bg-white" value={deliveryForm.paymentStatus} onChange={e => setDeliveryForm({...deliveryForm, paymentStatus: e.target.value as any})}>
                                                  <option value="PENDING">Cobrar na Entrega</option>
                                                  <option value="PAID">Já Pago</option>
                                              </select>
                                          </div>
                                          {deliveryForm.paymentMethod === 'CASH' && (
                                              <div>
                                                  <label className="text-[10px] font-bold text-gray-400 uppercase">Troco Para</label>
                                                  <input type="number" className="w-full border p-2 rounded-lg text-sm" placeholder="R$ 0,00" value={deliveryForm.changeFor || ''} onChange={e => setDeliveryForm({...deliveryForm, changeFor: parseFloat(e.target.value)})} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>

                              <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                  <div className="p-4 border-b">
                                      <div className="relative group">
                                          <Search className="absolute left-4 top-3 text-gray-400" size={18}/>
                                          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-gray-50 text-sm focus:bg-white focus:border-blue-500 outline-none" placeholder="Adicionar produtos..." value={deliverySearch} onChange={e => setDeliverySearch(e.target.value)} />
                                      </div>
                                  </div>
                                  <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start custom-scrollbar">
                                      {invState.inventory.filter(i => 
                                          !i.isExtra && 
                                          i.type !== 'INGREDIENT' && 
                                          i.name.toLowerCase().includes(deliverySearch.toLowerCase())
                                      ).map(item => (
                                          <button key={item.id} onClick={() => openItemModal(item)} className="bg-gray-50 p-3 rounded-xl border border-transparent hover:border-blue-300 hover:shadow-md transition-all text-left">
                                              <div className="font-bold text-slate-800 text-xs truncate">{item.name}</div>
                                              <div className="text-blue-600 font-black text-sm mt-1">R$ {item.salePrice.toFixed(2)}</div>
                                          </button>
                                      ))}
                                  </div>
                                  
                                  <div className="p-4 bg-slate-50 border-t">
                                      <div className="flex justify-between items-center mb-3">
                                          <span className="text-xs font-bold text-gray-500 uppercase">{deliveryCart.length} Itens</span>
                                          <span className="text-xl font-black text-slate-800">R$ {calculateDeliveryTotal().toFixed(2)}</span>
                                      </div>
                                      <div className="flex gap-2">
                                          <Button variant="secondary" onClick={handlePrintCurrentDelivery} disabled={deliveryCart.length === 0} className="w-14 bg-white border border-gray-200" title="Imprimir Conferência"><Printer size={18}/></Button>
                                          <Button onClick={handleDeliverySubmit} disabled={processingSale} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white shadow-orange-200">
                                              {processingSale ? 'Enviando...' : 'Enviar para Cozinha'}
                                          </Button>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="lg:w-1/2 bg-slate-100 p-4 rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col">
                              <h3 className="font-black text-slate-700 uppercase tracking-tight mb-4 ml-2">Monitor de Entregas</h3>
                              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                  {activeDeliveryOrders.length === 0 && (
                                      <div className="text-center py-20 text-gray-400">
                                          <Bike size={48} className="mx-auto mb-2 opacity-20"/>
                                          <p className="text-xs font-bold uppercase">Nenhum pedido ativo</p>
                                      </div>
                                  )}
                                  {activeDeliveryOrders.map(order => {
                                      const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0);
                                      const kitchenItems = order.items.filter(i => i.productType === 'KITCHEN');
                                      const isReady = kitchenItems.length === 0 || kitchenItems.every(i => i.status === OrderStatus.READY);

                                      return (
                                          <div key={order.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 transition-all ${isReady ? 'border-l-emerald-500' : 'border-l-orange-400'}`}>
                                              <div className="flex justify-between items-start mb-2">
                                                  <div>
                                                      <h4 className="font-bold text-slate-800">{order.deliveryInfo?.customerName}</h4>
                                                      <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2 mt-1">
                                                          <span className="bg-gray-100 px-2 py-0.5 rounded">{order.deliveryInfo?.platform}</span>
                                                          <span>#{order.id.slice(0,4)}</span>
                                                      </div>
                                                  </div>
                                                  <div className="text-right">
                                                      <div className="font-black text-slate-800">R$ {total.toFixed(2)}</div>
                                                      <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded mt-1 inline-block ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                          {isReady ? 'Pronto p/ Entrega' : 'Preparando'}
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="text-xs text-gray-500 mb-3 flex items-start gap-1">
                                                  <MapPin size={12} className="shrink-0 mt-0.5"/>
                                                  <span className="truncate">{order.deliveryInfo?.address || 'Retirada'}</span>
                                              </div>
                                              {isReady && (
                                                  <button onClick={() => handleDispatchDelivery(order.id)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2">
                                                      <CheckCircle size={14}/> Despachar / Finalizar
                                                  </button>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'ACTIVE' && (
                      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                          <div className="lg:w-1/3 flex flex-col h-full bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                              <div className="p-6 bg-slate-50 border-b flex items-center justify-between"><h3 className="font-black uppercase tracking-tight text-slate-700">Ocupação Atual</h3><span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">{occupiedTables.length} Mesas</span></div>
                              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                  {occupiedTables.map(t => (
                                      <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex justify-between items-center group relative overflow-hidden ${selectedTableId === t.id ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/5' : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200'}`}>
                                          <div className="relative z-10">
                                              <div className={`font-black text-2xl tracking-tighter ${selectedTableId === t.id ? 'text-blue-600' : 'text-slate-800'}`}>Mesa {t.number}</div>
                                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-1"><User size={12}/> {t.customerName}</div>
                                          </div>
                                          {t.status === 'WAITING_PAYMENT' && <div className="bg-orange-500 text-white p-2 rounded-xl animate-pulse relative z-10"><Receipt size={20}/></div>}
                                      </button>
                                  ))}
                                  {occupiedTables.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 py-20"><LayoutGrid size={48} className="mb-2"/><p className="font-bold uppercase text-xs">Salão Vazio</p></div>}
                              </div>
                          </div>

                          <div className="lg:w-2/3 flex flex-col h-full bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
                              {selectedTable ? (
                                  <div className="flex flex-col h-full">
                                      <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                                          <div><h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Mesa {selectedTable.number}</h2><p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-2">{selectedTable.customerName}</p></div>
                                          <div className="text-right">
                                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{splitMode ? 'Total Selecionado' : 'Subtotal Acumulado'}</p>
                                              <p className={`text-4xl font-black ${splitMode ? 'text-orange-400' : 'text-emerald-400'}`}>R$ {totalAmount.toFixed(2)}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                          {splitMode && (
                                              <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl mb-4 border border-orange-100">
                                                  <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                                                      <Split size={16}/> Selecione os pedidos para pagar
                                                  </div>
                                                  <button onClick={() => { setSplitMode(false); setSelectedOrderIds([]); }} className="text-xs font-bold text-gray-500 hover:text-gray-800">Cancelar Seleção</button>
                                              </div>
                                          )}

                                          {tableOrders.map(order => {
                                              const orderTotal = order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0);
                                              const isSelected = selectedOrderIds.includes(order.id);
                                              
                                              return (
                                                <div 
                                                    key={order.id} 
                                                    onClick={() => splitMode && toggleOrderSelection(order.id)}
                                                    className={`border rounded-2xl overflow-hidden transition-all ${splitMode ? 'cursor-pointer hover:border-blue-400' : ''} ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : 'border-gray-100'}`}
                                                >
                                                    <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            {splitMode && (
                                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center bg-white ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                                                                    {isSelected && <CheckSquare size={14}/>}
                                                                </div>
                                                            )}
                                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Pedido #{order.id.slice(0,4)}</span>
                                                            <span className="text-[10px] text-gray-400 ml-2">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700">R$ {orderTotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="p-3">
                                                        <table className="w-full text-left">
                                                            <tbody className="divide-y divide-gray-50">
                                                                {order.items.map((item, idx) => (
                                                                    <tr key={idx} className="">
                                                                        <td className="py-2 px-2 font-black text-slate-400 text-sm">{item.quantity}x</td>
                                                                        <td className="py-2 font-bold text-slate-700 text-sm">{item.productName}</td>
                                                                        <td className="py-2 text-right text-slate-400 text-sm">R$ {(item.productPrice * item.quantity).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                              );
                                          })}
                                      </div>

                                      <div className="p-6 bg-gray-50 border-t grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                                          {!splitMode && tableOrders.length > 1 && (
                                              <button onClick={() => setSplitMode(true)} className="col-span-2 lg:col-span-4 flex items-center justify-center gap-2 bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50 p-3 rounded-2xl font-black uppercase text-xs tracking-widest mb-2 transition-all">
                                                  <Split size={16}/> Dividir Conta / Selecionar Pedidos
                                              </button>
                                          )}

                                          <button onClick={() => handlePayment('CASH')} className="flex flex-col items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"><Banknote size={20}/><span className="text-[10px] uppercase tracking-widest">Dinheiro</span></button>
                                          <button onClick={() => handlePayment('PIX')} className="flex flex-col items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-95"><Zap size={20}/><span className="text-[10px] uppercase tracking-widest">Pix</span></button>
                                          <button onClick={() => handlePayment('DEBIT')} className="flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95"><CreditCard size={20}/><span className="text-[10px] uppercase tracking-widest">Débito</span></button>
                                          <button onClick={() => handlePayment('CREDIT')} className="flex flex-col items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"><CreditCard size={20}/><span className="text-[10px] uppercase tracking-widest">Crédito</span></button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-50 space-y-4"><Receipt size={80} strokeWidth={1} /><p className="font-black uppercase tracking-widest">Aguardando Seleção</p></div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeTab === 'PDV' && planLimits.allowPos && (
                      <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
                          {/* Coluna da Esquerda: Busca e Grid de Produtos */}
                          <div className="lg:w-2/3 flex flex-col gap-4 h-full overflow-hidden animate-fade-in">
                              <div className="relative shrink-0 group">
                                  <Search className="absolute left-6 top-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={22}/>
                                  <input 
                                    className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-transparent bg-white shadow-sm focus:shadow-lg focus:border-blue-500 outline-none transition-all font-bold text-lg" 
                                    placeholder="Buscar produto..." 
                                    value={posSearch} 
                                    onChange={e => setPosSearch(e.target.value)} 
                                    autoFocus 
                                  />
                              </div>
                              <div className="overflow-y-auto flex-1 content-start p-1 custom-scrollbar">
                                  {/* GRID DE PRODUTOS */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-20">
                                      {invState.inventory
                                        .filter(item => 
                                            item.type !== 'INGREDIENT' && 
                                            !item.isExtra && 
                                            item.name.toLowerCase().includes(posSearch.toLowerCase())
                                        )
                                        .map(item => (
                                          <button 
                                            key={item.id} 
                                            onClick={() => openItemModal(item)} 
                                            className="bg-white p-4 rounded-3xl shadow-sm border border-transparent hover:border-blue-300 hover:shadow-lg transition-all active:scale-95 flex flex-col justify-between h-36 group relative overflow-hidden"
                                          >
                                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                                                  <Plus size={20} className="text-blue-600"/>
                                              </div>
                                              <div className="text-left w-full">
                                                  <div className="font-black text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</div>
                                                  <span className={`text-[9px] font-black uppercase tracking-widest mt-1 inline-block px-1.5 py-0.5 rounded ${item.type === 'COMPOSITE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                      {item.type === 'COMPOSITE' ? 'Prato' : 'Revenda'}
                                                  </span>
                                              </div>
                                              <div className="flex justify-between items-end w-full">
                                                  <div className="font-black text-lg text-slate-900">R$ {item.salePrice.toFixed(2)}</div>
                                                  {item.type !== 'COMPOSITE' && item.quantity <= item.minQuantity && (
                                                      <div className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                                                          <AlertTriangle size={10} /> {item.quantity}
                                                      </div>
                                                  )}
                                              </div>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          {/* Coluna da Direita: Carrinho e Checkout */}
                          <div className="lg:w-1/3 bg-white rounded-[2rem] shadow-2xl border border-gray-200 flex flex-col h-full overflow-hidden animate-fade-in relative z-20">
                              <div className="p-5 bg-slate-900 text-white shrink-0 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-slate-800 p-2 rounded-xl"><ShoppingCart size={20} className="text-blue-400"/></div>
                                      <div>
                                          <h3 className="font-black text-lg uppercase tracking-tighter leading-none">Carrinho</h3>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{posCart.length} Itens</p>
                                      </div>
                                  </div>
                                  <button onClick={() => setPosCart([])} className="text-xs font-bold text-red-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg">Limpar</button>
                              </div>

                              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50">
                                  {posCart.map((cartItem, idx) => (
                                      <div key={idx} className="bg-white p-3 rounded-2xl relative group border border-gray-100 shadow-sm flex gap-3 items-center">
                                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm">
                                              {cartItem.quantity}x
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="text-sm font-bold text-slate-800 uppercase truncate leading-tight">{cartItem.item.name}</div>
                                              <div className="text-xs font-black text-blue-600">R$ {((cartItem.item.salePrice + cartItem.extras.reduce((s,e)=>s+e.salePrice,0)) * cartItem.quantity).toFixed(2)}</div>
                                              {cartItem.extras.length > 0 && (
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                      {cartItem.extras.map(e => <span key={e.id} className="text-[9px] bg-orange-50 text-orange-700 px-1.5 rounded border border-orange-100 font-bold">+ {e.name}</span>)}
                                                  </div>
                                              )}
                                          </div>
                                          <button onClick={() => setPosCart(posCart.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                                      </div>
                                  ))}
                                  {posCart.length === 0 && (
                                      <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60 space-y-2">
                                          <Package size={48} strokeWidth={1.5} />
                                          <p className="font-bold uppercase text-xs">Caixa Livre</p>
                                      </div>
                                  )}
                              </div>

                              <div className="p-5 bg-white border-t border-gray-100 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                                  <div className="flex justify-between items-end mb-4">
                                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total a Pagar</span>
                                      <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">
                                          R$ {posCart.reduce((acc, cartItem) => {
                                              const itemTotal = cartItem.item.salePrice + cartItem.extras.reduce((sum, ex) => sum + ex.salePrice, 0);
                                              return acc + (itemTotal * cartItem.quantity);
                                          }, 0).toFixed(2)}
                                      </span>
                                  </div>
                                  <input 
                                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold mb-4 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                      placeholder="Nome do Cliente (Opcional)"
                                      value={customerName}
                                      onChange={e => setCustomerName(e.target.value)}
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => handlePosSale('CASH')} className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-1">
                                          <Banknote size={20} /> Dinheiro
                                      </button>
                                      <button onClick={() => handlePosSale('PIX')} className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-1">
                                          <Zap size={20} /> PIX
                                      </button>
                                      <button onClick={() => handlePosSale('DEBIT')} className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-md shadow-blue-600/20 active:scale-95 transition-all">Débito</button>
                                      <button onClick={() => handlePosSale('CREDIT')} className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-md shadow-indigo-600/20 active:scale-95 transition-all">Crédito</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* VIEW: EXTRATO */}
                  {activeTab === 'HISTORY' && (
                      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col animate-fade-in">
                          <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0"><h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Extrato Diário</h3><Button size="sm" variant="outline" onClick={refreshTransactions} className="rounded-xl flex items-center gap-2"><RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''}/> Sincronizar</Button></div>
                          <div className="flex-1 overflow-auto custom-scrollbar">
                              <table className="w-full text-left">
                                  <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10"><tr className="border-b"><th className="p-6">Hora</th><th className="p-6">Detalhes</th><th className="p-6">Método</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr></thead>
                                  <tbody className="divide-y divide-gray-50">
                                      {finState.transactions.map(t => (
                                          <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${t.status === 'CANCELLED' ? 'opacity-40 grayscale' : ''}`}>
                                              <td className="p-6"><div className="font-black text-slate-700">{t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></td>
                                              <td className="p-6 text-sm font-bold text-slate-600 uppercase tracking-tight">{t.itemsSummary}</td>
                                              <td className="p-6"><span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 uppercase">{t.method}</span></td>
                                              <td className="p-6 text-right font-black text-slate-800">R$ {t.amount.toFixed(2)}</td>
                                              <td className="p-6 text-center">
                                                  <div className="flex justify-center items-center gap-2">
                                                      {t.cashierName && (
                                                          <div className="relative group">
                                                              <Eye size={20} className="text-gray-400 cursor-help" />
                                                              <div className="absolute right-0 bottom-full mb-2 w-32 bg-slate-800 text-white text-[10px] font-bold p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                                                  Op: {t.cashierName}
                                                              </div>
                                                          </div>
                                                      )}
                                                      {t.status !== 'CANCELLED' && <button onClick={() => { setTransactionToVoid(t.id); setVoidModalOpen(true); }} className="text-red-300 hover:text-red-500 transition-all"><XCircle size={22}/></button>} 
                                                      {t.status === 'CANCELLED' && <span className="text-[9px] font-black text-red-500 uppercase border border-red-200 px-2 py-1 rounded-lg">Estornado</span>}
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {/* VIEW: GESTÃO DE TURNO */}
                  {activeTab === 'MANAGE' && planLimits.allowCashControl && (
                      <div className="max-w-4xl mx-auto space-y-8 overflow-y-auto h-full pb-10 custom-scrollbar animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col justify-between">
                                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável</p><h3 className="text-3xl font-black text-slate-800 tracking-tighter">{finState.activeCashSession?.operatorName}</h3><p className="text-sm font-bold text-blue-600 mt-2 flex items-center gap-2"><Clock size={16}/> Turno iniciado às {finState.activeCashSession?.openedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                                  <div className="mt-8 pt-8 border-t flex items-end justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fundo Inicial</p><p className="text-2xl font-black text-slate-900">R$ {finState.activeCashSession?.initialAmount.toFixed(2)}</p></div><Button onClick={() => setCloseModalOpen(true)} className="bg-slate-900 hover:bg-red-600 text-white font-black py-4 px-8 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs">Fechar Turno</Button></div>
                              </div>
                              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-emerald-100 flex flex-col justify-between">
                                  <div className="flex items-center gap-4 mb-4"><div className="bg-emerald-500 p-4 rounded-3xl text-white shadow-lg shadow-emerald-500/20"><Wallet size={32}/></div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight">Retiradas & Sangrias</h3></div>
                                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Gerencie todas as saídas manuais do caixa para pagamentos extras ou depósitos bancários.</p>
                                  <button onClick={() => setBleedModalOpen(true)} className="w-full mt-6 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black shadow-xl shadow-emerald-600/20 transition-all uppercase tracking-widest text-xs">Registrar Sangria</button>
                              </div>
                          </div>
                      </div>
                  )}
          </main>
          
          <CashBleedModal isOpen={bleedModalOpen} onClose={() => setBleedModalOpen(false)} />
          <CloseRegisterModal isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} onSuccess={() => setActiveTab('ACTIVE')} />
          
          <Modal isOpen={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Autorizar Cancelamento" variant="dialog" maxWidth="sm">
              <form onSubmit={handleVoidSubmit} className="space-y-6">
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-start gap-3"><Lock size={20} className="shrink-0"/><p>Apenas gerentes podem autorizar o estorno de vendas concluídas. Insira sua Senha Mestra abaixo.</p></div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">PIN do Administrador</label><input type="password" autoFocus className="w-full border-2 p-5 rounded-2xl focus:border-red-500 outline-none text-center font-black tracking-[0.5em] text-3xl shadow-inner bg-gray-50" placeholder="****" value={voidPin} onChange={e => setVoidPin(e.target.value)} maxLength={4} /></div>
                  <Button type="submit" className="w-full py-5 bg-red-600 hover:bg-red-700 font-black rounded-2xl text-lg shadow-xl shadow-red-600/20">ESTORNAR AGORA</Button>
              </form>
          </Modal>

          <Modal isOpen={cashPaymentModalOpen} onClose={() => { setCashPaymentModalOpen(false); setPendingCashAction(null); }} title="Recebimento em Dinheiro" variant="dialog" maxWidth="sm">
              <div className="space-y-6">
                  <div className="text-center">
                      <p className="text-sm font-bold text-gray-500 uppercase">Valor Total</p>
                      <p className="text-4xl font-black text-slate-800">R$ {pendingCashAction?.total.toFixed(2)}</p>
                  </div>
                  <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Valor Recebido</label>
                      <input 
                          type="number" step="0.01" autoFocus
                          className="w-full border-2 p-5 rounded-2xl focus:border-emerald-500 outline-none text-center font-black text-3xl shadow-inner bg-emerald-50/30 text-emerald-700" 
                          placeholder="0.00" 
                          value={cashReceived} 
                          onChange={e => setCashReceived(e.target.value)} 
                      />
                  </div>
                  
                  {parseFloat(cashReceived) >= (pendingCashAction?.total || 0) && (
                      <div className="bg-emerald-100 p-4 rounded-2xl text-center border border-emerald-200">
                          <p className="text-sm font-bold text-emerald-700 uppercase">Troco a Devolver</p>
                          <p className="text-3xl font-black text-emerald-800">R$ {(parseFloat(cashReceived) - (pendingCashAction?.total || 0)).toFixed(2)}</p>
                      </div>
                  )}

                  <Button 
                      onClick={confirmCashPayment} 
                      disabled={!cashReceived || parseFloat(cashReceived) < (pendingCashAction?.total || 0)}
                      className="w-full py-5 text-xl font-black rounded-2xl shadow-xl"
                  >
                      CONFIRMAR RECEBIMENTO
                  </Button>
              </div>
          </Modal>

          {/* NOVO MODAL: Adicionar Item com Adicionais */}
          <Modal isOpen={itemModalOpen} onClose={() => setItemModalOpen(false)} title={selectedItemForCart?.name || "Adicionar Item"} variant="dialog" maxWidth="sm">
              <div className="space-y-6">
                  {/* Quantidade */}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
                      <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} className="p-3 bg-white shadow-sm rounded-xl hover:bg-red-50 text-red-500 transition-colors"><Minus size={20}/></button>
                      <span className="text-3xl font-black text-slate-800">{itemQty}</span>
                      <button onClick={() => setItemQty(itemQty + 1)} className="p-3 bg-white shadow-sm rounded-xl hover:bg-blue-50 text-blue-500 transition-colors"><Plus size={20}/></button>
                  </div>

                  {/* Lista de Adicionais */}
                  <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Adicionais Disponíveis</label>
                      <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                          {invState.inventory
                            .filter(i => 
                                i.isExtra && 
                                selectedItemForCart?.category && 
                                (i.targetCategories || []).includes(selectedItemForCart.category || '')
                            )
                            .map(extra => {
                              const isSelected = selectedExtras.some(e => e.id === extra.id);
                              return (
                                  <div key={extra.id} onClick={() => toggleExtra(extra)} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                      <div className="flex items-center gap-3">
                                          {isSelected ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} className="text-gray-300"/>}
                                          <span className="text-sm font-bold text-slate-700">{extra.name}</span>
                                      </div>
                                      <span className="text-xs font-bold text-slate-500">+ R$ {extra.salePrice.toFixed(2)}</span>
                                  </div>
                              );
                          })}
                          {invState.inventory.filter(i => i.isExtra && selectedItemForCart?.category && (i.targetCategories || []).includes(selectedItemForCart.category || '')).length === 0 && (
                              <p className="text-xs text-center text-gray-400 py-2">Nenhum adicional disponível para esta categoria.</p>
                          )}
                      </div>
                  </div>

                  {/* Observações */}
                  <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Observações</label>
                      <textarea 
                          className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none resize-none" 
                          rows={2} 
                          placeholder="Ex: Sem cebola, bem passado..."
                          value={itemNotes}
                          onChange={e => setItemNotes(e.target.value)}
                      />
                  </div>

                  {/* Total Estimado no Modal */}
                  <div className="pt-4 border-t flex justify-between items-center">
                      <div className="text-xs font-bold text-gray-500 uppercase">Subtotal</div>
                      <div className="text-2xl font-black text-blue-600">
                          R$ {((selectedItemForCart ? selectedItemForCart.salePrice + selectedExtras.reduce((acc, ex) => acc + ex.salePrice, 0) : 0) * itemQty).toFixed(2)}
                      </div>
                  </div>

                  <Button onClick={handleAddToCart} className="w-full py-4 text-lg font-black rounded-2xl shadow-xl">Adicionar ao Carrinho</Button>
              </div>
          </Modal>
      </div>
  );
};
