export const getTenantSlug = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('restaurant');
  if (slug) return slug;
  
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] === 'r' && pathParts[2]) return pathParts[2];
  
  return null;
};
