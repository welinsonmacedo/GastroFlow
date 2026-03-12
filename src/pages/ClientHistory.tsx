
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/context/AuthProvider';
import { supabase } from '@/core/api/supabaseClient';
import { motion } from 'motion/react';
import { Clock, ChevronLeft, ShoppingBag, Calendar, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlobalLoading } from '../components/GlobalLoading';

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

export const ClientHistory = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('ClientHistory useEffect:', { isEmbedded, isLoading: authState.isLoading, isAuthenticated: authState.isAuthenticated, currentUser: authState.currentUser });
    if (!isEmbedded && !authState.isLoading && !authState.isAuthenticated) {
      navigate('/client/login?redirect=/client/home');
      return;
    }

    if (authState.currentUser?.id) {
      console.log('ClientHistory: Calling fetchHistory');
      fetchHistory();
    } else {
      console.log('ClientHistory: authState.currentUser?.id is falsy. Not calling fetchHistory.');
      // Forçar o loading false se não tiver usuário, para não ficar preso
      if (!authState.isLoading && authState.isAuthenticated) {
         setLoading(false);
      }
    }
  }, [authState.currentUser, authState.isLoading]);

  const fetchHistory = async () => {
    console.log('ClientHistory: Starting fetchHistory for user:', authState.currentUser?.auth_user_id);
    try {
      setLoading(true);
      
      // Query orders directly instead of using RPC for better reliability
      // RLS policies already ensure clients only see their own orders
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          tenants ( name ),
          items:order_items (
            product_name,
            quantity,
            unit_price
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ClientHistory: Query Error:', error);
        throw error;
      }
      
      console.log('ClientHistory: Received data:', data);
      
      const mappedOrders: HistoryOrder[] = (data || []).map((o: any) => ({
        id: o.id,
        status: o.status,
        total: o.total_amount,
        date: o.created_at,
        restaurant_name: o.tenants?.name || 'Restaurante',
        items: (o.items || []).map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          price: i.unit_price
        }))
      }));

      setOrders(mappedOrders);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <GlobalLoading message="Carregando histórico..." />;
  }

  return (
    <div className={`bg-zinc-950 text-white ${isEmbedded ? 'h-full' : 'min-h-screen pb-20'}`}>
      <header className="bg-zinc-900 p-4 sticky top-0 z-10 border-b border-zinc-800 flex items-center gap-4">
        {!isEmbedded && (
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full">
            <ChevronLeft />
          </button>
        )}
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
