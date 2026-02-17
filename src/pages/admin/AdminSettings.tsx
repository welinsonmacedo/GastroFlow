
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { useStaff } from '../../context/StaffContext';
import { Button } from '../../components/Button';
import { Building2, MapPin, Phone, Loader2, Share2, Clock, ShieldAlert, Lock, Save, SlidersHorizontal, ShieldCheck, Bike, Plus, Trash2, Edit, Users, UserPlus, Link as LinkIcon, Check, CheckSquare } from 'lucide-react';
import { RestaurantBusinessInfo, DeliveryMethodConfig, User, Role } from '../../types';
import { Modal } from '../../components/Modal';
import { StaffFormModal } from '../../components/modals/StaffFormModal';
import { getTenantSlug } from '../../utils/tenant';

export const AdminSettings: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { state: staffState, deleteUser } = useStaff();
  const { showAlert, showConfirm } = useUI();
  
  // Controle das Abas
  const [activeSettingsTab, setActiveSettingsTab] = useState<'BUSINESS' | 'RULES' | 'SECURITY' | 'DELIVERY' | 'TEAM'>('BUSINESS');
  
  // Business Info State
  const [businessForm, setBusinessForm] = useState<RestaurantBusinessInfo>({
      address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' },
      orderGracePeriodMinutes: 2,
      adminPin: '',
      deliverySettings: [],
      ...state.businessInfo
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // Modal de Delivery Method
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<DeliveryMethodConfig | null>(null);
  const [methodForm, setMethodForm] = useState<DeliveryMethodConfig>({
      id: '', name: '', type: 'OWN', feeType: 'FIXED', feeValue: 0, feeBehavior: 'ADD_TO_TOTAL', isActive: true, estimatedTimeMin: 30, estimatedTimeMax: 45
  });

  // States para Gestão de Equipe (Staff)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  useEffect(() => {
      if (state.businessInfo) {
          setBusinessForm(prev => ({
              ...prev,
              ...state.businessInfo,
              address: state.businessInfo.address || prev.address,
              orderGracePeriodMinutes: state.businessInfo.orderGracePeriodMinutes ?? prev.orderGracePeriodMinutes,
              adminPin: state.businessInfo.adminPin ?? prev.adminPin,
              deliverySettings: state.businessInfo.deliverySettings || []
          }));
      }
  }, [state.businessInfo]);

  // --- ACTIONS ---

  const handleSaveBusiness = async () => {
      await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: businessForm });
      showAlert({ title: 'Sucesso', message: 'Dados da empresa e configurações atualizados!', type: 'SUCCESS' });
  };

  const handleOpenDeliveryModal = (method?: DeliveryMethodConfig) => {
      if (method) {
          setEditingMethod(method);
          setMethodForm(method);
      } else {
          setEditingMethod(null);
          setMethodForm({
              id: Math.random().toString(36).substr(2, 9),
              name: '',
              type: 'OWN',
              feeType: 'FIXED',
              feeValue: 0,
              feeBehavior: 'ADD_TO_TOTAL',
              isActive: true,
              estimatedTimeMin: 30, 
              estimatedTimeMax: 45
          });
      }
      setIsDeliveryModalOpen(true);
  };

  const handleSaveDeliveryMethod = async () => {
      if (!methodForm.name) return showAlert({title: "Nome Obrigatório", message: "Informe um nome para o método.", type: "WARNING"});
      
      let updatedSettings = [...(businessForm.deliverySettings || [])];
      
      if (editingMethod) {
          updatedSettings = updatedSettings.map(m => m.id === editingMethod.id ? methodForm : m);
      } else {
          updatedSettings.push(methodForm);
      }

      const newInfo = { ...businessForm, deliverySettings: updatedSettings };
      setBusinessForm(newInfo);
      
      await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo });
      
      setIsDeliveryModalOpen(false);
      showAlert({ title: "Salvo", message: "Método de entrega atualizado e disponível no caixa.", type: 'SUCCESS' });
  };

  const handleDeleteDeliveryMethod = (id: string) => {
      showConfirm({
          title: "Excluir Método",
          message: "Tem certeza? Isso impedirá novos pedidos com este método.",
          onConfirm: async () => {
              const updated = (businessForm.deliverySettings || []).filter(m => m.id !== id);
              const newInfo = { ...businessForm, deliverySettings: updated };
              
              setBusinessForm(newInfo);
              await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo });
              showAlert({ title: "Excluído", message: "Método removido.", type: 'SUCCESS' });
          }
      });
  };

  // --- HELPERS EQUIPE ---
  const copyInviteLink = (userEmail?: string, userId?: string) => {
      if (!userEmail) return showAlert({ title: "Atenção", message: "Este usuário não tem email cadastrado.", type: 'WARNING' });
      const slug = state.tenantSlug || getTenantSlug();
      const link = `${window.location.origin}/login?restaurant=${slug}&email=${encodeURIComponent(userEmail)}&register=true`;
      
      navigator.clipboard.writeText(link).then(() => {
          if (userId) {
              setCopiedInviteId(userId);
              setTimeout(() => setCopiedInviteId(null), 2000);
          }
          showAlert({ title: "Link Copiado!", message: "Envie este link para o funcionário criar a senha.", type: 'SUCCESS' });
      });
  };

  // --- HELPERS GERAIS ---

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
            <p className="text-gray-500">Gerencie dados cadastrais, segurança, equipe e regras de negócio.</p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
            <button 
                onClick={() => setActiveSettingsTab('BUSINESS')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeSettingsTab === 'BUSINESS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
                <Building2 size={18} /> Dados da Empresa
            </button>
            <button 
                onClick={() => setActiveSettingsTab('DELIVERY')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeSettingsTab === 'DELIVERY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
                <Bike size={18} /> Config. Delivery
            </button>
            <button 
                onClick={() => setActiveSettingsTab('TEAM')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeSettingsTab === 'TEAM' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
                <Users size={18} /> Equipe
            </button>
            <button 
                onClick={() => setActiveSettingsTab('RULES')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeSettingsTab === 'RULES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
                <SlidersHorizontal size={18} /> Regras de Negócio
            </button>
            <button 
                onClick={() => setActiveSettingsTab('SECURITY')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeSettingsTab === 'SECURITY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
                <ShieldCheck size={18} /> Segurança
            </button>
        </div>

        <div className="space-y-8">
            
            {/* TAB: DADOS DA EMPRESA */}
            {activeSettingsTab === 'BUSINESS' && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                    <h2 className="text-xl font-bold mb-1 text-gray-800 flex items-center gap-2"><Building2 className="text-orange-600"/> Dados Cadastrais</h2>
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

                        <div className="pt-4 border-t border-gray-200">
                            <Button onClick={handleSaveBusiness} className="w-full py-4 text-lg shadow-lg flex items-center justify-center gap-2">
                                <Save size={20}/> Salvar Dados
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: DELIVERY SETTINGS */}
            {activeSettingsTab === 'DELIVERY' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-green-100 animate-fade-in">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Bike className="text-green-600" /> Configuração de Delivery</h2>
                            <p className="text-sm text-gray-500">Cadastre métodos de entrega, taxas e integrações.</p>
                        </div>
                        <Button onClick={() => handleOpenDeliveryModal()}>
                            <Plus size={18} /> Adicionar Método
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {(businessForm.deliverySettings || []).map((method, idx) => (
                            <div key={method.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center group hover:border-blue-300 transition-all">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-slate-800">{method.name}</h4>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${method.type === 'APP' ? 'bg-purple-100 text-purple-700' : (method.type === 'OWN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700')}`}>
                                            {method.type === 'APP' ? 'Aplicativo' : (method.type === 'OWN' ? 'Frota Própria' : 'Retirada')}
                                        </span>
                                        {!method.isActive && <span className="text-[10px] font-bold text-red-500 border border-red-200 px-2 rounded">Inativo</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-4">
                                        <span>
                                            Taxa: {method.feeType === 'FIXED' ? `R$ ${method.feeValue.toFixed(2)}` : `${method.feeValue}%`} 
                                            <span className="text-gray-400 ml-1">
                                                ({method.feeBehavior === 'ADD_TO_TOTAL' ? 'Cobra do Cliente' : (method.feeBehavior === 'DEDUCT_FROM_NET' ? 'Comissão App' : 'Sem Taxa')})
                                            </span>
                                        </span>
                                        <span>Tempo: {method.estimatedTimeMin}-{method.estimatedTimeMax} min</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenDeliveryModal(method)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
                                    <button onClick={() => handleDeleteDeliveryMethod(method.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                        {(!businessForm.deliverySettings || businessForm.deliverySettings.length === 0) && (
                            <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
                                Nenhuma forma de entrega configurada.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: GESTÃO DE EQUIPE */}
            {activeSettingsTab === 'TEAM' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-purple-600"/> Equipe</h2>
                            <p className="text-sm text-gray-500">Gerencie usuários e permissões de acesso.</p>
                        </div>
                        <Button onClick={() => { 
                            setEditingUser(null); 
                            setIsStaffModalOpen(true);
                        }}>
                            <UserPlus size={16}/> Novo Usuário
                        </Button>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b">
                                <tr>
                                    <th className="p-4">Nome</th>
                                    <th className="p-4">Cargo</th>
                                    <th className="p-4">Acesso (PIN)</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {staffState.users.map(user => {
                                    const isPending = !user.auth_user_id;
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold text-gray-800">{user.name}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold
                                                    ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : ''}
                                                    ${user.role === 'WAITER' ? 'bg-orange-100 text-orange-700' : ''}
                                                    ${user.role === 'KITCHEN' ? 'bg-red-100 text-red-700' : ''}
                                                    ${user.role === 'CASHIER' ? 'bg-green-100 text-green-700' : ''}
                                                `}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-gray-500">****</td>
                                            <td className="p-4 text-gray-600">{user.email || '-'}</td>
                                            <td className="p-4 text-center">
                                                {isPending ? (
                                                    <button 
                                                        onClick={() => copyInviteLink(user.email, user.id)}
                                                        className={`flex items-center gap-1 mx-auto text-xs px-2 py-1 rounded border transition-all ${copiedInviteId === user.id ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'}`}
                                                    >
                                                        {copiedInviteId === user.id ? <Check size={12}/> : <LinkIcon size={12}/>}
                                                        {copiedInviteId === user.id ? 'Copiado!' : 'Copiar Convite'}
                                                    </button>
                                                ) : (
                                                    <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1"><CheckSquare size={14}/> Ativo</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { 
                                                        setEditingUser(user); 
                                                        setIsStaffModalOpen(true);
                                                    }} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="Editar"><Edit size={16}/></button>
                                                    <button onClick={() => showConfirm({ title: 'Excluir Usuário', message: 'Confirma a exclusão? O acesso será revogado.', onConfirm: () => deleteUser(user.id) })} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Excluir"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: REGRAS DE NEGÓCIO */}
            {activeSettingsTab === 'RULES' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-blue-100 overflow-hidden relative animate-fade-in">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest">Operacional</div>
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
                    
                    <div className="pt-4 border-t border-gray-200 mt-6">
                        <Button onClick={handleSaveBusiness} className="w-full py-4 text-lg shadow-lg flex items-center justify-center gap-2">
                            <Save size={20}/> Salvar Regras
                        </Button>
                    </div>
                </div>
            )}

            {/* TAB: SEGURANÇA */}
            {activeSettingsTab === 'SECURITY' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-red-100 animate-fade-in">
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
                    <div className="pt-4 border-t border-gray-200 mt-6">
                        <Button onClick={handleSaveBusiness} className="w-full py-4 text-lg shadow-lg flex items-center justify-center gap-2">
                            <Save size={20}/> Salvar Segurança
                        </Button>
                    </div>
                </div>
            )}
        </div>

        {/* Modal de Cadastro de Método de Delivery */}
        <Modal isOpen={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} title={editingMethod ? "Editar Método" : "Novo Método de Entrega"} variant="dialog" maxWidth="md">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nome do Método</label>
                    <input className="w-full border p-2.5 rounded-lg" placeholder="Ex: Motoboy Próprio, iFood, Retirada" value={methodForm.name} onChange={e => setMethodForm({...methodForm, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tipo Logístico</label>
                        <select className="w-full border p-2.5 rounded-lg bg-white" value={methodForm.type} onChange={e => setMethodForm({...methodForm, type: e.target.value as any})}>
                            <option value="OWN">Frota Própria</option>
                            <option value="APP">Aplicativo (iFood/Uber)</option>
                            <option value="PICKUP">Retirada (Cliente)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
                        <div className="flex gap-2 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="isActive" checked={methodForm.isActive} onChange={() => setMethodForm({...methodForm, isActive: true})} /> Ativo
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="isActive" checked={!methodForm.isActive} onChange={() => setMethodForm({...methodForm, isActive: false})} /> Inativo
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Configuração Financeira</h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Tipo de Valor</label>
                            <select className="w-full border p-2 rounded-lg bg-white text-sm" value={methodForm.feeType} onChange={e => setMethodForm({...methodForm, feeType: e.target.value as any})}>
                                <option value="FIXED">Valor Fixo (R$)</option>
                                <option value="PERCENTAGE">Porcentagem (%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Valor da Taxa</label>
                            <input type="number" step="0.01" className="w-full border p-2 rounded-lg text-sm" value={methodForm.feeValue} onChange={e => setMethodForm({...methodForm, feeValue: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Comportamento da Taxa</label>
                        <select className="w-full border p-2 rounded-lg bg-white text-sm" value={methodForm.feeBehavior} onChange={e => setMethodForm({...methodForm, feeBehavior: e.target.value as any})}>
                            <option value="ADD_TO_TOTAL">Adicionar ao Total (Cobrar do Cliente)</option>
                            <option value="DEDUCT_FROM_NET">Descontar do Repasse (Comissão App)</option>
                            <option value="NONE">Apenas Informativo / Sem Taxa</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 italic">
                            {methodForm.feeBehavior === 'ADD_TO_TOTAL' && "O valor será somado à conta do cliente (Ex: Taxa de Entrega)."}
                            {methodForm.feeBehavior === 'DEDUCT_FROM_NET' && "O valor será subtraído internamente no relatório financeiro (Ex: Taxa iFood)."}
                            {methodForm.feeBehavior === 'NONE' && "Nenhum valor será adicionado ou descontado."}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tempo Mínimo (min)</label>
                        <input type="number" className="w-full border p-2.5 rounded-lg" value={methodForm.estimatedTimeMin} onChange={e => setMethodForm({...methodForm, estimatedTimeMin: parseInt(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tempo Máximo (min)</label>
                        <input type="number" className="w-full border p-2.5 rounded-lg" value={methodForm.estimatedTimeMax} onChange={e => setMethodForm({...methodForm, estimatedTimeMax: parseInt(e.target.value)})} />
                    </div>
                </div>

                <Button onClick={handleSaveDeliveryMethod} className="w-full mt-4">Salvar Método</Button>
            </div>
        </Modal>

        {/* Modal de Staff */}
        <StaffFormModal 
            isOpen={isStaffModalOpen} 
            onClose={() => setIsStaffModalOpen(false)} 
            userToEdit={editingUser} 
        />
    </div>
  );
};
