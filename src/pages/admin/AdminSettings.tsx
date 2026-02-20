
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Building2, MapPin, Phone, Loader2, Share2, Clock, Lock, Save, SlidersHorizontal, ShieldCheck, Bike, Plus, Trash2, Edit, CreditCard, Tag, DollarSign, FileText } from 'lucide-react';
import { RestaurantBusinessInfo, DeliveryMethodConfig, PaymentMethodConfig, ExpenseCategory, TaxRegime } from '../../types';
import { Modal } from '../../components/Modal';

interface AdminSettingsProps {
    view: 'BUSINESS' | 'RULES' | 'SECURITY' | 'DELIVERY' | 'FINANCE_CONFIG';
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ view }) => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const { planLimits } = state;
  
  const [businessForm, setBusinessForm] = useState<RestaurantBusinessInfo>({
      address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' },
      orderGracePeriodMinutes: 2,
      adminPin: '',
      deliverySettings: [],
      paymentMethods: [],
      expenseCategories: [],
      taxRegime: 'SIMPLES_NACIONAL', // Default
      ...state.businessInfo
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // Modal Delivery/Payment... (omitido para brevidade, lógica mantém a mesma)
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
              taxRegime: state.businessInfo.taxRegime || 'SIMPLES_NACIONAL'
          }));
      }
  }, [state.businessInfo]);

  // Actions... (Mantém handlers existentes)
  const handleSaveBusiness = async () => {
      await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: businessForm });
      showAlert({ title: 'Sucesso', message: 'Dados da empresa atualizados!', type: 'SUCCESS' });
  };
  
  // Helpers...
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

  // ... (Restante dos handlers de modal)
  const handleOpenDeliveryModal = (method?: DeliveryMethodConfig) => { if (method) { setEditingMethod(method); setMethodForm(method); } else { setEditingMethod(null); setMethodForm({ id: Math.random().toString(36).substr(2, 9), name: '', type: 'OWN', feeType: 'FIXED', feeValue: 0, feeBehavior: 'ADD_TO_TOTAL', isActive: true, estimatedTimeMin: 30, estimatedTimeMax: 45 }); } setIsDeliveryModalOpen(true); };
  const handleSaveDeliveryMethod = async () => { if (!methodForm.name) return showAlert({title: "Nome Obrigatório", message: "Informe um nome.", type: "WARNING"}); let updatedSettings = [...(businessForm.deliverySettings || [])]; if (editingMethod) { updatedSettings = updatedSettings.map(m => m.id === editingMethod.id ? methodForm : m); } else { updatedSettings.push(methodForm); } const newInfo = { ...businessForm, deliverySettings: updatedSettings }; setBusinessForm(newInfo); await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo }); setIsDeliveryModalOpen(false); showAlert({ title: "Salvo", message: "Método atualizado.", type: 'SUCCESS' }); };
  const handleDeleteDeliveryMethod = (id: string) => { showConfirm({ title: "Excluir Método", message: "Tem certeza?", onConfirm: async () => { const updated = (businessForm.deliverySettings || []).filter(m => m.id !== id); const newInfo = { ...businessForm, deliverySettings: updated }; setBusinessForm(newInfo); await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo }); } }); };
  const handleOpenPaymentModal = (method?: PaymentMethodConfig) => { if (method) { setPaymentForm(method); } else { setPaymentForm({ id: Math.random().toString(36).substr(2, 9), name: '', type: 'CREDIT', feePercentage: 0, isActive: true }); } setIsPaymentModalOpen(true); };
  const handleSavePaymentMethod = async () => { if (!paymentForm.name) return showAlert({title: "Nome Obrigatório", message: "Informe um nome.", type: "WARNING"}); let updatedMethods = [...(businessForm.paymentMethods || [])]; const existingIdx = updatedMethods.findIndex(m => m.id === paymentForm.id); if (existingIdx >= 0) { updatedMethods[existingIdx] = paymentForm; } else { updatedMethods.push(paymentForm); } const newInfo = { ...businessForm, paymentMethods: updatedMethods }; setBusinessForm(newInfo); await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo }); setIsPaymentModalOpen(false); showAlert({ title: "Salvo", message: "Pagamento atualizado.", type: 'SUCCESS' }); };
  const handleDeletePaymentMethod = (id: string) => { showConfirm({ title: "Excluir Pagamento", message: "Tem certeza?", onConfirm: async () => { const updated = (businessForm.paymentMethods || []).filter(m => m.id !== id); const newInfo = { ...businessForm, paymentMethods: updated }; setBusinessForm(newInfo); await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo }); } }); };
  const handleAddCategory = async () => { if (!newCategoryName.trim()) return; const newCat: ExpenseCategory = { id: Math.random().toString(36).substr(2, 9), name: newCategoryName.trim() }; const updatedCats = [...(businessForm.expenseCategories || []), newCat]; const newInfo = { ...businessForm, expenseCategories: updatedCats }; setBusinessForm(newInfo); await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo }); setNewCategoryName(''); showAlert({ title: "Sucesso", message: "Categoria adicionada.", type: 'SUCCESS' }); };
  const handleDeleteCategory = (id: string) => { showConfirm({ title: "Excluir Categoria", message: "Tem certeza?", onConfirm: async () => { const updated = (businessForm.expenseCategories || []).filter(c => c.id !== id); const newInfo = { ...businessForm, expenseCategories: updated }; setBusinessForm(newInfo); await dispatch({ type: 'UPDATE_BUSINESS_INFO', info: newInfo }); } }); };

  const getPageTitle = () => {
      switch(view) {
          case 'BUSINESS': return 'Dados Gerais';
          case 'RULES': return 'Regras Operacionais';
          case 'SECURITY': return 'Segurança';
          case 'DELIVERY': return 'Configuração de Delivery';
          case 'FINANCE_CONFIG': return 'Configurações Financeiras';
          default: return 'Configurações';
      }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
        <header className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h2>
        </header>

        <div className="space-y-8">
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
                            <div><label className="block text-xs font-bold mb-1">CNPJ</label><input className="w-full border p-3 rounded-lg" value={businessForm.cnpj} onChange={e => setBusinessForm({...businessForm, cnpj: formatCNPJ(e.target.value)})} maxLength={18} /></div>
                            <div><label className="block text-xs font-bold mb-1">Telefone</label><input className="w-full border p-3 rounded-lg" value={businessForm.phone} onChange={e => setBusinessForm({...businessForm, phone: formatPhone(e.target.value)})} /></div>
                        </div>
                        <div className="border-t pt-6">
                            <h3 className="text-sm font-bold