import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface GlobalLoadingProps {
  message?: string;
}

export function GlobalLoading({ message = 'Carregando...' }: GlobalLoadingProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center bg-white p-8 rounded-3xl shadow-2xl border border-gray-100"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
        >
          <h3 className="text-xl font-black text-gray-800 tracking-tight">Aguarde</h3>
          <p className="text-gray-500 font-medium mt-1 animate-pulse">{message}</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
