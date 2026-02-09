
import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useFinance } from '../context/FinanceContext'; // NEW
import { useUI } from '../context/UIContext';
import { TableStatus, Product } from '../types';
import { Button } from '../components/Button';
import { DollarSign, CreditCard, Smartphone, History, ShoppingCart, Search, Plus, Minus, Lock, Wallet, ArrowDown, Receipt, Box } from 'lucide-react';
import { Modal } from '../components/Modal';

export const CashierDashboard: React.FC = () => {
  const { state: restState, dispatch: restDispatch } = useRestaurant();
  const { state: finState, openRegister, closeRegister, bleedRegister } = useFinance(); // Use Finance Hook
  const { showAlert, showConfirm } = useUI();
  
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'PDV' | 'MANAGE'>('ACTIVE');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // Management States
  const [openRegisterAmount, setOpenRegisterAmount] = useState('');
  const [bleedAmount, setBleedAmount] = useState('');
  const [bleedReason, setBleedReason] = useState('');
  const [closeCountedAmount, setCloseCountedAmount] = useState('');
  const [bleedModalOpen, setBleedModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  // POS States
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Derived
  const occupiedTables = restState.tables.filter(t => t.status !== TableStatus.AVAILABLE);
  const selectedTable = restState.tables.find(t => t.id === selectedTableId);
  const tableOrders = restState.orders.filter(o => o.tableId === selectedTableId && !o.isPaid);
  const totalAmount = tableOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => {
        const p = restState.products.find(prod => prod.id === i.productId);
        return s + ((p?.price || 0) * i.quantity);
  }, 0), 0);

  // Finance Derived
  const sessionSales = finState.transactions.filter(t => finState.activeCashSession && new Date(t.timestamp) >= new Date(finState.activeCashSession.openedAt));
  const totalSalesCash = sessionSales.filter(t => t.method === 'CASH').reduce((acc, t) => acc + t.amount, 0);
  const totalBleed = finState.cashMovements.filter(m => m.type === 'BLEED').reduce((acc, m) => acc + m.amount, 0);
  const expectedCash = (finState.activeCashSession?.initialAmount || 0) + totalSalesCash - totalBleed;

  const handleOpenRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      await openRegister(parseFloat(openRegisterAmount), 'Staff'); // Should get real user
      setOpenRegisterAmount('');
  };

  const handleBleed = async (e: React.FormEvent) => {
      e.preventDefault();
      await bleedRegister(parseFloat(bleedAmount), bleedReason, 'Staff');
      setBleedModalOpen(false); setBleedAmount('');
      showAlert({ title: "Sucesso", message: "Sangria realizada.", type: 'SUCCESS' });
  };

  const handleCloseRegister = async () => {
      await closeRegister(parseFloat(closeCountedAmount));
      setCloseModalOpen(false); setCloseCountedAmount('');
      setActiveTab('ACTIVE');
  };

  const handlePayment = (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
      if(!finState.activeCashSession) return showAlert({ title: "Erro", message: "Caixa fechado.", type: 'ERROR' });
      if(!selectedTableId) return;
      showConfirm({
          title: "Confirmar Pagamento", message: `Receber R$ ${totalAmount.toFixed(2)}?`,
          onConfirm: () => {
              restDispatch({ type: 'PROCESS_PAYMENT', tableId: selectedTableId, amount: totalAmount, method });
              setSelectedTableId(null);
              showAlert({ title: "Sucesso", message: "Pago!", type: 'SUCCESS' });
          }
      });
  };

  // ... (POS Logic omitted for brevity, similar to before but checks finState.activeCashSession) ...

  if (!finState.activeCashSession) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
                  <h2 className="text-2xl font-bold mb-4">Caixa Fechado</h2>
                  <form onSubmit={handleOpenRegister}>
                      <input type="number" step="0.01" className="border p-3 rounded w-full mb-4 text-center text-xl" placeholder="Fundo de Troco (R$)" value={openRegisterAmount} onChange={e => setOpenRegisterAmount(e.target.value)} autoFocus required />
                      <Button type="submit" className="w-full py-3">ABRIR CAIXA</Button>
                  </form>
              </div>
          </div>
      );
  }

  return (
      <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar */}
          <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400">
              <button onClick={() => setActiveTab('ACTIVE')} className={`p-3 rounded-xl ${activeTab === 'ACTIVE' ? 'bg-blue-600 text-white' : ''}`}><DollarSign/></button>
              <button onClick={() => setActiveTab('PDV')} className={`p-3 rounded-xl ${activeTab === 'PDV' ? 'bg-blue-600 text-white' : ''}`}><ShoppingCart/></button>
              <button onClick={() => setActiveTab('HISTORY')} className={`p-3 rounded-xl ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white' : ''}`}><History/></button>
              <button onClick={() => setActiveTab('MANAGE')} className={`p-3 rounded-xl mt-auto ${activeTab === 'MANAGE' ? 'bg-red-600 text-white' : ''}`}><Wallet/></button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'ACTIVE' && (
                  <div className="flex gap-6">
                      <div className="w-1/3 bg-white rounded-xl shadow p-4">
                          <h3 className="font-bold mb-4">Mesas Abertas</h3>
                          {occupiedTables.map(t => (
                              <div key={t.id} onClick={() => setSelectedTableId(t.id)} className={`p-4 border-b cursor-pointer ${selectedTableId === t.id ? 'bg-blue-50' : ''}`}>
                                  <div className="font-bold">Mesa {t.number}</div>
                                  <div className="text-xs">{t.customerName}</div>
                              </div>
                          ))}
                      </div>
                      <div className="flex-1 bg-white rounded-xl shadow p-6">
                          {selectedTable ? (
                              <>
                                  <h2 className="text-2xl font-bold mb-6">Total: R$ {totalAmount.toFixed(2)}</h2>
                                  <div className="grid grid-cols-2 gap-4">
                                      <Button onClick={() => handlePayment('CASH')}>Dinheiro</Button>
                                      <Button onClick={() => handlePayment('PIX')}>Pix</Button>
                                      <Button onClick={() => handlePayment('DEBIT')}>Débito</Button>
                                      <Button onClick={() => handlePayment('CREDIT')}>Crédito</Button>
                                  </div>
                              </>
                          ) : <div className="text-center text-gray-400 mt-20">Selecione uma mesa</div>}
                      </div>
                  </div>
              )}
              {activeTab === 'MANAGE' && (
                  <div className="grid grid-cols-2 gap-6">
                      <div onClick={() => setBleedModalOpen(true)} className="bg-white p-6 rounded shadow cursor-pointer border-l-4 border-red-500">
                          <h3 className="font-bold text-xl">Sangria</h3>
                          <p>Retirar dinheiro</p>
                      </div>
                      <div onClick={() => setCloseModalOpen(true)} className="bg-white p-6 rounded shadow cursor-pointer border-l-4 border-slate-800">
                          <h3 className="font-bold text-xl">Fechar Caixa</h3>
                          <p>Encerrar turno</p>
                      </div>
                  </div>
              )}
              {/* Other tabs omitted for brevity, logic follows same pattern using finState */}
          </div>

          {/* Modals for Bleed/Close would go here, using openRegister/closeRegister from context */}
          {bleedModalOpen && (
              <Modal isOpen={true} onClose={() => setBleedModalOpen(false)} title="Sangria">
                  <form onSubmit={handleBleed} className="space-y-4 p-4">
                      <input type="number" placeholder="Valor" className="border p-2 w-full" value={bleedAmount} onChange={e => setBleedAmount(e.target.value)} />
                      <input placeholder="Motivo" className="border p-2 w-full" value={bleedReason} onChange={e => setBleedReason(e.target.value)} />
                      <Button type="submit" className="w-full">Confirmar</Button>
                  </form>
              </Modal>
          )}
      </div>
  );
};
