
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useMenu } from '../../context/MenuContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Palette, LayoutTemplate, Type, Image as ImageIcon, Smartphone, ChefHat, Search, ShoppingCart, Plus, Save, Eye } from 'lucide-react';

export const AdminMenuAppearance: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { state: menuState } = useMenu();
  const { showAlert } = useUI();
  
  // Theme State Local para edição antes de salvar
  const [localTheme, setLocalTheme] = useState(state.theme);

  const handleSaveTheme = async () => {
      await dispatch({ type: 'UPDATE_THEME', theme: localTheme });
      showAlert({ title: 'Sucesso', message: 'Aparência do cardápio atualizada!', type: 'SUCCESS' });
  };

  // --- COMPONENTE DE PREVIEW (CELULAR) ---
  const MobilePreview = () => {
      const realProducts = menuState.products.filter(p => p.isVisible).slice(0, 5);
      const hasProducts = realProducts.length > 0;
      const displayProducts = hasProducts ? realProducts : [1, 2, 3].map((_, i) => ({
          id: `mock-${i}`, name: 'Produto Exemplo', description: 'Descrição do item aparecerá aqui...', price: 25.00, image: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80`
      }));
      const categories = hasProducts ? Array.from(new Set(menuState.products.map(p => p.category))).slice(0, 3) : ['Lanches', 'Bebidas', 'Sobremesas'];

      return (
          <div className="relative mx-auto border-gray-900 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl overflow-hidden flex flex-col transform transition-transform hover:scale-[1.02] duration-300">
              {/* Phone Hardware Details */}
              <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
              <div className="bg-white h-6 w-full absolute top-0 left-0 z-20 opacity-90 flex justify-between px-4 items-center text-[10px] font-bold"><span>9:41</span><div className="flex gap-1"><div className="w-3 h-3 bg-black rounded-full"></div><div className="w-3 h-3 bg-black rounded-full"></div></div></div>
              
              {/* Screen Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col font-sans" style={{ backgroundColor: localTheme.backgroundColor, color: localTheme.fontColor }}>
                  {/* App Header inside Phone */}
                  <div className="bg-white shadow-sm p-4 pt-8 sticky top-0 z-10 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          {localTheme.logoUrl ? (<img src={localTheme.logoUrl} className="w-8 h-8 rounded-full object-cover bg-gray-100 p-0.5 border" />) : (<div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-blue-600"><ChefHat size={16}/></div>)}
                          <div className="leading-tight"><h3 className="font-bold text-xs text-gray-800">{localTheme.restaurantName || 'Nome do Restaurante'}</h3><p className="text-[9px] text-gray-400">Mesa 10</p></div>
                      </div>
                      <div className="relative p-1.5 bg-gray-100 rounded-full" style={{ color: localTheme.primaryColor }}><ShoppingCart size={14} /></div>
                  </div>
                  
                  {/* Banner */}
                  {localTheme.bannerUrl ? (
                      <div className="w-full h-32 bg-gray-200 relative shrink-0"><img src={localTheme.bannerUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3"><h2 className="text-white font-bold text-lg shadow-sm">{localTheme.restaurantName}</h2></div></div>
                  ) : (<div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300 text-xs shrink-0">Sem Banner</div>)}
                  
                  {/* Categories */}
                  <div className="p-3 pb-0"><div className="bg-white border rounded-lg p-2 flex items-center gap-2 shadow-sm"><Search size={14} className="text-gray-400" /><div className="text-xs text-gray-400">Buscar...</div></div></div>
                  <div className="flex gap-2 overflow-x-auto p-3 scrollbar-hide text-xs font-bold text-gray-600">{categories.map((cat, idx) => (<span key={idx} style={idx === 0 ? { color: localTheme.primaryColor, borderBottom: `2px solid ${localTheme.primaryColor}` } : {}} className={`pb-1 whitespace-nowrap ${idx !== 0 ? 'opacity-50' : ''}`}>{cat}</span>))}</div>
                  
                  {/* Products */}
                  <div className={`p-3 pt-0 grid gap-3 ${localTheme.viewMode === 'GRID' ? 'grid-cols-2' : 'grid-cols-1'}`}>{displayProducts.map((product: any, i: number) => (<div key={i} className={`bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex ${localTheme.viewMode === 'GRID' ? 'flex-col' : 'flex-row gap-3 items-center'}`}><div className={`${localTheme.viewMode === 'GRID' ? 'w-full h-20 mb-2' : 'w-16 h-16 shrink-0'} bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center`}>{product.image ? (<img src={product.image} className="w-full h-full object-cover" alt="Produto" />) : (<ImageIcon size={24} className="text-gray-300" />)}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-gray-800 text-xs truncate">{product.name}</h4><p className="text-[10px] text-gray-400 line-clamp-1">{product.description || 'Sem descrição'}</p><div className="flex justify-between items-center mt-1"><span className="font-bold text-xs" style={{ color: localTheme.primaryColor }}>R$ {Number(product.price).toFixed(2)}</span><div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]" style={{ backgroundColor: localTheme.primaryColor }}><Plus size={10} /></div></div></div></div>))}</div>
              </div>
          </div>
      );
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row overflow-hidden bg-gray-50 -m-4 md:-m-8">
        
        {/* LADO ESQUERDO: CONFIGURAÇÕES (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-8 pb-20">
                <header>
                    <h2 className="text-3xl font-black text-gray-800">Aparência</h2>
                    <p className="text-gray-500">Personalize a identidade visual do seu cardápio digital.</p>
                </header>

                <div className="space-y-6">
                    {/* Section 1: Marca */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <LayoutTemplate className="text-blue-600" size={20}/> Identidade
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Nome de Exibição</label>
                                <input className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-bold focus:border-blue-500 focus:outline-none transition-colors" value={localTheme.restaurantName} onChange={e => setLocalTheme({...localTheme, restaurantName: e.target.value})} placeholder="Ex: Burguer King" />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Logotipo (Pequeno)</label>
                                    <ImageUploader value={localTheme.logoUrl} onChange={(val) => setLocalTheme({...localTheme, logoUrl: val})} maxSizeKB={200} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Banner (Capa)</label>
                                    <ImageUploader value={localTheme.bannerUrl || ''} onChange={(val) => setLocalTheme({...localTheme, bannerUrl: val})} maxSizeKB={500} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Cores */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Palette className="text-purple-600" size={20}/> Cores do Tema
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Destaque</label>
                                <div className="relative w-16 h-16 rounded-full shadow-md overflow-hidden border-4 border-white ring-1 ring-gray-200 cursor-pointer transition-transform hover:scale-110">
                                    <input type="color" className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer p-0 border-0" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                </div>
                                <span className="text-xs font-mono text-gray-600">{localTheme.primaryColor}</span>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Fundo</label>
                                <div className="relative w-16 h-16 rounded-full shadow-md overflow-hidden border-4 border-white ring-1 ring-gray-200 cursor-pointer transition-transform hover:scale-110">
                                    <input type="color" className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer p-0 border-0" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                </div>
                                <span className="text-xs font-mono text-gray-600">{localTheme.backgroundColor}</span>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Texto</label>
                                <div className="relative w-16 h-16 rounded-full shadow-md overflow-hidden border-4 border-white ring-1 ring-gray-200 cursor-pointer transition-transform hover:scale-110">
                                    <input type="color" className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer p-0 border-0" value={localTheme.fontColor || '#1f2937'} onChange={e => setLocalTheme({...localTheme, fontColor: e.target.value})} />
                                </div>
                                <span className="text-xs font-mono text-gray-600">{localTheme.fontColor}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Layout */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ImageIcon className="text-emerald-600" size={20}/> Disposição
                        </h3>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Modo de Exibição</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setLocalTheme({...localTheme, viewMode: 'LIST'})} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${localTheme.viewMode !== 'GRID' ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="w-full space-y-2 opacity-80">
                                        <div className="flex gap-2 items-center"><div className="bg-gray-300 h-8 w-8 rounded-lg"></div><div className="bg-gray-200 h-2 rounded w-full"></div></div>
                                        <div className="flex gap-2 items-center"><div className="bg-gray-300 h-8 w-8 rounded-lg"></div><div className="bg-gray-200 h-2 rounded w-full"></div></div>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-widest ${localTheme.viewMode !== 'GRID' ? 'text-blue-600' : 'text-gray-400'}`}>Lista</span>
                                </button>
                                
                                <button onClick={() => setLocalTheme({...localTheme, viewMode: 'GRID'})} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${localTheme.viewMode === 'GRID' ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="grid grid-cols-2 gap-2 w-full opacity-80">
                                        <div className="bg-gray-300 h-10 rounded-lg"></div>
                                        <div className="bg-gray-300 h-10 rounded-lg"></div>
                                        <div className="bg-gray-200 h-2 rounded col-span-2 mt-1 w-2/3 mx-auto"></div>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-widest ${localTheme.viewMode === 'GRID' ? 'text-blue-600' : 'text-gray-400'}`}>Grade</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* LADO DIREITO: PREVIEW (Fixo) */}
        <div className="w-full lg:w-[450px] xl:w-[500px] bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center p-8 shrink-0 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="text-center mb-8 relative z-10">
                <h3 className="font-black text-white text-xl flex items-center justify-center gap-2 mb-1">
                    <Smartphone size={24} className="text-blue-400" /> Resultado Final
                </h3>
                <p className="text-slate-400 text-sm">Preview em tempo real da experiência do cliente.</p>
            </div>
            
            <div className="relative z-10 scale-90 sm:scale-100">
                <MobilePreview />
            </div>

            {/* Floating Save Button on Mobile */}
            <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
                <Button onClick={handleSaveTheme} className="w-full py-4 text-lg shadow-xl shadow-blue-900/50 border border-white/20">Salvar Alterações</Button>
            </div>
        </div>

        {/* Desktop Save Button (Bottom Left) */}
        <div className="hidden lg:block absolute bottom-8 left-8 z-50">
             <Button onClick={handleSaveTheme} className="px-8 py-4 text-lg font-bold shadow-2xl shadow-blue-500/30 flex items-center gap-3">
                <Save size={20}/> Salvar Aparência
             </Button>
        </div>
    </div>
  );
};
