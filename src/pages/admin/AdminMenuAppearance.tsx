
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useMenu } from '../../context/MenuContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Image as ImageIcon, Smartphone, ChefHat, Search, ShoppingCart, Plus, Save, LayoutGrid, List, Square } from 'lucide-react';

export const AdminMenuAppearance: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { state: menuState } = useMenu();
  const { showAlert } = useUI();
  
  const [localTheme, setLocalTheme] = useState(state.theme);
  const [activeTab, setActiveTab] = useState<'BRAND' | 'STYLE' | 'LAYOUT'>('BRAND');

  const handleSaveTheme = async () => {
      await dispatch({ type: 'UPDATE_THEME', theme: localTheme });
      showAlert({ title: 'Sucesso', message: 'Aparência do cardápio atualizada!', type: 'SUCCESS' });
  };

  // Mapeamento de estilos para o preview
  const getRadiusClass = (radius?: string) => {
      switch(radius) {
          case 'none': return 'rounded-none';
          case 'sm': return 'rounded-sm';
          case 'md': return 'rounded-md';
          case 'lg': return 'rounded-2xl'; // Nosso padrão visual
          case 'full': return 'rounded-3xl';
          default: return 'rounded-2xl';
      }
  };

  const getFontFamily = (font?: string) => {
      // Nota: As fontes devem ser importadas no index.html ou css global para funcionarem perfeitamente
      switch(font) {
          case 'Roboto': return 'font-roboto';
          case 'Playfair Display': return 'font-serif';
          case 'Montserrat': return 'font-montserrat';
          default: return 'font-sans'; // Inter (Default)
      }
  };

  const MobilePreview = () => {
      const realProducts = menuState.products.filter(p => p.isVisible && !p.isExtra).slice(0, 4);
      const hasProducts = realProducts.length > 0;
      const displayProducts = hasProducts ? realProducts : [1, 2, 3].map((_, i) => ({
          id: `mock-${i}`, name: 'Produto Exemplo', description: 'Descrição do item aparecerá aqui...', price: 25.00, image: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80`
      }));
      const categories = hasProducts ? Array.from(new Set(realProducts.map(p => p.category))).slice(0, 3) : ['Lanches', 'Bebidas', 'Sobremesas'];

      const radiusClass = getRadiusClass(localTheme.borderRadius);
      const fontClass = getFontFamily(localTheme.fontFamily);
      const isGrid = localTheme.viewMode === 'GRID';

      return (
          <div className="relative mx-auto border-gray-900 bg-gray-900 border-[12px] rounded-[2.5rem] h-[650px] w-[320px] shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-300">
              {/* Phone Status Bar */}
              <div className="bg-white h-7 w-full absolute top-0 left-0 z-20 opacity-95 flex justify-between px-5 items-center text-[10px] font-bold"><span>9:41</span><div className="flex gap-1"><div className="w-4 h-1.5 bg-black rounded-full"></div></div></div>
              
              <div className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col ${fontClass}`} style={{ backgroundColor: localTheme.backgroundColor, color: localTheme.fontColor }}>
                  
                  {/* App Header inside Phone */}
                  <div className="bg-white shadow-sm p-4 pt-10 sticky top-0 z-10 flex justify-between items-center transition-all">
                      <div className="flex items-center gap-2">
                          {localTheme.logoUrl ? (
                              <img src={localTheme.logoUrl} className={`w-9 h-9 object-cover bg-gray-50 border ${radiusClass}`} />
                          ) : (
                              <div className={`w-9 h-9 bg-gray-100 flex items-center justify-center text-blue-600 ${radiusClass}`}><ChefHat size={18}/></div>
                          )}
                          <div className="leading-tight">
                              <h3 className="font-bold text-sm text-gray-800 tracking-tight">{localTheme.restaurantName || 'Nome do Restaurante'}</h3>
                              <p className="text-[9px] text-gray-400 font-medium">Mesa 10 • Aberto</p>
                          </div>
                      </div>
                      <div className="relative p-2 bg-gray-50 rounded-full text-slate-700 hover:bg-gray-100 transition-colors">
                          <ShoppingCart size={16} style={{ color: localTheme.primaryColor }} />
                          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                      </div>
                  </div>
                  
                  {/* Banner */}
                  {localTheme.bannerUrl ? (
                      <div className="w-full h-36 bg-gray-200 relative shrink-0">
                          <img src={localTheme.bannerUrl} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                              <h2 className="text-white font-bold text-lg shadow-sm leading-tight">{localTheme.restaurantName}</h2>
                          </div>
                      </div>
                  ) : (
                      <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-xs shrink-0 font-medium">Sem Banner Configurado</div>
                  )}
                  
                  {/* Search & Categories */}
                  <div className="p-4 pb-2 space-y-4">
                      <div className={`bg-white border rounded-xl p-3 flex items-center gap-2 shadow-sm ${radiusClass}`}>
                          <Search size={16} className="text-gray-400" />
                          <div className="text-xs text-gray-400 font-medium">O que você procura hoje?</div>
                      </div>
                      
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {categories.map((cat, idx) => (
                              <span key={idx} 
                                  className={`px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${idx === 0 ? 'text-slate-800' : 'text-gray-400 border-transparent'}`}
                                  style={idx === 0 ? { borderColor: localTheme.primaryColor, color: localTheme.primaryColor } : {}}
                              >
                                  {cat}
                              </span>
                          ))}
                      </div>
                  </div>
                  
                  {/* Products Grid/List */}
                  <div className={`p-4 pt-0 grid gap-3 pb-20 ${isGrid ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {displayProducts.map((product: any, i: number) => (
                          <div key={i} className={`bg-white p-2.5 shadow-sm border border-gray-100 flex group ${radiusClass} ${isGrid ? 'flex-col' : 'flex-row gap-3 items-center'}`}>
                              <div className={`${isGrid ? 'w-full h-24 mb-2' : 'w-20 h-20 shrink-0'} bg-gray-50 overflow-hidden flex items-center justify-center relative ${radiusClass}`}>
                                  {product.image ? (
                                      <img src={product.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Produto" />
                                  ) : (
                                      <ImageIcon size={24} className="text-gray-300" />
                                  )}
                                  {isGrid && <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded text-[9px] font-bold shadow-sm">R$ {Number(product.price).toFixed(0)}</div>}
                              </div>
                              
                              <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                                  <div>
                                      <h4 className="font-bold text-gray-800 text-sm leading-tight truncate">{product.name}</h4>
                                      <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">{product.description || 'Delicioso prato preparado com ingredientes selecionados.'}</p>
                                  </div>
                                  
                                  <div className={`flex justify-between items-center ${isGrid ? 'mt-3' : 'mt-1'}`}>
                                      {!isGrid && <span className="font-bold text-sm" style={{ color: localTheme.primaryColor }}>R$ {Number(product.price).toFixed(2)}</span>}
                                      
                                      <button 
                                          className={`w-7 h-7 flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 ${localTheme.borderRadius === 'full' ? 'rounded-full' : 'rounded-lg'}`}
                                          style={{ 
                                              backgroundColor: localTheme.buttonStyle === 'outline' ? 'transparent' : localTheme.primaryColor,
                                              border: localTheme.buttonStyle === 'outline' ? `2px solid ${localTheme.primaryColor}` : 'none',
                                              color: localTheme.buttonStyle === 'outline' ? localTheme.primaryColor : 'white'
                                          }}
                                      >
                                          <Plus size={16} strokeWidth={3} />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              
              {/* Bottom Bar Simulation */}
              <div className="h-1 bg-black w-1/3 mx-auto rounded-full absolute bottom-2 left-1/2 -translate-x-1/2 z-20"></div>
          </div>
      );
  };



  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50 overflow-hidden font-sans">
        
        {/* LADO ESQUERDO: CONTROLES COMPACTOS */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-full z-20 shadow-xl">
            <div className="p-5 border-b border-gray-100 shrink-0">
                <h2 className="text-xl font-black text-slate-800">Personalizar</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">Defina a identidade do seu cardápio.</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('BRAND')} className={`py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'BRAND' ? 'bg-white shadow text-slate-800' : 'text-gray-500 hover:text-gray-700'}`}>Marca</button>
                    <button onClick={() => setActiveTab('STYLE')} className={`py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'STYLE' ? 'bg-white shadow text-slate-800' : 'text-gray-500 hover:text-gray-700'}`}>Estilo</button>
                    <button onClick={() => setActiveTab('LAYOUT')} className={`py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'LAYOUT' ? 'bg-white shadow text-slate-800' : 'text-gray-500 hover:text-gray-700'}`}>Layout</button>
                </div>

                {activeTab === 'BRAND' && (
                    <div className="space-y-5 animate-fade-in">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Nome do Restaurante</label>
                            <input className="w-full border p-2.5 rounded-lg text-sm font-medium focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" value={localTheme.restaurantName} onChange={e => setLocalTheme({...localTheme, restaurantName: e.target.value})} placeholder="Ex: Burguer King" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Logo (Marca)</label>
                            <ImageUploader value={localTheme.logoUrl} onChange={(val) => setLocalTheme({...localTheme, logoUrl: val})} maxSizeKB={200} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Banner (Capa)</label>
                            <ImageUploader value={localTheme.bannerUrl || ''} onChange={(val) => setLocalTheme({...localTheme, bannerUrl: val})} maxSizeKB={500} />
                        </div>
                    </div>
                )}

                {activeTab === 'STYLE' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* CORES */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Paleta de Cores</label>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <div className="h-10 w-full rounded-lg border-2 overflow-hidden relative cursor-pointer hover:scale-105 transition-transform">
                                        <input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                    </div>
                                    <p className="text-[10px] text-center text-gray-500 font-mono">Destaque</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="h-10 w-full rounded-lg border-2 overflow-hidden relative cursor-pointer hover:scale-105 transition-transform">
                                        <input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                    </div>
                                    <p className="text-[10px] text-center text-gray-500 font-mono">Fundo</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="h-10 w-full rounded-lg border-2 overflow-hidden relative cursor-pointer hover:scale-105 transition-transform">
                                        <input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" value={localTheme.fontColor || '#1f2937'} onChange={e => setLocalTheme({...localTheme, fontColor: e.target.value})} />
                                    </div>
                                    <p className="text-[10px] text-center text-gray-500 font-mono">Texto</p>
                                </div>
                            </div>
                        </div>

                        {/* FONTES */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tipografia</label>
                            <select 
                                className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={localTheme.fontFamily || 'Inter'}
                                onChange={e => setLocalTheme({...localTheme, fontFamily: e.target.value as any})}
                            >
                                <option value="Inter">Inter (Padrão Moderno)</option>
                                <option value="Roboto">Roboto (Android)</option>
                                <option value="Playfair Display">Playfair (Serifado/Elegante)</option>
                                <option value="Montserrat">Montserrat (Geométrico)</option>
                            </select>
                        </div>

                        {/* BORDAS E BOTÕES */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Arredondamento (Bordas)</label>
                            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                                {['none', 'sm', 'md', 'lg', 'full'].map((r) => (
                                    <button 
                                        key={r}
                                        onClick={() => setLocalTheme({...localTheme, borderRadius: r as any})}
                                        className={`flex-1 h-8 rounded-md text-[10px] font-bold uppercase transition-all ${localTheme.borderRadius === r || (!localTheme.borderRadius && r === 'lg') ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {r === 'none' ? <Square size={14} className="mx-auto"/> : r === 'full' ? <div className="w-3 h-3 rounded-full border-2 border-current mx-auto"></div> : r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Estilo de Botão</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setLocalTheme({...localTheme, buttonStyle: 'fill'})} className={`p-2 rounded-lg border text-xs font-bold transition-all ${localTheme.buttonStyle !== 'outline' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-500'}`}>Preenchido</button>
                                <button onClick={() => setLocalTheme({...localTheme, buttonStyle: 'outline'})} className={`p-2 rounded-lg border text-xs font-bold transition-all ${localTheme.buttonStyle === 'outline' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-500'}`}>Contorno</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'LAYOUT' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setLocalTheme({...localTheme, viewMode: 'LIST'})} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${localTheme.viewMode !== 'GRID' ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}>
                                <List size={32} strokeWidth={1.5} />
                                <span className="text-xs font-black uppercase tracking-wider">Lista</span>
                            </button>
                            
                            <button onClick={() => setLocalTheme({...localTheme, viewMode: 'GRID'})} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${localTheme.viewMode === 'GRID' ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}>
                                <LayoutGrid size={32} strokeWidth={1.5} />
                                <span className="text-xs font-black uppercase tracking-wider">Grade</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
                            A visualização em <strong>Lista</strong> é ideal para cardápios extensos. <br/>
                            A visualização em <strong>Grade</strong> destaca mais as fotos dos pratos.
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <Button onClick={handleSaveTheme} className="w-full py-3 shadow-lg font-bold flex items-center justify-center gap-2">
                    <Save size={18}/> Salvar Alterações
                </Button>
            </div>
        </div>

        {/* LADO DIREITO: PREVIEW GIGANTE */}
        <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center p-8">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[120px] opacity-20 translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
            
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center">
                <div className="text-white mb-6 text-center animate-fade-in">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full mb-3 border border-white/10">
                        <Smartphone size={14} className="text-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Live Preview</span>
                    </div>
                  
                </div>
                
                <div className="transform transition-transform hover:scale-[1.01] duration-500">
                    <MobilePreview />
                </div>
            </div>
        </div>
    </div>
  );
};
