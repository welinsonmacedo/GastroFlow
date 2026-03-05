
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Clock, ChevronLeft, ShoppingBag, Calendar, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HistoryOrder {
  id: string;
  status: string;
  total: number;
  date: string;
  restaurant_name: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

export const ClientHistory = () => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/client/login?redirect=/client/history');
      return;
    }

    if (authState.currentUser?.id) {
      fetchHistory();
    }
  }, [authState.currentUser, authState.isLoading]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_client_order_history', {
        p_client_id: authState.currentUser!.auth_user_id
      });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <header className="bg-zinc-900 p-4 sticky top-0 z-10 border-b border-zinc-800 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full">
          <ChevronLeft />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" />
          Histórico de Pedidos
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>Nenhum pedido encontrado.</p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{order.restaurant_name}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500' :
                  order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {order.status === 'DELIVERED' ? 'Entregue' : 
                   order.status === 'CANCELLED' ? 'Cancelado' : 
                   'Em Andamento'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-zinc-300">
                      <span className="text-zinc-500 font-mono mr-2">{item.quantity}x</span>
                      {item.name}
                    </span>
                    <span className="text-zinc-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-3 flex justify-between items-center font-bold">
                <span className="text-zinc-400 text-sm">Total</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
