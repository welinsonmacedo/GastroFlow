export const resolveTenantFromUrl = (): string | null => {
  const path = window.location.pathname;
  
  // Exemplo: /r/meu-restaurante
  const pathParts = path.split('/');
  if (pathParts[1] === 'r' && pathParts[2]) {
    return pathParts[2];
  }
  
  // Exemplo: /admin/meu-restaurante
  if (pathParts[1] === 'admin' && pathParts[2]) {
    return pathParts[2];
  }

  const saasRoutes = ['/sys-admin', '/dashboard', '/register', '/login'];
  
  if (path === '/' || saasRoutes.some(route => path.startsWith(route))) {
      sessionStorage.removeItem('fluxeat_tenant_slug');
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
  
  if (parts.length >= 2) {
    return parts[0];
  }

  return null;
};

export const getTenantSlug = resolveTenantFromUrl;

