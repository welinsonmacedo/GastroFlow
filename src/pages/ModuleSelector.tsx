
import React from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { SystemModule } from '../types';
import { ChefHat, Coffee, Truck, ShoppingBag, ArrowRight, LogOut, Grid, Briefcase, Settings, DollarSign, Store, Package, Users, Clock, LifeBuoy } from 'lucide-react';
import { Button } from '../components/Button';

const ModuleCard = ({ 
    type, 
    title, 
    desc, 
    icon: Icon, 
    colorClass, 
    onClick 
}: { 
    type: SystemModule | 'TIME_CLOCK' | 'SUPPORT', 
    title: string, 
    desc: string, 
    icon: React.ElementType, 
    colorClass: string,
    onClick: () => void 
}) => (
    <div 
        onClick={onClick}
        className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-transparent group relative overflow-hidden h-full flex flex-col"
    >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
        
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md transition-transform group-hover:rotate-6 ${colorClass.replace('text-', 'bg-').replace('600', '100').replace('500', '100')} ${colorClass}`}>
            <Icon size={24} />
        </div>
        
        <h3 className="text-lg font-black text-slate-800 mb-2 group-hover:text-slate-900 leading-tight">{title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed mb-4 flex-1">{desc}</p>
        
        <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${colorClass}`}>
            Acessar <ArrowRight size={14} className="transition-transform group-hover:translate-x-1"/>
        </div>
    </div>
);

export const ModuleSelector: React.FC = () => {
    const { state, setActiveModule } = useRestaurant();
    const { logout, state: authState } = useAuth();
    const navigate = useNavigate();

    const allowed = state.allowedModules || ['RESTAURANT', 'MANAGER', 'CONFIG', 'FINANCE', 'COMMERCE', 'INVENTORY', 'HR'];
    const tenantName = state.theme.restaurantName;
    const { planLimits } = state;

    const isModuleAllowed = (module: SystemModule) => {
        // Se for ADMIN (Role.ADMIN), vê tudo que o restaurante tem permitido
        if (authState.currentUser?.role === 'ADMIN') return true;
        // Se não, verifica se o módulo está nas rotas permitidas do usuário
        return authState.currentUser?.allowedRoutes?.includes(module);
    };

    const handleSelect = (module: SystemModule) => {
        setActiveModule(module);
        
        if (module === 'RESTAURANT') navigate('/restaurant'); 
        else if (module === 'MANAGER') navigate('/admin'); 
        else if (module === 'FINANCE') navigate('/finance'); 
        else if (module === 'CONFIG') navigate('/settings'); 
        else if (module === 'INVENTORY') navigate('/inventory');
        else if (module === 'HR') navigate('/rh');
        else alert("Módulo em desenvolvimento.");
    };

    const handleTimeClock = () => {
        navigate('/time-clock');
    };

    const handleSupport = () => {
        navigate('/manual');
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px] opacity-10 translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600 rounded-full blur-[150px] opacity-10 -translate-x-1/2 translate-y-1/2"></div>

            <header className="p-6 md:p-8 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                        {state.theme.logoUrl ? (
                            <img src={state.theme.logoUrl} className="w-8 h-8 object-contain" />
                        ) : (
                            <Grid className="text-white" size={24} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-tight">{tenantName}</h1>
                        <p className="text-slate-400 text-xs uppercase tracking-widest">Portal de Acesso</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                        <p className="text-white text-sm font-bold">{authState.currentUser?.name}</p>
                        <p className="text-slate-400 text-xs">{authState.currentUser?.email}</p>
                    </div>
                    <Button onClick={logout} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-transparent">
                        <LogOut size={18} />
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10">
                <div className="text-center mb-8 max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Escolha seu Ambiente</h2>
                    <p className="text-slate-400 text-base">Selecione o módulo que deseja acessar agora.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 max-w-6xl w-full">
                    {/* Bater Ponto - Acessível se o plano tiver RH */}
                    {planLimits.allowHR && (
                         <ModuleCard type="TIME_CLOCK" title="Bater Ponto" desc="Registro de entrada, saída e intervalos." icon={Clock} colorClass="text-cyan-400" onClick={handleTimeClock} />
                    )}
                    
                    {allowed.includes('RESTAURANT') && isModuleAllowed('RESTAURANT') && (
                        <ModuleCard type="RESTAURANT" title="Restaurante" desc="Salão, Mesas, KDS e Caixa Gastronômico." icon={ChefHat} colorClass="text-blue-600" onClick={() => handleSelect('RESTAURANT')} />
                    )}
                    {(allowed.includes('MANAGER') || authState.currentUser?.role === 'ADMIN') && isModuleAllowed('MANAGER') && (
                        <ModuleCard type="MANAGER" title="Gestor" desc="Backoffice Operacional. Cardápio e Mesas." icon={Briefcase} colorClass="text-purple-500" onClick={() => handleSelect('MANAGER')} />
                    )}
                    {(allowed.includes('INVENTORY') || authState.currentUser?.role === 'ADMIN') && isModuleAllowed('INVENTORY') && (
                        <ModuleCard type="INVENTORY" title="Estoque" desc="Insumos, Compras e Fichas Técnicas." icon={Package} colorClass="text-orange-500" onClick={() => handleSelect('INVENTORY')} />
                    )}
                    {(allowed.includes('HR') || authState.currentUser?.role === 'ADMIN') && isModuleAllowed('HR') && (
                        <ModuleCard type="HR" title="RH & Equipe" desc="Gestão de Ponto, Escalas e Pré-Folha." icon={Users} colorClass="text-pink-500" onClick={() => handleSelect('HR')} />
                    )}
                    {(allowed.includes('FINANCE') || authState.currentUser?.role === 'ADMIN') && isModuleAllowed('FINANCE') && (
                        <ModuleCard type="FINANCE" title="Financeiro" desc="Fluxo de Caixa, DRE e BI." icon={DollarSign} colorClass="text-emerald-500" onClick={() => handleSelect('FINANCE')} />
                    )}
                    {(allowed.includes('CONFIG') || authState.currentUser?.role === 'ADMIN') && isModuleAllowed('CONFIG') && (
                        <ModuleCard type="CONFIG" title="Configurações" desc="Dados da empresa e segurança." icon={Settings} colorClass="text-gray-500" onClick={() => handleSelect('CONFIG')} />
                    )}

                    {/* Suporte */}
                    <ModuleCard type="SUPPORT" title="Suporte & Ajuda" desc="Precisa de algo? Fale com nossos especialistas." icon={LifeBuoy} colorClass="text-lime-500" onClick={handleSupport} />
                </div>
            </main>
        </div>
    );
};
