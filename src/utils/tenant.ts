
export const getTenantSlug = (): string | null => {
  const path = window.location.pathname;

  const saasRoutes = ['/sys-admin', '/dashboard', '/register', '/login-owner'];
  
  if (saasRoutes.some(route => path.startsWith(route))) {
      return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('restaurant');
  
  if (tenantParam && tenantParam !== 'null' && tenantParam !== 'undefined') {
      sessionStorage.setItem('fluxeat_tenant_slug', tenantParam);
      return tenantParam;
  }

  const storedSlug = sessionStorage.getItem('fluxeat_tenant_slug');
  if (storedSlug && storedSlug !== 'null' && storedSlug !== 'undefined') {
      return storedSlug;
  }

  let host = window.location.hostname;
  
  if (host.startsWith('www.')) {
      host = host.substring(4);
  }

  // Lista de domínios que NÃO devem ser tratados como subdomínios de tenant
  const systemDomains = [
    'localhost', 
    '127.0.0.1', 
    'vercel.app', 
    'run.app', 
    'web.app', 
    'firebaseapp.com',
    'netlify.app',
    'github.io'
  ];

  if (systemDomains.some(domain => host.includes(domain))) {
      return null;
  }
  
  const parts = host.split('.');
  
  // Se for um domínio customizado (ex: restaurante.com ou restaurante.com.br)
  // No momento o sistema usa o primeiro termo como slug.
  if (parts.length >= 2) {
    return parts[0];
  }

  return null;
};
