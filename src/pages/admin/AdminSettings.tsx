
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useUI } from '@/core/context/UIContext';
import { useStaff } from '@/core/context/StaffContext';
import { Button } from '../../components/Button';
import { Building2, MapPin, Loader2, Share2, Clock, Lock, Save, ShieldCheck, Bike, Plus, Trash2, Edit, CreditCard, Tag, FileText, Bell, Users } from 'lucide-react';
import { RestaurantBusinessInfo, DeliveryMethodConfig, PaymentMethodConfig, ExpenseCategory, TaxRegime, DsrConfig } from '@/types';
import { Modal } from '../../components/Modal';

interface AdminSettingsProps {
    view?: 'BUSINESS' | 'RULES' | 'SECURITY' | 'DELIVERY' | 'FINANCE_CONFIG' | 'TIME_CLOCK';
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ view = 'BUSINESS' }) => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const { state: staffState, saveLegalSettings } = useStaff();
  const { legalSettings } = staffState;
  
  const [businessForm, setBusinessForm] = useState<RestaurantBusinessInfo>({
      address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' },
      orderGracePeriodMinutes: 2,
      adminPin: '',
      deliverySettings: [],
      paymentMethods: [],
      expenseCategories: [],
      taxRegime: 'SIMPLES_NACIONAL',
      timeClock: { validationType: 'NONE', maxDailyPunches: 4, maxDistanceMeters: 100, restaurantLocation: { lat: 0, lng: 0 } },
      ...state.businessInfo
  });
  
  const [dsrForm, setDsrForm] = useState<DsrConfig>({
      calculateOnOvertime: true,
      rateType: 'CALCULATED',
      includeInThirteenth: true,
      includeInVacation: true
  });

  const [loadingCep, setLoadingCep] = useState(false);

  // Modais States
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<DeliveryMethodConfig | null>(null);
  const [methodForm, setMethodForm] = useState<DeliveryMethodConfig>({
      id: '', name: '', type: 'OWN', feeType: 'FIXED', feeValue: 0, feeBehavior: 'ADD_TO_TOTAL', isActive: true, estimatedTimeMin: 30, estimatedTimeMax: 45
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentMethodConfig>({ id: '', name: '', type: 'CREDIT', feePercentage: 0, isActive: true });
  
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
      if (state.businessInfo) {
          setBusinessForm(prev => ({
              ...prev,
              ...state.businessInfo,
              address: state.businessInfo.address || prev.address,
              orderGracePeriodMinutes: state.businessInfo.orderGracePeriodMinutes ?? prev.orderGracePeriodMinutes,
              adminPin: state.businessInfo.adminPin ?? prev.adminPin,
              taxRegime: state.businessInfo.taxRegime || 'SIMPLES_NACIONAL',
              timeClock: state.businessInfo.timeClock || { validationType: 'NONE', maxDistanceMeters: 100 },
              deliverySettings: state.businessInfo.deliverySettings || [],
              paymentMethods: state.businessInfo.paymentMethods || [],
              expenseCategories: state.businessInfo.expenseCategories || []
          }));
      }
  }, [state.businessInfo]);

  useEffect(() => {
      if (legalSettings?.dsrConfig) {
          setDsrForm(legalSettings.dsrConfig);
      }
  }, [legalSettings]);

  const handleSaveBusiness = async () => {
      if (view === 'TIME_CLOCK') {
          await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: businessForm });
          await saveLegalSettings({ dsrConfig: dsrForm });
      } else {
          await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: businessForm });
      }
      showAlert({ title: 'Sucesso', message: 'Dados atualizados!', type: 'SUCCESS' });
  };
  
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
                  setBusinessForm(prev => ({...prev, address: {...prev.address!, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf}}));
              }
          } catch (e) { console.error(e); } finally { setLoadingCep(false); }
      }
  };

  // Delivery Logic
  const handleOpenDeliveryModal = (method?: DeliveryMethodConfig) => { 
      if (method) { 
          setEditingMethod(method); 
          setMethodForm(method); 
      } else { 
          setEditingMethod(null); 
          setMethodForm({ id: Math.random().toString(36).substr(2, 9), name: '', type: 'OWN', feeType: 'FIXED', feeValue: 0, feeBehavior: 'ADD_TO_TOTAL', isActive: true, estimatedTimeMin: 30, estimatedTimeMax: 45 }); 
      } 
      setIsDeliveryModalOpen(true); 
  };
  
  const handleSaveDeliveryMethod = async () => { 
      if (!methodForm.name) return showAlert({title: "Nome Obrigatório", message: "Informe um nome.", type: "WARNING"}); 
      
      await dispatch({ type: 'UPSERT_DELIVERY_METHOD', method: methodForm }); 
      setIsDeliveryModalOpen(false); 
      showAlert({ title: "Salvo", message: "Método atualizado.", type: 'SUCCESS' }); 
  };
  
  const handleDeleteDeliveryMethod = (id: string) => { 
      showConfirm({ title: "Excluir Método", message: "Tem certeza?", onConfirm: async () => { 
          await dispatch({ type: 'DELETE_DELIVERY_METHOD', id }); 
      }}); 
  };

  // Payment Logic
  const handleOpenPaymentModal = (method?: PaymentMethodConfig) => { 
      if (method) { 
          setPaymentForm(method); 
      } else { 
          setPaymentForm({ id: Math.random().toString(36).substr(2, 9), name: '', type: 'CREDIT', feePercentage: 0, isActive: true }); 
      } 
      setIsPaymentModalOpen(true); 
  };
  
  const handleSavePaymentMethod = async () => { 
      if (!paymentForm.name) return showAlert({title: "Nome Obrigatório", message: "Informe um nome.", type: "WARNING"}); 
      
      await dispatch({ type: 'UPSERT_PAYMENT_METHOD', method: paymentForm }); 
      setIsPaymentModalOpen(false); 
      showAlert({ title: "Salvo", message: "Pagamento atualizado.", type: 'SUCCESS' }); 
  };
  
  const handleDeletePaymentMethod = (id: string) => { 
      showConfirm({ title: "Excluir Pagamento", message: "Tem certeza?", onConfirm: async () => { 
          await dispatch({ type: 'DELETE_PAYMENT_METHOD', id }); 
      }}); 
  };
  
  const handleAddCategory = async () => { 
      if (!newCategoryName.trim()) return; 
      const newCat: ExpenseCategory = { id: '', name: newCategoryName.trim() }; 
      await dispatch({ type: 'UPSERT_EXPENSE_CATEGORY', category: newCat }); 
      setNewCategoryName(''); 
      showAlert({ title: "Sucesso", message: "Categoria adicionada.", type: 'SUCCESS' }); 
  };
  
  const handleDeleteCategory = (id: string) => { 
      showConfirm({ title: "Excluir Categoria", message: "Tem certeza?", onConfirm: async () => { 
          await dispatch({ type: 'DELETE_EXPENSE_CATEGORY', id }); 
      }}); 
  };

  const getPageTitle = () => {
      switch(view) {
          case 'BUSINESS': return 'Dados Gerais';
          case 'RULES': return 'Regras Operacionais';
          case 'SECURITY': return 'Segurança';
          case 'DELIVERY': return 'Configuração de Delivery';
          case 'FINANCE_CONFIG': return 'Configurações Financeiras';
          case 'TIME_CLOCK': return 'Ponto Eletrônico';
          default: return 'Configurações';
      }
  };

  const handleSetCurrentLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setBusinessForm(prev => ({
                      ...prev,
                      timeClock: {
                          ...prev.timeClock!,
                          restaurantLocation: {
                              lat: position.coords.latitude,
                              lng: position.coords.longitude
                          }
                      }
                  }));
                  showAlert({ title: "Localização Definida", message: "Coordenadas atualizadas com sucesso.", type: 'SUCCESS' });
              },
              () => {
                  showAlert({ title: "Erro", message: "Não foi possível obter sua localização.", type: 'ERROR' });
              }
          );
      } else {
          showAlert({ title: "Erro", message: "Geolocalização não suportada.", type: 'ERROR' });
      }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
        <header className="mb-8 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h2>
            {['BUSINESS', 'RULES', 'SECURITY', 'TIME_CLOCK'].includes(view) && (
                <Button onClick={handleSaveBusiness} className="shadow-lg"><Save size={18}/> Salvar Alterações</Button>
            )}
        </header>

        <div className="space-y-8">
            {/* --- TIME CLOCK VIEW --- */}
            {view === 'TIME_CLOCK' && (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2"><Clock className="text-blue-600"/> Configuração de Ponto</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Validação</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div 
                                        onClick={() => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, validationType: 'GEOLOCATION'}})}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${businessForm.timeClock?.validationType === 'GEOLOCATION' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-2 font-bold text-gray-800"><MapPin size={18} className="text-blue-600"/> Geolocalização (GPS)</div>
                                        <p className="text-xs text-gray-500">O colaborador deve estar dentro de um raio específico do restaurante para bater o ponto.</p>
                                    </div>
                                    
                                    <div 
                                        onClick={() => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, validationType: 'NONE'}})}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${businessForm.timeClock?.validationType === 'NONE' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-2 font-bold text-gray-800"><ShieldCheck size={18} className="text-green-600"/> Sem Validação (Limite Diário)</div>
                                        <p className="text-xs text-gray-500">Permite bater ponto de qualquer lugar, mas limita a 4 registros por dia por colaborador.</p>
                                    </div>
                                </div>
                            </div>

                            {businessForm.timeClock?.validationType === 'GEOLOCATION' && (
                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6 animate-fade-in">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-800 mb-1">Localização do Restaurante</h3>
                                            <p className="text-xs text-gray-500">Defina onde o restaurante está localizado para validar o ponto.</p>
                                        </div>
                                        <Button onClick={handleSetCurrentLocation} size="sm" variant="outline"><MapPin size={14}/> Usar Minha Localização Atual</Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Latitude</label>
                                            <input type="number" step="any" className="w-full border p-2 rounded bg-white" value={businessForm.timeClock?.restaurantLocation?.lat || ''} onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, restaurantLocation: {...businessForm.timeClock?.restaurantLocation!, lat: parseFloat(e.target.value)}}})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Longitude</label>
                                            <input type="number" step="any" className="w-full border p-2 rounded bg-white" value={businessForm.timeClock?.restaurantLocation?.lng || ''} onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, restaurantLocation: {...businessForm.timeClock?.restaurantLocation!, lng: parseFloat(e.target.value)}}})} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1">Raio Permitido (Metros)</label>
                                        <div className="flex items-center gap-4">
                                            <input type="range" min="10" max="500" step="10" className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600" value={businessForm.timeClock?.maxDistanceMeters || 100} onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, maxDistanceMeters: parseInt(e.target.value)}})} />
                                            <span className="font-mono font-bold text-blue-600 w-20 text-right">{businessForm.timeClock?.maxDistanceMeters || 100} m</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">Recomendado: 50m a 100m para compensar imprecisões do GPS.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- BUSINESS VIEW --- */}
            {view === 'BUSINESS' && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                    <h2 className="text-xl font-bold mb-1 text-gray-800 flex items-center gap-2"><Building2 className="text-orange-600"/> Dados Cadastrais</h2>
                    <p className="text-sm text-gray-500 mb-8">Estes dados aparecem nas notas impressas e no rodapé do sistema.</p>
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                             <label className="block text-xs font-black text-blue-800 uppercase mb-2 flex items-center gap-2"><FileText size={14}/> Regime Tributário</label>
                             <select 
                                className="w-full border-2 border-blue-200 p-3 rounded-lg text-sm bg-white font-bold text-blue-900 cursor-pointer"
                                value={businessForm.taxRegime}
                                onChange={e => setBusinessForm({...businessForm, taxRegime: e.target.value as TaxRegime})}
                             >
                                 <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                                 <option value="MEI">MEI (Microempreendedor Individual)</option>
                                 <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                                 <option value="LUCRO_REAL">Lucro Real</option>
                             </select>
                             <p className="text-[10px] text-blue-600 mt-2 font-medium">Esta definição sugere a composição de impostos no módulo de RH.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold mb-1">Razão Social</label><input className="w-full border p-3 rounded-lg" value={businessForm.restaurantName || ''} onChange={e => setBusinessForm({...businessForm, restaurantName: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold mb-1">Nome do Responsável</label><input className="w-full border p-3 rounded-lg" value={businessForm.ownerName || ''} onChange={e => setBusinessForm({...businessForm, ownerName: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold mb-1">CNPJ</label><input className="w-full border p-3 rounded-lg" value={businessForm.cnpj || ''} onChange={e => setBusinessForm({...businessForm, cnpj: formatCNPJ(e.target.value)})} maxLength={18} /></div>
                            <div><label className="block text-xs font-bold mb-1">Telefone</label><input className="w-full border p-3 rounded-lg" value={businessForm.phone || ''} onChange={e => setBusinessForm({...businessForm, phone: formatPhone(e.target.value)})} /></div>
                        </div>
                        
                        <div className="border-t pt-6">
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16}/> Endereço</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold mb-1">CEP</label>
                                    <div className="relative">
                                        <input className={`w-full border p-3 rounded-lg ${loadingCep ? 'bg-gray-50' : ''}`} value={businessForm.address?.cep || ''} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, cep: formatCEP(e.target.value)}})} onBlur={handleCepBlur} placeholder="00000-000" maxLength={9} />
                                        {loadingCep && <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-blue-500"/>}
                                    </div>
                                </div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Rua</label><input className="w-full border p-3 rounded-lg bg-gray-50" value={businessForm.address?.street || ''} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, street: e.target.value}})} /></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold mb-1">Número</label><input className="w-full border p-3 rounded-lg" value={businessForm.address?.number || ''} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, number: e.target.value}})} /></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold mb-1">Bairro</label><input className="w-full border p-3 rounded-lg bg-gray-50" value={businessForm.address?.neighborhood || ''} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, neighborhood: e.target.value}})} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Cidade</label><input className="w-full border p-3 rounded-lg bg-gray-50" value={businessForm.address?.city || ''} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, city: e.target.value}})} /></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold mb-1">UF</label><input className="w-full border p-3 rounded-lg bg-gray-50" maxLength={2} value={businessForm.address?.state || ''} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, state: e.target.value.toUpperCase()}})} /></div>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Share2 size={16}/> Redes Sociais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold mb-1">Instagram</label><input className="w-full border p-3 rounded-lg" value={businessForm.instagram || ''} onChange={e => setBusinessForm({...businessForm, instagram: e.target.value})} placeholder="@seu.restaurante" /></div>
                                <div><label className="block text-xs font-bold mb-1">Website</label><input className="w-full border p-3 rounded-lg" value={businessForm.website || ''} onChange={e => setBusinessForm({...businessForm, website: e.target.value})} placeholder="www.seusite.com.br" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- RULES VIEW --- */}
            {view === 'RULES' && (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-blue-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest">Operacional</div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Clock size={32} /></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Tempo de Arrependimento</h2>
                                <p className="text-sm text-gray-500 leading-relaxed">Janela de tempo após o pedido em que o cliente pode cancelar de forma autônoma.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                            <div className="flex justify-between items-end mb-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tempo de Carência (Minutos)</label>
                                <span className="text-3xl font-black text-blue-600">{businessForm.orderGracePeriodMinutes || 0} min</span>
                            </div>
                            <input type="range" min="0" max="10" step="1" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={businessForm.orderGracePeriodMinutes || 0} onChange={e => setBusinessForm({...businessForm, orderGracePeriodMinutes: parseInt(e.target.value)})} />
                            <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400"><span>0 min (Instantâneo)</span><span>10 min (Seguro)</span></div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-orange-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest">Atendimento</div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="bg-orange-50 p-3 rounded-2xl text-orange-600"><Bell size={32} /></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Notificações de Chamado</h2>
                                <p className="text-sm text-gray-500 leading-relaxed">Defina quem recebe os chamados dos clientes nas mesas.</p>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Modo de Notificação</label>
                            <select 
                                className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 outline-none font-bold text-gray-700 bg-white"
                                value={businessForm.waiterNotificationMode || 'ALL'}
                                onChange={e => setBusinessForm({...businessForm, waiterNotificationMode: e.target.value as any})}
                            >
                                <option value="ALL">Notificar Todos os Garçons</option>
                                <option value="OPENER">Notificar Apenas Quem Abriu a Mesa</option>
                                <option value="ASSIGNED">Atribuir Mesas a Garçons (Manual)</option>
                            </select>
                            
                            {businessForm.waiterNotificationMode === 'ASSIGNED' && (
                                <div className="mt-4 flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                    <input 
                                        type="checkbox" 
                                        id="strictMode"
                                        className="w-5 h-5 accent-orange-500"
                                        checked={businessForm.strictWaiterNotification || false}
                                        onChange={e => setBusinessForm({...businessForm, strictWaiterNotification: e.target.checked})}
                                    />
                                    <label htmlFor="strictMode" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                        Modo Estrito (Ignorar Mesas Sem Garçom)
                                    </label>
                                </div>
                            )}

                            <p className="text-[10px] text-gray-400 mt-2">
                                {(!businessForm.waiterNotificationMode || businessForm.waiterNotificationMode === 'ALL') && "Todos os garçons logados receberão o alerta sonoro e visual."}
                                {businessForm.waiterNotificationMode === 'OPENER' && "Apenas o garçom que iniciou o atendimento na mesa receberá o alerta."}
                                {businessForm.waiterNotificationMode === 'ASSIGNED' && (
                                    <>
                                        Defina quais mesas cada garçom atende na tela de Equipe.
                                        {businessForm.strictWaiterNotification 
                                            ? " Mesas sem garçom atribuído NÃO notificarão ninguém (exceto Admins)." 
                                            : " Mesas sem garçom atribuído notificarão TODOS os garçons."}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECURITY VIEW --- */}
            {view === 'SECURITY' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-red-100">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="bg-red-50 p-3 rounded-2xl text-red-600"><Lock size={32} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Segurança</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">Configurações sensíveis e de proteção do sistema.</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Senha Mestra de Cancelamento</label>
                        <input type="text" className="w-full border-2 p-3 rounded-xl focus:border-red-500 outline-none font-mono text-lg tracking-widest" placeholder="Ex: 1234" value={businessForm.adminPin || ''} onChange={e => setBusinessForm({...businessForm, adminPin: e.target.value})} />
                        <p className="text-[10px] text-gray-400 mt-2">Esta senha será exigida para cancelar vendas no caixa. Mantenha em segredo.</p>
                    </div>
                </div>
            )}

            {/* --- DELIVERY VIEW --- */}
            {view === 'DELIVERY' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Bike className="text-green-600"/> Métodos de Entrega</h2>
                        <Button onClick={() => handleOpenDeliveryModal()}><Plus size={16}/> Adicionar Método</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(businessForm.deliverySettings || []).map(method => (
                            <div key={method.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-slate-800">{method.name}</h4>
                                    <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${method.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{method.isActive ? 'Ativo' : 'Inativo'}</span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1 mb-4">
                                    <p>Tipo: <strong>{method.type === 'OWN' ? 'Frota Própria' : method.type === 'APP' ? 'App Parceiro' : 'Retirada'}</strong></p>
                                    <p>Taxa: <strong>{method.feeType === 'FIXED' ? `R$ ${method.feeValue.toFixed(2)}` : `${method.feeValue}%`}</strong> ({method.feeBehavior === 'ADD_TO_TOTAL' ? 'Cobra do Cliente' : 'Desconta do Líquido'})</p>
                                    <p>Tempo: <strong>{method.estimatedTimeMin}-{method.estimatedTimeMax} min</strong></p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenDeliveryModal(method)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">Editar</button>
                                    <button onClick={() => handleDeleteDeliveryMethod(method.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {(businessForm.deliverySettings || []).length === 0 && <div className="col-span-full text-center py-10 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">Nenhum método configurado.</div>}
                    </div>
                </div>
            )}

            {/* --- FINANCE CONFIG VIEW --- */}
            {view === 'FINANCE_CONFIG' && (
                <div className="space-y-8">
                    {/* Meios de Pagamento */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CreditCard className="text-blue-600"/> Meios de Pagamento</h3>
                             <Button onClick={() => handleOpenPaymentModal()} size="sm"><Plus size={16}/> Adicionar</Button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase"><tr><th className="p-3">Nome</th><th className="p-3">Tipo</th><th className="p-3 text-right">Taxa (%)</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Ações</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(businessForm.paymentMethods || []).map(pm => (
                                        <tr key={pm.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-slate-700">{pm.name}</td>
                                            <td className="p-3 text-xs text-slate-500">{pm.type}</td>
                                            <td className="p-3 text-right font-mono">{pm.feePercentage}%</td>
                                            <td className="p-3 text-center"><span className={`w-2 h-2 rounded-full inline-block ${pm.isActive ? 'bg-green-500' : 'bg-red-300'}`}></span></td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleOpenPaymentModal(pm)} className="text-blue-600 p-1 hover:bg-blue-50 rounded mr-1"><Edit size={14}/></button>
                                                <button onClick={() => handleDeletePaymentMethod(pm.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Categorias de Despesas */}
                    <div className="space-y-4 pt-6 border-t">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Tag className="text-purple-600"/> Categorias de Despesas</h3>
                        <div className="flex gap-2">
                            <input className="flex-1 border p-2 rounded-lg" placeholder="Nova categoria..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                            <Button onClick={handleAddCategory}>Adicionar</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(businessForm.expenseCategories || []).map(cat => (
                                <div key={cat.id} className="bg-white border px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm text-slate-700 shadow-sm">
                                    {cat.name}
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Integração RH */}
                    {state.allowedModules?.includes('FINANCE') && (
                        <div className="space-y-4 pt-6 border-t">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users className="text-green-600"/> Integração com RH</h3>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-800">Integrar Folha de Pagamento</h4>
                                        <p className="text-sm text-gray-500">Ao fechar uma folha de pagamento no RH, lançar automaticamente como despesa no financeiro.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${legalSettings?.integrateFinance ? 'text-green-600' : 'text-gray-400'}`}>
                                            {legalSettings?.integrateFinance ? 'ATIVADO' : 'DESATIVADO'}
                                        </span>
                                        <button 
                                            onClick={() => saveLegalSettings({ integrateFinance: !legalSettings?.integrateFinance })}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${legalSettings?.integrateFinance ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${legalSettings?.integrateFinance ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* --- TIME_CLOCK VIEW --- */}
            {view === 'TIME_CLOCK' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="bg-purple-50 p-3 rounded-2xl text-purple-600"><Clock size={32} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Configuração de Ponto</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">Defina as regras para registro de ponto dos colaboradores.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Tipo de Validação</label>
                            <select 
                                className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-purple-500 outline-none font-bold text-gray-700"
                                value={businessForm.timeClock?.validationType || 'NONE'}
                                onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, validationType: e.target.value as any}})}
                            >
                                <option value="NONE">Sem Validação (Apenas Registro)</option>
                                <option value="GEOLOCATION">Geolocalização (GPS)</option>
                            </select>
                        </div>

                        {businessForm.timeClock?.validationType === 'GEOLOCATION' && (
                            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 space-y-4 animate-fade-in">
                                <h3 className="font-bold text-purple-800 flex items-center gap-2"><MapPin size={18}/> Configuração de Local</h3>
                                
                                <div>
                                    <label className="block text-xs font-bold text-purple-700 mb-1">Raio Máximo (Metros)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-3 rounded-lg" 
                                        value={businessForm.timeClock?.maxDistanceMeters || 100} 
                                        onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, maxDistanceMeters: parseInt(e.target.value)}})} 
                                    />
                                    <p className="text-[10px] text-purple-600 mt-1">Distância máxima permitida entre o colaborador e o restaurante.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-purple-700 mb-1">Latitude</label>
                                        <input 
                                            type="number" 
                                            step="any"
                                            className="w-full border p-3 rounded-lg" 
                                            value={businessForm.timeClock?.restaurantLocation?.lat || ''} 
                                            onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, restaurantLocation: {...businessForm.timeClock?.restaurantLocation!, lat: parseFloat(e.target.value)}}})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-purple-700 mb-1">Longitude</label>
                                        <input 
                                            type="number" 
                                            step="any"
                                            className="w-full border p-3 rounded-lg" 
                                            value={businessForm.timeClock?.restaurantLocation?.lng || ''} 
                                            onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, restaurantLocation: {...businessForm.timeClock?.restaurantLocation!, lng: parseFloat(e.target.value)}}})} 
                                        />
                                    </div>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full border-purple-200 text-purple-700 hover:bg-purple-100"
                                    onClick={() => {
                                        navigator.geolocation.getCurrentPosition(
                                            (pos) => {
                                                setBusinessForm({
                                                    ...businessForm, 
                                                    timeClock: {
                                                        ...businessForm.timeClock!, 
                                                        restaurantLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                                                    }
                                                });
                                                showAlert({ title: "Localização Obtida", message: "Coordenadas atualizadas com sua posição atual.", type: 'SUCCESS' });
                                            },
                                            () => showAlert({ title: "Erro", message: "Não foi possível obter sua localização.", type: 'ERROR' })
                                        );
                                    }}
                                >
                                    <MapPin size={16} className="mr-2"/> Usar Minha Localização Atual
                                </Button>
                            </div>
                        )}

                        {businessForm.timeClock?.validationType === 'NONE' && (
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 animate-fade-in">
                                <label className="block text-xs font-bold text-gray-600 mb-1">Limite Diário de Registros</label>
                                <input 
                                    type="number" 
                                    className="w-full border p-3 rounded-lg" 
                                    value={businessForm.timeClock?.maxDailyPunches || 4} 
                                    onChange={e => setBusinessForm({...businessForm, timeClock: {...businessForm.timeClock!, maxDailyPunches: parseInt(e.target.value)}})} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Número máximo de batidas permitidas por dia (Padrão: 4 = Entrada, Saída Almoço, Volta Almoço, Saída).</p>
                            </div>
                        )}

                        {/* DSR Configuration */}
                        <div className="mt-8 border-t pt-8">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileText className="text-purple-600" size={20} />
                                Configuração de DSR (Descanso Semanal Remunerado)
                            </h3>
                            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="font-bold text-gray-700">Calcular DSR sobre Horas Extras</label>
                                        <p className="text-xs text-gray-500">Adiciona o valor do DSR proporcional às horas extras realizadas.</p>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                        checked={dsrForm.calculateOnOvertime}
                                        onChange={e => setDsrForm({...dsrForm, calculateOnOvertime: e.target.checked})}
                                    />
                                </div>
                                
                                {dsrForm.calculateOnOvertime && (
                                    <div className="pl-4 border-l-2 border-purple-200 mt-2 space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-purple-700 mb-1">Tipo de Cálculo</label>
                                            <select 
                                                className="w-full border p-2 rounded-lg bg-white"
                                                value={dsrForm.rateType}
                                                onChange={e => setDsrForm({...dsrForm, rateType: e.target.value as any})}
                                            >
                                                <option value="CALCULATED">Proporcional (Domingos e Feriados / Dias Úteis)</option>
                                                <option value="FIXED">Fixo (1/6 - 16,66%)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                                    <div>
                                        <label className="font-bold text-gray-700">Refletir no 13º Salário</label>
                                        <p className="text-xs text-gray-500">Considerar média de DSR no cálculo do 13º.</p>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                        checked={dsrForm.includeInThirteenth}
                                        onChange={e => setDsrForm({...dsrForm, includeInThirteenth: e.target.checked})}
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                                    <div>
                                        <label className="font-bold text-gray-700">Refletir nas Férias</label>
                                        <p className="text-xs text-gray-500">Considerar média de DSR no cálculo das Férias.</p>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                        checked={dsrForm.includeInVacation}
                                        onChange={e => setDsrForm({...dsrForm, includeInVacation: e.target.checked})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* MODAIS (Delivery e Pagamento) */}
        <Modal isOpen={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} title={editingMethod ? "Editar Método de Entrega" : "Novo Método"} variant="dialog" maxWidth="sm" onSave={handleSaveDeliveryMethod}>
             <div className="space-y-4">
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Nome (Ex: Motoboy Próprio)</label><input className="w-full border p-2 rounded-lg mt-1" value={methodForm.name} onChange={e => setMethodForm({...methodForm, name: e.target.value})} /></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Tipo Logístico</label><select className="w-full border p-2 rounded-lg mt-1 bg-white" value={methodForm.type} onChange={e => setMethodForm({...methodForm, type: e.target.value as any})}><option value="OWN">Frota Própria</option><option value="APP">App Parceiro (iFood/Rappi)</option><option value="PICKUP">Retirada no Local</option></select></div>
                 <div className="grid grid-cols-2 gap-3">
                     <div><label className="text-xs font-bold text-gray-500 uppercase">Tipo Taxa</label><select className="w-full border p-2 rounded-lg mt-1 bg-white" value={methodForm.feeType} onChange={e => setMethodForm({...methodForm, feeType: e.target.value as any})}><option value="FIXED">Valor Fixo (R$)</option><option value="PERCENTAGE">Porcentagem (%)</option></select></div>
                     <div><label className="text-xs font-bold text-gray-500 uppercase">Valor</label><input type="number" step="0.01" className="w-full border p-2 rounded-lg mt-1" value={methodForm.feeValue} onChange={e => setMethodForm({...methodForm, feeValue: parseFloat(e.target.value)})} /></div>
                 </div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Comportamento da Taxa</label><select className="w-full border p-2 rounded-lg mt-1 bg-white" value={methodForm.feeBehavior} onChange={e => setMethodForm({...methodForm, feeBehavior: e.target.value as any})}><option value="ADD_TO_TOTAL">Cobrar do Cliente (Adicional)</option><option value="DEDUCT_FROM_NET">Custo Interno (Deduzir do Lucro)</option><option value="NONE">Apenas Informativo</option></select></div>
                 <div className="flex gap-2 items-center pt-2"><input type="checkbox" checked={methodForm.isActive} onChange={e => setMethodForm({...methodForm, isActive: e.target.checked})} className="w-4 h-4"/><span className="text-sm">Ativo</span></div>
             </div>
        </Modal>

        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={paymentForm.id ? "Editar Pagamento" : "Novo Meio de Pagamento"} variant="dialog" maxWidth="sm" onSave={handleSavePaymentMethod}>
             <div className="space-y-4">
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Nome (Ex: Visa Crédito)</label><input className="w-full border p-2 rounded-lg mt-1" value={paymentForm.name} onChange={e => setPaymentForm({...paymentForm, name: e.target.value})} /></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Tipo</label><select className="w-full border p-2 rounded-lg mt-1 bg-white" value={paymentForm.type} onChange={e => setPaymentForm({...paymentForm, type: e.target.value as any})}><option value="CREDIT">Crédito</option><option value="DEBIT">Débito</option><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="MEAL_VOUCHER">Vale Refeição</option><option value="APP">App/Online</option></select></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Taxa da Operadora (%)</label><input type="number" step="0.01" className="w-full border p-2 rounded-lg mt-1" value={paymentForm.feePercentage} onChange={e => setPaymentForm({...paymentForm, feePercentage: parseFloat(e.target.value)})} /></div>
                 <div className="flex gap-2 items-center pt-2"><input type="checkbox" checked={paymentForm.isActive} onChange={e => setPaymentForm({...paymentForm, isActive: e.target.checked})} className="w-4 h-4"/><span className="text-sm">Ativo</span></div>
             </div>
        </Modal>
    </div>
  );
};
