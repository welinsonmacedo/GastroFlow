
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Palette, LayoutTemplate, Type, Image as ImageIcon, Smartphone, ChefHat, Plus, Search, ShoppingCart, Building2, MapPin, Phone, FileText, Save, Loader2, Store } from 'lucide-react';
import { RestaurantBusinessInfo } from '../../types';

export const AdminSettings: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert } = useUI();
  const [activeTab, setActiveTab] = useState<'VISUAL' | 'BUSINESS'>('VISUAL');
  
  // Theme State
  const [localTheme, setLocalTheme] = useState(state.theme);
  
  // Business Info State
  const [businessForm, setBusinessForm] = useState<RestaurantBusinessInfo>(state.businessInfo || {
      address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' }
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // --- ACTIONS ---

  const handleSaveTheme = async () => {
      await dispatch({ type: 'UPDATE_THEME', theme: localTheme });
      showAlert({ title: 'Sucesso', message: 'Configurações visuais atualizadas!', type: 'SUCCESS' });
  };

  const handleSaveBusiness = async () => {
      await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: businessForm });
      showAlert({ title: 'Sucesso', message: 'Dados da empresa atualizados!', type: 'SUCCESS' });
  };

  // --- HELPERS ---

  const formatCNPJ = (val: string) => val.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").slice(0, 18);
  const formatPhone = (val: string) => val.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").slice(0, 15);
  const formatCEP = (val: string) => val.replace(/\D/g, '').replace(/^(\d{5})(\d{3})/, "$1-$2").slice(0, 9);

  const handleCepBlur = async () => {
      const cep = businessForm.address?.cep?.replace(/\D/g, '');
      if (cep && cep.length === 8) {
          setLoadingCep(true);
          try {
              const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
              const data = await res.json();
              if (!data.erro) {
                  setBusinessForm(prev => ({
                      ...prev,
                      address: {
                          ...prev.address!,
                          street: data.logradouro,
                          neighborhood: data.bairro,
                          city: data.localidade,
                          state: data.uf
                      }
                  }));
              }
          } catch (e) {
              console.error(e);
          } finally {
              setLoadingCep(false);
          }
      }
  };

  // --- COMPONENTE DE PREVIEW (CELULAR) ---
  const MobilePreview = () => {
      const realProducts = state.products.filter(p => p.isVisible).slice(0, 5);
      const hasProducts = realProducts.length > 0;
      const displayProducts = hasProducts ? realProducts : [1, 2, 3].map((_, i) => ({
          id: `mock-${i}`, name: 'Produto Exemplo', description: 'Descrição do item aparecerá aqui...', price: 25.00, image: `https://source.unsplash.com/random/200x200?food&sig=${i}`
      }));
      const categories = hasProducts ? Array.from(new Set(state.products.map(p => p.category))).slice(0, 3) : ['Lanches', 'Bebidas', 'Sobremesas'];

      return (
          <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl overflow-hidden flex flex-col">
              <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
              <div className="bg-white h-6 w-full absolute top-0 left-0 z-20 opacity-90 flex justify-between px-4 items-center text-[10px] font-bold"><span>9:41</span><div className="flex gap-1"><div className="w-3 h-3 bg-black rounded-full"></div><div className="w-3 h-3 bg-black rounded-full"></div></div></div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col font-sans" style={{ backgroundColor: localTheme.backgroundColor, color: localTheme.fontColor }}>
                  <div className="bg-white shadow-sm p-4 pt-8 sticky top-0 z-10 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          {localTheme.logoUrl ? (<img src={localTheme.logoUrl} className="w-8 h-8 rounded-full object-cover bg-gray-100 p-0.5 border" />) : (<div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-blue-600"><ChefHat size={16}/></div>)}
                          <div className="leading-tight"><h3 className="font-bold text-xs text-gray-800">{localTheme.restaurantName || 'Nome do Restaurante'}</h3><p className="text-[9px] text-gray-400">Mesa 10</p></div>
                      </div>
                      <div className="relative p-1.5 bg-gray-100 rounded-full" style={{ color: localTheme.primaryColor }}><ShoppingCart size={14} /></div>
                  </div>
                  {localTheme.bannerUrl ? (
                      <div className="w-full h-32 bg-gray-200 relative shrink-0"><img src={localTheme.bannerUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3"><h2 className="text-white font-bold text-lg shadow-sm">{localTheme.restaurantName}</h2></div></div>
                  ) : (<div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300 text-xs shrink-0">Sem Banner</div>)}
                  <div className="p-3 pb-0"><div className="bg-white border rounded-lg p-2 flex items-center gap-2 shadow-sm"><Search size={14} className="text-gray-400" /><div className="text-xs text-gray-400">Buscar...</div></div></div>
                  <div className="flex gap-2 overflow-x-auto p-3 scrollbar-hide text-xs font-bold text-gray-600">{categories.map((cat, idx) => (<span key={idx} style={idx === 0 ? { color: localTheme.primaryColor, borderBottom: `2px solid ${localTheme.primaryColor}` } : {}} className={`pb-1 whitespace-nowrap ${idx !== 0 ? 'opacity-50' : ''}`}>{cat}</span>))}</div>
                  <div className={`p-3 pt-0 grid gap-3 ${localTheme.viewMode === 'GRID' ? 'grid-cols-2' : 'grid-cols-1'}`}>{displayProducts.map((product: any, i: number) => (<div key={i} className={`bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex ${localTheme.viewMode === 'GRID' ? 'flex-col' : 'flex-row gap-3 items-center'}`}><div className={`${localTheme.viewMode === 'GRID' ? 'w-full h-20 mb-2' : 'w-16 h-16 shrink-0'} bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center`}>{product.image ? (<img src={product.image} className="w-full h-full object-cover" alt="Produto" />) : (<ImageIcon size={24} className="text-gray-300" />)}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-gray-800 text-xs truncate">{product.name}</h4><p className="text-[10px] text-gray-400 line-clamp-1">{product.description || 'Sem descrição'}</p><div className="flex justify-between items-center mt-1"><span className="font-bold text-xs" style={{ color: localTheme.primaryColor }}>R$ {Number(product.price).toFixed(2)}</span><div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]" style={{ backgroundColor: localTheme.primaryColor }}><Plus size={10} /></div></div></div></div>))}</div>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
        
        <header className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Configurações Gerais</h2>
            <p className="text-gray-500">Gerencie a aparência do app e os dados do estabelecimento.</p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b">
            <button 
                onClick={() => setActiveTab('VISUAL')} 
                className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'VISUAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                <Palette size={18}/> Aparência & App
            </button>
            <button 
                onClick={() => setActiveTab('BUSINESS')} 
                className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'BUSINESS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                <Store size={18}/> Dados do Estabelecimento
            </button>
        </div>

        {/* --- TAB 1: VISUAL IDENTITY --- */}
        {activeTab === 'VISUAL' && (
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold mb-1 text-gray-800 flex items-center gap-2"><LayoutTemplate className="text-blue-600"/> Marca & Cores</h2>
                        <p className="text-sm text-gray-500 mb-6">Defina como seus clientes verão o cardápio digital.</p>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-gray-600 uppercase tracking-wider">Nome de Exibição (App)</label>
                                <input className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm focus:border-blue-500 focus:outline-none" value={localTheme.restaurantName} onChange={e => setLocalTheme({...localTheme, restaurantName: e.target.value})} placeholder="Ex: Burguer King" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <label className="block text-xs font-bold mb-2 text-gray-500 flex items-center gap-2"><Palette size={14}/> COR DE DESTAQUE</label>
                                    <div className="flex gap-3 items-center"><div className="relative w-12 h-12 rounded-full shadow-sm overflow-hidden border-2 border-white ring-1 ring-gray-200"><input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} /></div><input className="flex-1 border p-2 rounded-lg text-sm uppercase font-mono text-gray-600" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} /></div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <label className="block text-xs font-bold mb-2 text-gray-500 flex items-center gap-2"><LayoutTemplate size={14}/> COR DE FUNDO</label>
                                    <div className="flex gap-3 items-center"><div className="relative w-12 h-12 rounded-full shadow-sm overflow-hidden border-2 border-white ring-1 ring-gray-200"><input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} /></div><input className="flex-1 border p-2 rounded-lg text-sm uppercase font-mono text-gray-600" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} /></div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:col-span-2">
                                    <label className="block text-xs font-bold mb-2 text-gray-500 flex items-center gap-2"><Type size={14}/> COR DO TEXTO</label>
                                    <div className="flex gap-3 items-center"><div className="relative w-12 h-12 rounded-full shadow-sm overflow-hidden border-2 border-white ring-1 ring-gray-200"><input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0" value={localTheme.fontColor || '#1f2937'} onChange={e => setLocalTheme({...localTheme, fontColor: e.target.value})} /></div><input className="flex-1 border p-2 rounded-lg text-sm uppercase font-mono text-gray-600" value={localTheme.fontColor || '#1f2937'} onChange={e => setLocalTheme({...localTheme, fontColor: e.target.value})} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold mb-1 text-gray-800 flex items-center gap-2"><ImageIcon className="text-purple-600"/> Imagens & Layout</h2>
                        <p className="text-sm text-gray-500 mb-6">Logotipo, banner e disposição dos itens.</p>
                        <div className="space-y-6">
                            <div><label className="block text-xs font-bold mb-2 text-gray-600 uppercase tracking-wider">Logotipo (Pequeno)</label><ImageUploader value={localTheme.logoUrl} onChange={(val) => setLocalTheme({...localTheme, logoUrl: val})} maxSizeKB={200} /></div>
                            <div><label className="block text-xs font-bold mb-2 text-gray-600 uppercase tracking-wider">Banner Promocional (Capa)</label><ImageUploader value={localTheme.bannerUrl || ''} onChange={(val) => setLocalTheme({...localTheme, bannerUrl: val})} maxSizeKB={500} /></div>
                            <div>
                                <label className="block text-xs font-bold mb-2 text-gray-600 uppercase tracking-wider">Modo de Exibição do Menu</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setLocalTheme({...localTheme, viewMode: 'LIST'})} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localTheme.viewMode !== 'GRID' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}><div className="w-full space-y-2"><div className="bg-gray-300 h-2 rounded w-3/4"></div><div className="bg-gray-200 h-2 rounded w-1/2"></div></div><span className="text-xs font-bold">Lista (Padrão)</span></button>
                                    <button onClick={() => setLocalTheme({...localTheme, viewMode: 'GRID'})} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localTheme.viewMode === 'GRID' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}><div className="grid grid-cols-2 gap-2 w-full"><div className="bg-gray-300 h-8 rounded"></div><div className="bg-gray-300 h-8 rounded"></div></div><span className="text-xs font-bold">Grade (Fotos Grandes)</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleSaveTheme} className="w-full py-4 text-lg shadow-lg">Salvar Configurações</Button>
                </div>
                <div className="lg:w-[350px] shrink-0">
                    <div className="sticky top-6">
                        <div className="text-center mb-4"><h3 className="font-bold text-gray-700 flex items-center justify-center gap-2"><Smartphone size={18} /> Preview em Tempo Real</h3><p className="text-xs text-gray-400">É assim que seu cliente verá o app.</p></div>
                        <MobilePreview />
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB 2: BUSINESS DATA --- */}
        {activeTab === 'BUSINESS' && (
            <div className="max-w-3xl mx-auto">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold mb-1 text-gray-800 flex items-center gap-2"><Building2 className="text-orange-600"/> Dados da Empresa</h2>
                    <p className="text-sm text-gray-500 mb-8">Estes dados aparecem nas notas impressas e no rodapé do sistema.</p>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-gray-600 uppercase">CNPJ</label>
                                <div className="relative">
                                    <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        className="w-full border p-2.5 pl-9 rounded-lg text-sm" 
                                        value={businessForm.cnpj || ''} 
                                        onChange={e => setBusinessForm({...businessForm, cnpj: formatCNPJ(e.target.value)})}
                                        placeholder="00.000.000/0000-00"
                                        maxLength={18}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-gray-600 uppercase">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        className="w-full border p-2.5 pl-9 rounded-lg text-sm" 
                                        value={businessForm.phone || ''} 
                                        onChange={e => setBusinessForm({...businessForm, phone: formatPhone(e.target.value)})}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16}/> Endereço</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold mb-1 text-gray-600">CEP</label>
                                    <div className="relative">
                                        <input 
                                            className="w-full border p-2.5 rounded-lg text-sm"
                                            value={businessForm.address?.cep || ''}
                                            onChange={e => setBusinessForm(prev => ({...prev, address: {...prev.address!, cep: formatCEP(e.target.value)}}))}
                                            onBlur={handleCepBlur}
                                            placeholder="00000-000"
                                            maxLength={9}
                                        />
                                        {loadingCep && <Loader2 size={16} className="absolute right-3 top-2.5 animate-spin text-blue-500" />}
                                    </div>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold mb-1 text-gray-600">Logradouro (Rua, Av)</label>
                                    <input 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-gray-50"
                                        value={businessForm.address?.street || ''}
                                        onChange={e => setBusinessForm(prev => ({...prev, address: {...prev.address!, street: e.target.value}}))}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold mb-1 text-gray-600">Número</label>
                                    <input 
                                        className="w-full border p-2.5 rounded-lg text-sm"
                                        value={businessForm.address?.number || ''}
                                        onChange={e => setBusinessForm(prev => ({...prev, address: {...prev.address!, number: e.target.value}}))}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold mb-1 text-gray-600">Complemento</label>
                                    <input 
                                        className="w-full border p-2.5 rounded-lg text-sm"
                                        value={businessForm.address?.complement || ''}
                                        onChange={e => setBusinessForm(prev => ({...prev, address: {...prev.address!, complement: e.target.value}}))}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold mb-1 text-gray-600">Bairro</label>
                                    <input 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-gray-50"
                                        value={businessForm.address?.neighborhood || ''}
                                        onChange={e => setBusinessForm(prev => ({...prev, address: {...prev.address!, neighborhood: e.target.value}}))}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold mb-1 text-gray-600">Cidade</label>
                                    <input 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-gray-50"
                                        value={businessForm.address?.city || ''}
                                        onChange={e => setBusinessForm(prev => ({...prev, address: {...prev.address!, city: e.target.value}}))}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold mb-1 text-gray-600">Estado (UF)</label>
                                    <input 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-gray-50"
                                        value={businessForm.address?.state || ''}
                                        maxLength={2}
                                        onChange={e => setBusinessForm(prev => ({...prev, address: {...prev.address!, state: e.target.value.toUpperCase()}}))}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleSaveBusiness} className="w-full py-4 text-lg shadow-lg flex items-center justify-center gap-2">
                            <Save size={20} /> Salvar Dados
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
