import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Lida com requisições CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extrai o token de autorização do cabeçalho
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Cabeçalho de autorização ausente')
    }

    // 2. Cria um cliente Supabase usando as variáveis de ambiente e o token do usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 3. Valida o token e obtém o usuário
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuário não autenticado ou token inválido')
    }

    // 4. O usuário está autenticado! 
    // Aqui você pode adicionar a lógica da sua Edge Function.
    // Como exemplo, vamos retornar os dados do usuário e a URL que ele tentou acessar.
    
    const requestUrl = new URL(req.url)

    return new Response(
      JSON.stringify({ 
        message: 'Acesso permitido', 
        user: { id: user.id, email: user.email },
        path: requestUrl.pathname
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    // Retorna erro 401 (Unauthorized) se a autenticação falhar
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      }
    )
  }
})
