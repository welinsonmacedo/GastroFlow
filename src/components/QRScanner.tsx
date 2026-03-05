import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Success callback
        scanner.clear().catch(console.error);
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        // Error callback
        // console.warn(errorMessage);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 bg-zinc-800 rounded-full"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div className="w-full max-w-md bg-white rounded-xl overflow-hidden relative">
        <div id="reader" className="w-full"></div>
        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-2 rounded text-center text-sm">
            {error}
          </div>
        )}
      </div>
      
      <p className="text-zinc-400 mt-4 text-center text-sm">
        Aponte a câmera para o QR Code da mesa para abrir o cardápio
      </p>
    </div>
  );
};
