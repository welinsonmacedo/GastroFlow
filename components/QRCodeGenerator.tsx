import React from 'react';

interface QRCodeGeneratorProps {
  tableId: string;
  size?: number;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ tableId, size = 150 }) => {
  // Constrói a URL completa baseada na localização atual do navegador + HashRouter
  const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  const targetUrl = `${baseUrl}#/client/table/${tableId}`;
  
  // Codifica a URL para ser passada como parâmetro para a API de QR Code
  const encodedUrl = encodeURIComponent(targetUrl);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&bgcolor=ffffff`;

  return (
    <div className="flex flex-col items-center p-4 bg-white border rounded-xl shadow-sm">
      <div className="mb-2 font-mono text-xs text-gray-500 break-all text-center max-w-[200px]">
        Mesa {tableId.replace('t', '')}
      </div>
      <img 
        src={qrImageUrl} 
        alt={`QR Code Mesa ${tableId}`} 
        width={size} 
        height={size}
        className="rounded-lg" 
        loading="lazy"
      />
      <div className="mt-2 text-[10px] text-gray-400">
        Scan para pedir
      </div>
    </div>
  );
};