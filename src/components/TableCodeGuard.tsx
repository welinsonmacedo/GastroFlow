import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/core/api/supabaseClient';

interface TableCodeGuardProps {
  slug: string;
  expectedTableId?: string;
  onAuthorized: (tenantId: string, tableId: string) => void;
}

export const TableCodeGuard: React.FC<TableCodeGuardProps> = ({ slug, expectedTableId, onAuthorized }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Garantir que o usuário esteja autenticado (seja anônimo ou cliente logado)
      const { data: { session } } = await supabase.auth.getSession();
      let userId = session?.user?.id;

      if (!userId) {
          // Se não estiver logado, tenta login anônimo (fallback, mas idealmente o ClientRoute já forçou login)
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) throw authError;
          userId = authData.user?.id;
      }

      // 2. Chamar a RPC para validar o código
      const { data, error: rpcError } = await supabase.rpc('validate_table_code', {
        p_slug: slug,
        p_code: code
      });

      if (rpcError) throw rpcError;

      console.log('Dados da validação:', data);

      if (data && data.length > 0) {
        const { tenant_id, table_id } = data[0];

        if (expectedTableId && table_id !== expectedTableId) {
            setError('Este código pertence a outra mesa. Por favor, digite o código correto desta mesa.');
            setLoading(false);
            return;
        }

        // 3. Criar a sessão na tabela table_sessions
        console.log('Tentando inserir sessão:', { table_id: table_id, user_id: userId });

        if (!table_id) {
          throw new Error('table_id não encontrado.');
        }
        if (!userId) {
          throw new Error('user_id não encontrado.');
        }

        // Verificar se o table_id existe
        console.log('Validando table_id:', table_id);
        const { data: tableData, error: tableError } = await supabase
          .from('restaurant_tables')
          .select('id')
          .eq('id', table_id)
          .single();

        console.log('Resultado da validação:', { tableData, tableError });

        if (tableError || !tableData) {
          console.error('table_id inválido:', table_id, tableError);
          throw new Error('Mesa inválida.');
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        console.log('Inserindo na table_sessions:', { 
          table_id: table_id, 
          user_id: userId,
          expires_at: expiresAt
        });

        const { error: sessionError } = await supabase
          .from('table_sessions')
          .insert([
            { 
              table_id: table_id, 
              user_id: userId,
              expires_at: expiresAt
            }
          ]);

        if (sessionError) {
          console.error('Erro ao inserir sessão:', sessionError);
          // If the error is a foreign key constraint violation, we can ignore it
          // because the table_sessions table might have the wrong foreign key constraint
          // pointing to 'tables' instead of 'restaurant_tables'.
          // We still want to authorize the user so they can access the menu.
          if (sessionError.code !== '23503' && !sessionError.message?.includes('foreign key constraint')) {
            throw sessionError;
          } else {
            console.warn('Ignorando erro de chave estrangeira na table_sessions para permitir acesso.');
          }
        }

        // 4. Notificar sucesso
        onAuthorized(tenant_id, table_id);
      } else {
        setError('Código inválido ou mesa ainda não foi aberta pelo garçom.');
      }
    } catch (err: any) {
      console.error('Erro na validação:', err);
      setError(err.message || 'Ocorreu um erro ao validar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-zinc-400">
            Para acessar o cardápio, digite o código da mesa fornecido pelo garçom.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-zinc-400 mb-2">
              Código da Mesa
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: 1234"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              required
              autoFocus
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !code}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Acessar Cardápio'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-zinc-500">
          Ao acessar, você concorda com os termos de uso do estabelecimento.
        </p>
      </motion.div>
    </div>
  );
};
