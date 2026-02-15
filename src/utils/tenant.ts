
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

  const host = window.location.hostname;
  
  if (host.includes('localhost') || host === '127.0.0.1') {
      return null;
  }
  
  if (host.includes('.vercel.app')) return null;

  if (host.startsWith('www.')) return null;

  const parts = host.split('.');
  
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
};
