
import React, { useState } from 'react';
import { Upload, Link, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  maxSizeKB?: number; // Novo limite opcional, padrão 300KB
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, maxSizeKB = 300 }) => {
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
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font