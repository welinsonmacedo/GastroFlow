import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lida com requisições CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Extrai o token JWT do cabeçalho de autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Acesso negado: Cabeçalho de autorização ausente. Você precisa estar logado.')
    }

    // 3. Cria um cliente Supabase usando as variáveis de ambiente e o token do usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 4. Valida o token e obtém o usuário atual
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Falha na autenticação:', userError?.message)
      throw new Error('Usuário não autenticado ou token expirado/inválido.')
    }

    // 5. O usuário está autenticado! 
    // Aqui você pode adicionar lógica de monitoramento, logs de auditoria, ou roteamento para outros serviços.
    
    const requestUrl = new URL(req.url)
    const method = req.method
    
    // Exemplo de log de monitoramento no console da Edge Function
    console.log(`[MONITOR] Usuário ${user.email} (${user.id}) acessou ${method} ${requestUrl.pathname}`)

    // 6. Retorna sucesso e os dados validados
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Requisição autenticada e monitorada com sucesso.', 
        user: { 
            id: user.id, 
            email: user.email,
            role: user.role
        },
        request_info: {
            path: requestUrl.pathname,
            method: method,
            timestamp: new Date().toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    // 7. Retorna erro 401 (Unauthorized) se a autenticação falhar
    console.error('[MONITOR] Requisição bloqueada:', error instanceof Error ? error.message : 'Erro desconhecido')
    return new Response(
      JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro interno de autenticação' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      }
    )
  }
})
