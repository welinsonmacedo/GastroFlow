
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';
import { useRestaurant } from '../context/RestaurantContext';

interface QRCodeGeneratorProps {
  tableId: string;
  size?: number;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ tableId, size = 150 }) => {
  // Tenta obter do contexto primeiro (mais confiável se estiver dentro do App)
  let currentSlug = '';
  
  try {
      const { state } = useRestaurant();
      if (state.tenantSlug) currentSlug = state.tenantSlug;
  } catch (e) {
      // Se estiver fora do provider, usa o utilitário
      currentSlug = getTenantSlug() || '';
  }

  // Fallback final
  if (!currentSlug) currentSlug = getTenantSlug() || '';
  
  if (!currentSlug) {
      return (
          <div className="flex flex-col items-center p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="text-red-500 mb-2" size={24} />
              <p className="text-[10px] text-red-600 font-bold text-center">Slug não encontrado.<br/>Verifique a URL.</p>
          </div>
      );
  }

  // Constrói a URL completa. 
  // IMPORTANTE: Adiciona ?restaurant=slug para garantir que o app carregue o contexto certo
  const targetUrl = `${window.location.origin}/client/table/${tableId}?restaurant=${currentSlug}`;
  
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
