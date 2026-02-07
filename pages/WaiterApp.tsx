import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { TableStatus, OrderStatus, ProductType } from '../types';
import { Button } from '../components/Button';
import { CheckCircle, Coffee, User, Key, X } from 'lucide-react';

export const WaiterApp: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // Active items ready to serve (Kitchen Ready OR Bar Pending)
  const readyToServeItems = state.orders.flatMap(order => 
    order.items
      .filter(item => 
        (item.status === OrderStatus.READY && item.productType === ProductType.KITCHEN) || 
        (item.status === OrderStatus.PENDING && item.productType === ProductType.BAR)
      )
      .map(item => ({ ...item, tableId: order.tableId, orderId: order.id }))
  );

  const handleTableClick = (tableId: string, currentStatus: TableStatus) => {
    if (currentStatus === TableStatus.AVAILABLE) {
      // Inicia fluxo de abertura
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedCode(code);
      setCustomerName('');
      setSelectedTableForOpen(tableId);
    } else {
      if(window.confirm("Fechar esta mesa? Isso limpará a sessão atual.")) {
          dispatch({ type: 'CLOSE_TABLE', tableId });
      }
    }
  };

  const confirmOpenTable = () => {
    if (selectedTableForOpen) {
      dispatch({ 
        type: 'OPEN_TABLE', 
        tableId: selectedTableForOpen, 
        customerName: customerName || 'Cliente', 
        accessCode: generatedCode 
      });
      setSelectedTableForOpen(null);
    }
  };

  const markDelivered = (orderId: string, itemId: string) => {
    dispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId, status: OrderStatus.DELIVERED });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      
      {/* Modal de Abertura de Mesa */}
      {selectedTableForOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold">Abrir Mesa</h3>
               <button onClick={() => setSelectedTableForOpen(null)}><X size={24}/></button>
            </div>
            
            <div className="mb-4">
               <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
               <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                  placeholder="Ex: João Silva"
               />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-center">
              <p className="text-sm text-blue-600 mb-1">Senha gerada para o cliente:</p>
              <div className="text-4xl font-mono font-bold text-blue-800 tracking-widest">{generatedCode}</div>
              <p className="text-xs text-blue-400 mt-1">Informe este código ao cliente.</p>
            </div>

            <Button className="w-full py-3" onClick={confirmOpenTable}>
               Confirmar e Liberar Mesa
            </Button>
          </div>
        </div>
      )}

      {/* Left Column: Tables Management */}
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Mesas</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {state.tables.map(table => (
            <div 
              key={table.id} 
              className={`p-4 rounded-xl shadow-sm border-2 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] relative
                ${table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500' : ''}
                ${table.status === TableStatus.AVAILABLE ? 'bg-gray-50 border-transparent hover:border-gray-300' : ''}
                ${table.status === TableStatus.WAITING_PAYMENT ? 'bg-yellow-50 border-yellow-400' : ''}
              `}
              onClick={() => handleTableClick(table.id, table.status)}
            >
              <div className="text-4xl font-bold mb-1 text-gray-700">{table.number}</div>
              
              {table.status === TableStatus.OCCUPIED && (
                <div className="flex flex-col items-center">
                   <div className="flex items-center gap-1 text-sm font-medium text-blue-800 mb-1">
                      <User size={12} /> {table.customerName}
                   </div>
                   <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      <Key size={10} /> {table.accessCode}
                   </div>
                </div>
              )}

              <div className={`text-xs font-bold uppercase px-2 py-1 rounded-full mt-2
                 ${table.status === TableStatus.OCCUPIED ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}
              `}>
                {table.status === TableStatus.AVAILABLE && 'LIVRE'}
                {table.status === TableStatus.OCCUPIED && 'OCUPADA'}
                {table.status === TableStatus.WAITING_PAYMENT && 'PAGAMENTO'}
                {table.status === TableStatus.CLOSED && 'FECHADA'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Action Center (Ready to Serve) */}
      <div className="bg-white rounded-xl shadow-lg p-4 h-fit sticky top-4">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b">
            <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {readyToServeItems.length}
            </div>
            <h2 className="text-xl font-bold text-gray-800">Para Servir / Bar</h2>
        </div>

        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            {readyToServeItems.length === 0 && (
                <div className="text-center text-gray-400 py-10">Tudo entregue!</div>
            )}
            {readyToServeItems.map((item, idx) => {
                const table = state.tables.find(t => t.id === item.tableId);
                return (
                    <div key={`${item.id}-${idx}`} className="border rounded-lg p-3 bg-gray-50 hover:bg-white transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg bg-black text-white px-2 rounded">M-{table?.number}</span>
                            {item.productType === ProductType.BAR ? (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                                    <Coffee size={12}/> BAR
                                </span>
                            ) : (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                                    <CheckCircle size={12}/> COZINHA PRONTA
                                </span>
                            )}
                        </div>
                        <div className="font-medium text-gray-800 mb-1">{item.quantity}x {item.productName}</div>
                        {item.notes && <div className="text-xs text-red-500 italic mb-2">Nota: {item.notes}</div>}
                        
                        <Button 
                            size="sm" 
                            variant="success" 
                            className="w-full"
                            onClick={(e) => { e.stopPropagation(); markDelivered(item.orderId, item.id); }}
                        >
                            Marcar Entregue
                        </Button>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};