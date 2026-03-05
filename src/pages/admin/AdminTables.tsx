
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useOrder } from '../../context/OrderContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { QRCodeGenerator } from '../../components/QRCodeGenerator';
import { getTenantSlug } from '../../utils/tenant';
import { Plus, Printer, Trash2, Copy, Check, ExternalLink } from 'lucide-react';
import { printHtml } from '../../utils/printHelper';

export const AdminTables: React.FC = () => {
  const { state } = useRestaurant();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  const { showConfirm, showAlert } = useUI();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getTableUrl = (tableId: string) => {
      const slug = state.tenantSlug || getTenantSlug() || ''; 
      if (!slug) return '';
      return `${window.location.origin}/client/table/${tableId}?restaurant=${slug}`;
  };
  
  const handleCopyLink = (tableId: string) => {
      const url = getTableUrl(tableId);
      if (!url) {
          showAlert({ title: "Erro", message: "Não foi possível identificar o slug do restaurante. Verifique a URL.", type: 'ERROR' });
          return;
      }
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
    const table = orderState.tables.find(t => t.id === tableId);
    const tableNumber = table ? table.number : '??';
    const restaurantName = state.theme.restaurantName || 'Restaurante';

    const targetUrl = getTableUrl(tableId);
    const encodedUrl = encodeURIComponent(targetUrl);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodedUrl}&bgcolor=ffffff`;
    
    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mesa ${tableNumber} - QR Code</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background-color: #fff;
              }
              .card {
                border: 2px dashed #000;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                width: 300px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .welcome { font-size: 16px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 5px; }
              .restaurant-name { font-size: 24px; font-weight: 900; margin-bottom: 20px; line-height: 1.2; }
              .table-number { font-size: 48px; font-weight: 900; line-height: 1; margin: 10px 0; }
              .qr-img { width: 200px; height: 200px; margin: 10px 0; }
              .instruction { font-size: 14px; font-weight: 500; color: #333; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="welcome">Seja Bem-vindo!</div>
              <div class="restaurant-name">${restaurantName}</div>
              <div class="table-number">Mesa ${tableNumber}</div>
              <img src="${qrImageUrl}" class="qr-img" />
              <div class="instruction">Aponte a câmera do seu celular<br/>para acessar o cardápio e pedir.</div>
            </div>
          </body>
        </html>
    `;
    printHtml(html);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Mesas & QR Codes</h2>
                <p className="text-sm text-gray-500">Gerencie as mesas do seu estabelecimento.</p>
            </div>
            <Button onClick={() => orderDispatch({ type: 'ADD_TABLE' })}><Plus size={16}/> Adicionar Mesa</Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {orderState.tables.map(table => (
                <div key={table.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center relative group hover:shadow-md transition-shadow">
                    <div className="w-full flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-gray-700">Mesa {table.number}</h3>
                        <button onClick={() => handleOpenLink(table.id)} className="text-gray-400 hover:text-blue-600 p-1" title="Abrir Link"><ExternalLink size={14} /></button>
                    </div>
                    
                    <div className="mb-4 bg-white p-2 rounded border">
                        <QRCodeGenerator tableId={table.id} size={120} />
                    </div>
                    
                    <div className="flex flex-col w-full gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleCopyLink(table.id)} className={`w-full flex items-center justify-center gap-2 ${copiedId === table.id ? 'text-green-600 border-green-200 bg-green-50' : ''}`}>
                            {copiedId === table.id ? <Check size={16}/> : <Copy size={16}/>} {copiedId === table.id ? 'Copiado' : 'Copiar Link'}
                        </Button>
                        <div className="flex gap-2 w-full">
                            <Button variant="secondary" size="sm" onClick={() => handlePrint(table.id)} className="flex-1" title="Imprimir QR"><Printer size={16}/></Button>
                            <Button variant="danger" size="sm" onClick={() => showConfirm({ title: 'Excluir Mesa', message: 'Tem certeza?', onConfirm: () => orderDispatch({ type: 'DELETE_TABLE', tableId: table.id }) })} className="flex-1" title="Excluir"><Trash2 size={16}/></Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
