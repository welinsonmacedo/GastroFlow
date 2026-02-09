import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { QRCodeGenerator } from '../../components/QRCodeGenerator';
import { Plus, Printer, Trash2, Copy, Check, ExternalLink } from 'lucide-react';

export const AdminTables: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showConfirm, showAlert } = useUI();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getTableUrl = (tableId: string) => {
      // Garante que o slug esteja presente para não quebrar o link
      const slug = state.tenantSlug || ''; 
      return `${window.location.origin}/client/table/${tableId}?restaurant=${slug}`;
  };
  
  const handleCopyLink = (tableId: string) => {
      const url = getTableUrl(tableId);
      navigator.clipboard.writeText(url).then(() => {
          setCopiedId(tableId);
          setTimeout(() => setCopiedId(null), 2000);
          showAlert({ title: "Link Copiado", message: "Link da mesa copiado para a área de transferência.", type: 'SUCCESS' });
      });
  };

  const handleOpenLink = (tableId: string) => {
      const url = getTableUrl(tableId);
      window.open(url, '_blank');
  }
  
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {state.tables.map(table => (
                <div key={table.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center relative group hover:shadow-md transition-shadow">
                    <div className="w-full flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-gray-700">Mesa {table.number}</h3>
                        <button 
                            onClick={() => handleOpenLink(table.id)}
                            className="text-gray-400 hover:text-blue-600 p-1" 
                            title="Abrir Link em Nova Aba"
                        >
                            <ExternalLink size={14} />
                        </button>
                    </div>
                    
                    <div className="mb-4 bg-white p-2 rounded border">
                        <QRCodeGenerator tableId={table.id} size={120} />
                    </div>
                    
                    <div className="flex flex-col w-full gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCopyLink(table.id)} 
                            className={`w-full flex items-center justify-center gap-2 ${copiedId === table.id ? 'text-green-600 border-green-200 bg-green-50' : ''}`}
                        >
                            {copiedId === table.id ? <Check size={16}/> : <Copy size={16}/>}
                            {copiedId === table.id ? 'Copiado' : 'Copiar Link'}
                        </Button>
                        <div className="flex gap-2 w-full">
                            <Button variant="secondary" size="sm" onClick={() => handlePrint(table.id)} className="flex-1" title="Imprimir QR"><Printer size={16}/></Button>
                            <Button variant="danger" size="sm" onClick={() => showConfirm({ title: 'Excluir Mesa', message: 'Tem certeza? O QR Code antigo deixará de funcionar.', onConfirm: () => dispatch({ type: 'DELETE_TABLE', tableId: table.id }) })} className="flex-1" title="Excluir"><Trash2 size={16}/></Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};