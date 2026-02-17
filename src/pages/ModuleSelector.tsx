
import React from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { SystemModule } from '../types';
import { ChefHat, Coffee, Truck, ShoppingBag, ArrowRight, LogOut, Grid, Briefcase } from 'lucide-react';
import { Button } from '../components/Button';

const ModuleCard = ({ 
    type, 
    title, 
    desc, 
    icon: Icon, 
    colorClass, 
    onClick 
}: { 
    type: SystemModule, 
    title: string, 
    desc: string, 
    icon: React.ElementType, 
    colorClass: string,
    onClick: () => void 
}) => (
    <div 
        onClick={onClick}
        className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 cursor-pointer transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-transparent group relative overflow-hidden h-full flex flex-col"
    >
        {/* Hover Effect Background */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
        
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:rotate-6 ${colorClass.replace('text-', 'bg-').replace('600', '100').replace('500', '100')} ${colorClass}`}>
            <Icon size={32} />
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 mb-3 group-hover:text-slate-900">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">{desc}</p>
        
        <div className={`flex items-center gap-2 font-bold text-sm uppercase tracking-wider ${colorClass}`}>
            Acessar Módulo <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/>
        </div>
    </div>
);

export const ModuleSelector: React.FC = () => {
    const { state, setActiveModule } = useRestaurant();
    const { logout, state: authState } = useAuth();
    const navigate = useNavigate();

    const allowed = state.allowedModules || ['RESTAURANT', 'MANAGER'];
    const tenantName = state.theme.restaurantName;

    const handleSelect = (module: SystemModule) => {
        setActiveModule(module);
        
        if (module === 'RESTAURANT') {
            navigate('/waiter'); // Vai direto para operação (Garçom/Mesas)
        } else if (module === 'MANAGER') {
            navigate('/admin'); // Vai para o painel administrativo (Backoffice)
        } else {
            alert("Módulo em desenvolvimento.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden font-sans">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px] opacity-10 translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600 rounded-full blur-[150px] opacity-10 -translate-x-1/2 translate-y-1/2"></div>

            {/* Header */}
            <header className="p-8 flex justify-between items-center relative z-10">
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

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="text-center mb-12 max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Escolha seu Ambiente
                    </h2>
                    <p className="text-slate-400 text-lg">
                        Selecione o módulo que deseja acessar agora.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl w-full">
                    
                    {/* Módulo Gestor (Admin) */}
                    {(allowed.includes('MANAGER') || authState.currentUser?.role === 'ADMIN') && (
                        <ModuleCard 
                            type="MANAGER"
                            title="Gestor"
                            desc="Backoffice completo. Financeiro, Estoque, Relatórios, Configurações e BI."
                            icon={Briefcase}
                            colorClass="text-purple-500"
                            onClick={() => handleSelect('MANAGER')}
                        />
                    )}

                    {allowed.includes('RESTAURANT') && (
                        <ModuleCard 
                            type="RESTAURANT"
                            title="Restaurante"
                            desc="Operação de salão. Mapa de mesas, KDS (Cozinha) e Caixa."
                            icon={ChefHat}
                            colorClass="text-blue-600"
                            onClick={() => handleSelect('RESTAURANT')}
                        />
                    )}

                    {allowed.includes('SNACKBAR') && (
                        <ModuleCard 
                            type="SNACKBAR"
                            title="Lanchonete"
                            desc="Foco em velocidade. Balcão rápido e senhas."
                            icon={Coffee}
                            colorClass="text-orange-500"
                            onClick={() => handleSelect('SNACKBAR')}
                        />
                    )}

                    {allowed.includes('DISTRIBUTOR') && (
                        <ModuleCard 
                            type="DISTRIBUTOR"
                            title="Distribuidora"
                            desc="Gestão de rotas, volumes e estoque de bebidas."
                            icon={Truck}
                            colorClass="text-emerald-500"
                            onClick={() => handleSelect('DISTRIBUTOR')}
                        />
                    )}

                    {allowed.includes('COMMERCE') && (
                        <ModuleCard 
                            type="COMMERCE"
                            title="Comércio"
                            desc="Ponto de venda genérico para varejo."
                            icon={ShoppingBag}
                            colorClass="text-pink-600"
                            onClick={() => handleSelect('COMMERCE')}
                        />
                    )}
                </div>
            </main>
            
            <footer className="p-8 text-center text-slate-600 text-sm relative z-10">
                &copy; {new Date().getFullYear()} Flux Eat Systems. Todos os módulos integrados.
            </footer>
        </div>
    );
};
