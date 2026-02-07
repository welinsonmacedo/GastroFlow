export const getTenantSlug = (): string | null => {
  // 1. Prioridade: Parâmetro de URL (para testes locais: localhost:3000/?restaurant=bistro)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('restaurant');
  if (tenantParam) return tenantParam;

  // 2. Análise do Host
  const host = window.location.hostname;
  
  // Ignora localhost e IPs locais
  if (host.includes('localhost') || host === '127.0.0.1') return null;
  
  // Ignora domínios da Vercel para evitar que o nome do projeto seja interpretado como um restaurante (tenant)
  // Isso garante que https://gastro-flow.vercel.app abra a Landing Page/SaaS e não tente buscar um restaurante chamado "gastro-flow"
  if (host.includes('.vercel.app')) return null;

  // Ignora www
  if (host.startsWith('www.')) return null;

  // 3. Subdomínios para domínios personalizados (ex: bistro.meusite.com)
  const parts = host.split('.');
  
  // Assume que domínios têm pelo menos duas partes (google.com). 
  // Se tiver 3 ou mais (bistro.google.com), a primeira parte é o tenant.
  // Nota: Isso pode precisar de ajuste dependendo de TLDs compostos (.co.uk), mas serve para a maioria dos casos simples.
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
};