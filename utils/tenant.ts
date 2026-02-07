export const getTenantSlug = (): string | null => {
  const path = window.location.pathname;

  // Lista de rotas que pertencem EXCLUSIVAMENTE ao contexto SaaS.
  // Se o usuário estiver tentando acessar estas rotas, ignoramos o contexto de restaurante
  // para permitir que o roteador do SaaS assuma o controle.
  const saasRoutes = ['/sys-admin', '/dashboard', '/register', '/login-owner'];
  
  if (saasRoutes.some(route => path.startsWith(route))) {
      return null;
  }

  // 1. Prioridade: Parâmetro de URL
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('restaurant');
  
  if (tenantParam && tenantParam !== 'null' && tenantParam !== 'undefined') {
      // Persiste na sessão para navegação interna não perder o contexto
      sessionStorage.setItem('gastroflow_tenant_slug', tenantParam);
      return tenantParam;
  }

  // 2. Session Storage (Fallback Prioritário)
  // Verifica o storage ANTES de validar o host para garantir persistência em Vercel/Localhost
  const storedSlug = sessionStorage.getItem('gastroflow_tenant_slug');
  if (storedSlug && storedSlug !== 'null' && storedSlug !== 'undefined') {
      return storedSlug;
  }

  // 3. Análise do Host (Subdomínios)
  const host = window.location.hostname;
  
  // Ignora localhost e IPs locais se não tiver parâmetro nem sessão
  if (host.includes('localhost') || host === '127.0.0.1') {
      return null;
  }
  
  // Ignora domínios da Vercel para evitar que o nome do projeto seja interpretado como um restaurante
  if (host.includes('.vercel.app')) return null;

  // Ignora www
  if (host.startsWith('www.')) return null;

  // 4. Subdomínios para domínios personalizados (ex: bistro.meusite.com)
  const parts = host.split('.');
  
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
};