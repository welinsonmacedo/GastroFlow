import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { TableStatus } from '../types';
import { Button } from '../components/Button';
import { DollarSign, CreditCard, Smartphone, History, Receipt, ArrowLeft } from 'lucide-react';

export const CashierDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const occupiedTables = state.tables.filter(t => t.status !== TableStatus.AVAILABLE);
  
  const selectedTable = state.tables.find(t => t.id === selectedTableId);
  const tableOrders = state.orders.filter(o => o.tableId === selectedTableId && !o.isPaid);
  
  const totalAmount = tableOrders.reduce((sum, order) => 
    sum + order.items.reduce((orderSum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        return orderSum + ((product?.price || 0) * item.quantity);
    }, 0)
  , 0);

  const handlePayment = (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
    if (!selectedTableId) return;
    const methodLabel = method === 'CREDIT' ? 'Cartão de Crédito' : method === 'DEBIT' ? 'Cartão de Débito' : method;
    
    if (window.confirm(`Confirmar pagamento de R$ ${totalAmount.toFixed(2)} via ${methodLabel}?`)) {
        dispatch({ 
            type: 'PROCESS_PAYMENT', 
            tableId: selectedTableId, 
            amount: totalAmount, 
            method: method 
        });
        setSelectedTableId(null);
        alert("Pagamento registrado com sucesso!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
        {/* Sidebar Mini (Horizontal on mobile, Vertical on desktop) */}
        <div className="w-full lg:w-20 bg-slate-900 text-white flex flex-row lg:flex-col items-center justify-center lg:justify-start py-4 lg:py-6 gap-6 sticky top-0 lg:h-screen shrink-0 z-10">
            <button 
                onClick={() => setActiveTab('ACTIVE')}
                className={`p-3 rounded-xl transition-all ${activeTab === 'ACTIVE' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Caixa Ativo"
            >
                <DollarSign size={24} />
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`p-3 rounded-xl transition-all ${activeTab === 'HISTORY' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Histórico de Vendas"
            >
                <History size={24} />
            </button>
        </div>

      {activeTab === 'ACTIVE' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden">
            {/* Table List */}
            <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[300px] lg:max-h-none lg:h-auto">
                <div className="p-4 bg-gray-800 text-white font-bold flex justify-between items-center">
                    <span>Mesas Abertas</span>
                    <span className="text-xs bg-red-500 px-2 py-1 rounded-full">{occupiedTables.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {occupiedTables.length === 0 && <div className="p-8 text-center text-gray-400">Nenhuma mesa ativa.</div>}
                    {occupiedTables.map(table => (
                        <div 
                            key={table.id}
                            onClick={() => setSelectedTableId(table.id)}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 flex justify-between items-center transition-colors
                                ${selectedTableId === table.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                            `}
                        >
                            <div>
                                <div className="font-bold text-lg text-gray-800">Mesa {table.number}</div>
                                <div className="text-xs text-gray-500">{table.customerName}</div>
                            </div>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold shadow-sm">
                                OCUPADA
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bill Details */}
            <div className="flex-1 bg-white rounded-xl shadow-sm p-4 lg:p-6 flex flex-col border border-gray-100 min-h-[500px]">
                {selectedTable ? (
                    <>
                        <div className="flex justify-between items-center border-b pb-4 mb-4">
                            <h2 className="text-xl lg:text-2xl font-bold text-gray-800">Checkout - Mesa {selectedTable.number}</h2>
                            <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto mb-6 pr-2">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th className="p-3 rounded-tl-lg">Item</th>
                                        <th className="p-3 text-right">Qtd</th>
                                        <th className="p-3 text-right hidden sm:table-cell">Unitário</th>
                                        <th className="p-3 text-right rounded-tr-lg">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {tableOrders.flatMap(order => order.items).map((item, idx) => {
                                        const product = state.products.find(p => p.id === item.productId);
                                        if (!product) return null;
                                        return (
                                            <tr key={`${item.id}-${idx}`} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-700">{product.name}</td>
                                                <td className="p-3 text-right">{item.quantity}</td>
                                                <td className="p-3 text-right hidden sm:table-cell">R$ {product.price.toFixed(2)}</td>
                                                <td className="p-3 text-right font-bold">R$ {(product.price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {tableOrders.length === 0 && <div className="text-center py-10 text-gray-400">Nenhum pedido lançado nesta mesa.</div>}
                        </div>

                        <div className="bg-slate-50 p-4 lg:p-6 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-500 font-medium">Total a Pagar</span>
                                <span className="text-3xl lg:text-4xl font-bold text-slate-800">R$ {totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => handlePayment('CASH')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-green-100 hover:border-green-500 hover:bg-green-50 rounded-xl transition-all text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DollarSign size={24} /> 
                                    <span className="font-bold">Dinheiro</span>
                                </button>
                                <button 
                                    onClick={() => handlePayment('PIX')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-purple-100 hover:border-purple-500 hover:bg-purple-50 rounded-xl transition-all text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Smartphone size={24} />
                                    <span className="font-bold">Pix</span>
                                </button>
                                <button 
                                    onClick={() => handlePayment('DEBIT')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-cyan-100 hover:border-cyan-500 hover:bg-cyan-50 rounded-xl transition-all text-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CreditCard size={24} />
                                    <span className="font-bold">Débito</span>
                                </button>
                                <button 
                                    onClick={() => handlePayment('CREDIT')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CreditCard size={24} />
                                    <span className="font-bold">Crédito</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Receipt size={64} className="mb-4 text-gray-200" />
                        <p>Selecione uma mesa para processar o pagamento</p>
                    </div>
                )}
            </div>
          </div>
      )}

      {activeTab === 'HISTORY' && (
          <div className="flex-1 p-4 lg:p-8 h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Histórico de Transações</h2>
              
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
                   <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-100 text-gray-600 text-sm">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Data/Hora</th>
                                <th className="p-4">Mesa</th>
                                <th className="p-4">Resumo do Pedido</th>
                                <th className="p-4">Caixa</th>
                                <th className="p-4">Método</th>
                                <th className="p-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...state.transactions].reverse().map(t => (
                                <tr key={t.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-mono text-xs text-gray-500">{t.id.slice(0, 8)}...</td>
                                    <td className="p-4 text-sm">{t.timestamp.toLocaleString()}</td>
                                    <td className="p-4 font-bold">Mesa {t.tableNumber}</td>
                                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={t.itemsSummary}>{t.itemsSummary}</td>
                                    <td className="p-4 text-sm">{t.cashierName}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap
                                            ${t.method === 'PIX' ? 'bg-purple-100 text-purple-700' : ''}
                                            ${t.method === 'CREDIT' ? 'bg-blue-100 text-blue-700' : ''}
                                            ${t.method === 'DEBIT' ? 'bg-cyan-100 text-cyan-700' : ''}
                                            ${t.method === 'CASH' ? 'bg-green-100 text-green-700' : ''}
                                            ${t.method === 'CARD' ? 'bg-gray-100 text-gray-700' : ''} 
                                        `}>
                                            {t.method === 'CREDIT' ? 'CRÉDITO' : 
                                             t.method === 'DEBIT' ? 'DÉBITO' : 
                                             t.method === 'CASH' ? 'DINHEIRO' : 
                                             t.method === 'CARD' ? 'CARTÃO' : t.method}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-800">R$ {t.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            {state.transactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">Nenhuma venda registrada ainda.</td>
                                </tr>
                            )}
                        </tbody>
                   </table>
              </div>
          </div>
      )}
    </div>
  );
};