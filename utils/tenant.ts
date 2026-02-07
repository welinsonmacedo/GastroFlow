export const getTenantSlug = (): string | null => {
  // 1. Prioridade: Parâmetro de URL (para testes locais: localhost:3000/?restaurant=bistro)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('restaurant');
  if (tenantParam) return tenantParam;

  // 2. Subdomínio (produção: bistro.gastroflow.com)
  const host = window.location.hostname;
  
  // Ignora localhost e domínios www
  if (host.includes('localhost') || host === '127.0.0.1') return null;
  if (host.startsWith('www.')) return null;

  // Se houver subdomínio, retorna a primeira parte
  const parts = host.split('.');
  if (parts.length >= 2) {
    // Ex: bistro.dominio.com -> bistro
    return parts[0];
  }

  return null;
};