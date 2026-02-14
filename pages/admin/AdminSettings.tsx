
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Building2, MapPin, Phone, Loader2, Share2, Clock, ShieldAlert, Lock, Save } from 'lucide-react';
import { RestaurantBusinessInfo } from '../../types';

export const AdminSettings: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert } = useUI();
  
  // Business Info State
  // Inicializa com defaults seguros
  const [businessForm, setBusinessForm] = useState<RestaurantBusinessInfo>({
      address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' },
      orderGracePeriodMinutes: 2,
      adminPin: '',
      ...state.businessInfo
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // Sincroniza o formulário quando os dados do restaurante forem carregados do banco
  useEffect(() => {
      if (state.businessInfo) {
          setBusinessForm(prev => ({
              ...prev,
              ...state.businessInfo,
              // Garante que campos opcionais tenham valor padrão se vierem nulos do banco
              address: state.businessInfo.address || prev.address,
              orderGracePeriodMinutes: state.businessInfo.orderGracePeriodMinutes ?? prev.orderGracePeriodMinutes,
              adminPin: state.businessInfo.adminPin ?? prev.adminPin
          }));
      }
  }, [state.businessInfo]);

  // --- ACTIONS ---

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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
        
        <header className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h2>
            <p className="text-gray-500">Gerencie dados cadastrais, segurança e regras de negócio.</p>
        </header>

        <div className="space-y-8">
            {/* Security Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-red-100">
                <div className="flex items-start gap-4 mb-6">
                    <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                        <Lock size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Segurança</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">Configurações sensíveis e de proteção do sistema.</p>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Senha Mestra de Cancelamento</label>
                    <input 
                        type="text" 
                        className="w-full border-2 p-3 rounded-xl focus:border-red-500 outline-none font-mono text-lg tracking-widest"
                        placeholder="Ex: 1234"
                        value={businessForm.adminPin || ''}
                        onChange={e => setBusinessForm({...businessForm, adminPin: e.target.value})}
                    />
                    <p className="text-[10px] text-gray-400 mt-2">Esta senha será exigida para cancelar vendas no caixa. Mantenha em segredo.</p>
                </div>
            </div>

            {/* Grace Period Configuration */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-blue-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest">Novo Recurso</div>
                <div className="flex items-start gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Tempo de Arrependimento</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">Janela de tempo após o pedido em que o cliente pode cancelar de forma autônoma. Durante este tempo, o pedido **NÃO** aparece na cozinha.</p>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <div className="flex justify-between items-end mb-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tempo de Carência (Minutos)</label>
                        <span className="text-3xl font-black text-blue-600">{businessForm.orderGracePeriodMinutes || 0} min</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="1" 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        value={businessForm.orderGracePeriodMinutes || 0}
                        onChange={e => setBusinessForm({...businessForm, orderGracePeriodMinutes: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
                        <span>0 min (Envio Instantâneo)</span>
                        <span>10 min (Segurança Máxima)</span>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100 flex gap-3">
                    <ShieldAlert className="text-orange-500 shrink-0" size={20} />
                    <p className="text-[11px] text-orange-800 font-medium italic">Recomendamos de 2 a 3 minutos para dar tempo ao cliente de corrigir erros sem impactar a velocidade da cozinha.</p>
                </div>
            </div>

            {/* Business Data */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold mb-1 text-gray-800 flex items-center gap-2"><Building2 className="text-orange-600"/> Dados da Empresa</h2>
                <p className="text-sm text-gray-500 mb-8">Estes dados aparecem nas notas impressas e no rodapé do sistema.</p>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold mb-1">Razão Social</label>
                            <input className="w-full border p-3 rounded-lg" value={businessForm.restaurantName || ''} onChange={e => setBusinessForm({...businessForm, restaurantName: e.target.value})} placeholder="Razão Social Ltda" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Nome do Responsável</label>
                            <input className="w-full border p-3 rounded-lg" value={businessForm.ownerName || ''} onChange={e => setBusinessForm({...businessForm, ownerName: e.target.value})} placeholder="Nome Completo" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold mb-1">CNPJ</label>
                            <input className="w-full border p-3 rounded-lg" value={businessForm.cnpj} onChange={e => setBusinessForm({...businessForm, cnpj: formatCNPJ(e.target.value)})} placeholder="00.000.000/0000-00" maxLength={18} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Telefone / WhatsApp</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                                <input className="w-full pl-10 border p-3 rounded-lg" value={businessForm.phone} onChange={e => setBusinessForm({...businessForm, phone: formatPhone(e.target.value)})} placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold mb-1">E-mail Contato</label>
                            <input type="email" className="w-full border p-3 rounded-lg" value={businessForm.email} onChange={e => setBusinessForm({...businessForm, email: e.target.value})} placeholder="contato@restaurante.com" />
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16}/> Endereço</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold mb-1">CEP</label>
                                <div className="relative">
                                    <input className={`w-full border p-3 rounded-lg ${loadingCep ? 'bg-gray-50' : ''}`} value={businessForm.address?.cep} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, cep: formatCEP(e.target.value)}})} onBlur={handleCepBlur} placeholder="00000-000" maxLength={9} />
                                    {loadingCep && <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-blue-500"/>}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1">Rua</label>
                                <input className="w-full border p-3 rounded-lg bg-gray-50" value={businessForm.address?.street} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, street: e.target.value}})} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold mb-1">Número</label>
                                <input className="w-full border p-3 rounded-lg" value={businessForm.address?.number} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, number: e.target.value}})} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold mb-1">Complemento</label>
                                <input className="w-full border p-3 rounded-lg" value={businessForm.address?.complement} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, complement: e.target.value}})} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold mb-1">Bairro</label>
                                <input className="w-full border p-3 rounded-lg bg-gray-50" value={businessForm.address?.neighborhood} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, neighborhood: e.target.value}})} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold mb-1">Cidade</label>
                                <input className="w-full border p-3 rounded-lg bg-gray-50" value={businessForm.address?.city} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, city: e.target.value}})} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold mb-1">UF</label>
                                <input className="w-full border p-3 rounded-lg bg-gray-50" maxLength={2} value={businessForm.address?.state} onChange={e => setBusinessForm({...businessForm, address: {...businessForm.address!, state: e.target.value.toUpperCase()}})} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Share2 size={16}/> Redes Sociais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1">Instagram</label>
                                <input className="w-full border p-3 rounded-lg" value={businessForm.instagram} onChange={e => setBusinessForm({...businessForm, instagram: e.target.value})} placeholder="@seu.restaurante" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Website</label>
                                <input className="w-full border p-3 rounded-lg" value={businessForm.website} onChange={e => setBusinessForm({...businessForm, website: e.target.value})} placeholder="www.seusite.com.br" />
                            </div>
                        </div>
                    </div>
                </div>
                <Button onClick={handleSaveBusiness} className="w-full py-4 mt-8 text-lg shadow-lg flex items-center justify-center gap-2"><Save size={20}/> Salvar Dados do Sistema</Button>
            </div>
        </div>
    </div>
  );
};
