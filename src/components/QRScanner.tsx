import { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, X } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    let isMounted = true;
    
    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                if (isMounted) onScanSuccess(decodedText);
              }).catch(console.error);
            }
          },
          () => {
            // Ignore scan errors, they happen constantly when no QR code is in view
          }
        );
        if (isMounted) setIsStarting(false);
      } catch (err) {
        console.error("Error starting scanner:", err);
        if (isMounted) {
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
          setIsStarting(false);
        }
      }
    };

    // Small delay to ensure the DOM element is fully rendered
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 bg-zinc-800 rounded-full z-10"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div className="w-full max-w-md bg-zinc-900 rounded-xl overflow-hidden relative aspect-square flex items-center justify-center">
        {isStarting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-zinc-900">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Iniciando câmera...</p>
          </div>
        )}
        
        <div id="reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"></div>
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 p-6 text-center z-20">
            <div className="bg-red-500/10 text-red-500 p-4 rounded-lg border border-red-500/20">
              {error}
            </div>
          </div>
        )}
      </div>
      
      <p className="text-zinc-400 mt-6 text-center text-sm max-w-xs">
        Aponte a câmera para o QR Code da mesa para abrir o cardápio
      </p>
    </div>
  );
};
