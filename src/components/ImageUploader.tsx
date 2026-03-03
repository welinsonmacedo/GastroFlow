
import React, { useState } from 'react';
import { Upload, Link, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  maxSizeKB?: number; // Novo limite opcional, padrão 300KB
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, maxSizeKB = 300 }) => {
  // NOTE: Frontend validation is present, but server-side validation 
  // via Supabase Storage Policies is mandatory for security.
  const [mode, setMode] = useState<'URL' | 'FILE'>('URL');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    
    if (file) {
      // Validação de tamanho
      if (file.size > maxSizeKB * 1024) {
          setError(`A imagem é muito grande! Máximo permitido: ${maxSizeKB}KB.`);
          e.target.value = ''; // Limpa o input
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3 border p-3 rounded-lg bg-gray-50">
      <div className="flex gap-2 mb-2">
        <button 
          type="button"
          onClick={() => { setMode('URL'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors ${mode === 'URL' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <Link size={16} /> Link URL
        </button>
        <button 
          type="button"
          onClick={() => { setMode('FILE'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors ${mode === 'FILE' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <Upload size={16} /> Upload Foto
        </button>
      </div>

      {mode === 'URL' ? (
        <input 
          type="text" 
          className="w-full border p-2 rounded text-sm" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg" 
        />
      ) : (
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-100 transition-colors">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="pointer-events-none text-gray-500">
             <ImageIcon className="mx-auto mb-2" />
             <span className="text-xs">Clique para selecionar (Máx {maxSizeKB}KB)</span>
          </div>
        </div>
      )}

      {error && (
          <div className="text-xs text-red-500 flex items-center gap-1 font-bold">
              <AlertCircle size={12} /> {error}
          </div>
      )}

      {value && (
        <div className="mt-2 w-full h-32 bg-white rounded border flex items-center justify-center overflow-hidden relative group">
           <img src={value} alt="Preview" className="h-full object-contain" />
           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
              Pré-visualização
           </div>
           <button 
                type="button"
                onClick={() => onChange('')} 
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
           >
               <AlertCircle size={12} className="rotate-45" />
           </button>
        </div>
      )}
    </div>
  );
};
