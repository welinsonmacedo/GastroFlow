import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { QRCodeGenerator } from '../../components/QRCodeGenerator';
import { Plus, Printer, Trash2 } from 'lucide-react';

export const AdminTables: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showConfirm } = useUI();

  const getTableUrl = (tableId: string) => `${window.location.origin}/client/table/${tableId}?restaurant=${state.tenantSlug}`;
  
  const handlePrint = (tableId: string) => {
    const targetUrl = getTableUrl(tableId);
    const encodedUrl = encodeURIComponent(targetUrl);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&bgcolor=ffffff`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Mesa ${tableId}</title></head><body style="text-align:center;"><h1>Mesa ${tableId.replace('t','')}</h1><img src="${qrImageUrl}" onload="window.print();window.close()" /></body></html>`);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Mesas & QR Codes</h2>
                <p className="text-sm text-gray-500">Gerencie as mesas do seu estabelecimento.</p>
            </div>
            <Button onClick={() => dispatch({ type: 'ADD_TABLE' })}><Plus size={16}/> Adicionar Mesa</Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {state.tables.map(table => (
                <div key={table.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center relative group hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-lg mb-2 text-gray-700">Mesa {table.number}</h3>
                    <div className="mb-4 bg-white p-2 rounded border">
                        <QRCodeGenerator tableId={table.id} size={120} />
                    </div>
                    <div className="flex gap-2 w-full">
                        <Button variant="secondary" size="sm" onClick={() => handlePrint(table.id)} className="flex-1" title="Imprimir"><Printer size={16}/></Button>
                        <Button variant="danger" size="sm" onClick={() => showConfirm({ title: 'Excluir Mesa', message: 'Tem certeza? O QR Code antigo deixará de funcionar.', onConfirm: () => dispatch({ type: 'DELETE_TABLE', tableId: table.id }) })} className="flex-1" title="Excluir"><Trash2 size={16}/></Button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};