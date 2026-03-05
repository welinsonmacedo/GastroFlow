
export const getTenantSlug = (): string | null => {
  const path = window.location.pathname;
  console.log('getTenantSlug - path:', path);

  const saasRoutes = ['/sys-admin', '/dashboard', '/register', '/login-owner'];
  
  if (saasRoutes.some(route => path.startsWith(route))) {
      console.log('getTenantSlug - saas route detected, returning null');
      return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('restaurant');
  console.log('getTenantSlug - tenantParam from URL:', tenantParam);
  
  if (tenantParam && tenantParam !== 'null' && tenantParam !== 'undefined') {
      sessionStorage.setItem('fluxeat_tenant_slug', tenantParam);
      return tenantParam;
  }

  const storedSlug = sessionStorage.getItem('fluxeat_tenant_slug');
  console.log('getTenantSlug - storedSlug from sessionStorage:', storedSlug);
  if (storedSlug && storedSlug !== 'null' && storedSlug !== 'undefined') {
      return storedSlug;
  }

  let host = window.location.hostname;
  console.log('getTenantSlug - hostname:', host);
  
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
      console.log('getTenantSlug - system domain detected, returning null');
      return null;
  }
  
  const parts = host.split('.');
  
  // Se for um domínio customizado (ex: restaurante.com ou restaurante.com.br)
  // No momento o sistema usa o primeiro termo como slug.
  if (parts.length >= 2) {
    console.log('getTenantSlug - slug found from hostname:', parts[0]);
    return parts[0];
  }

  console.log('getTenantSlug - no slug found, returning null');
  return null;
};
