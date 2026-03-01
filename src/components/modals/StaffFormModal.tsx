
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { User, Role, ContractType, WorkModel } from '../../types';
import { Shield, Mail, User as UserIcon, Briefcase, Clock, MapPin, DollarSign, HeartPulse, FileText, Printer, FileSignature, RefreshCcw } from 'lucide-react';
import { printStaffSheet } from '../../utils/printStaffSheet';
import { printContract } from '../../utils/printContract';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  variant?: 'ACCESS' | 'RH';
}

type Tab = 'GENERAL' | 'PERSONAL' | 'ADDRESS' | 'CONTRACT' | 'FINANCIAL' | 'SST' | 'CONTRACT_DOCS';

export const StaffFormModal: React.FC<StaffFormModalProps> = ({ isOpen, onClose, userToEdit, variant = 'ACCESS' }) => {
  const { addUser, updateUser, state, uploadSignedContract } = useStaff(); 
  const { state: restState } = useRestaurant();
  const { showAlert } = useUI();

  const [form, setForm] = useState<Partial<User>>({});
  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleGenerateContract = () => {
      const template = state.contractTemplates.find(t => t.id === selectedTemplateId);
      if (!template) return showAlert({ title: "Erro", message: "Selecione um modelo.", type: "WARNING" });
      
      // Merge form data with userToEdit to ensure latest changes are used
      const userData = { ...userToEdit, ...form } as User;
      const company = restState.businessInfo;
      const role = state.hrJobRoles.find(r => r.id === userData.hrJobRoleId);
      const roleName = role ? role.title : (userData.customRoleName || '');
      
      printContract(template.content, userData, company, roleName);
  };

  const handleUploadContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!userToEdit) return showAlert({ title: "Erro", message: "Salve o colaborador antes de enviar o contrato.", type: "WARNING" });

      const file = e.target.files[0];
      setIsUploading(true);
      try {
          await uploadSignedContract(userToEdit.id, file);
          showAlert({ title: "Sucesso", message: "Contrato enviado com sucesso.", type: "SUCCESS" });
      } catch (error: any) {
          showAlert({ title: "Erro", message: "Falha ao enviar contrato: " + error.message, type: "ERROR" });
      } finally {
          setIsUploading(false);
      }
  };

  useEffect(() => {
    if (isOpen) {
        if (userToEdit) {
            setForm({ ...userToEdit, customRoleId: userToEdit.customRoleId || '' });
        } else {
            setForm({ 
                name: '', role: Role.WAITER, email: '', allowedRoutes: [], customRoleId: '',
                department: '', phone: '', documentCpf: '', baseSalary: 0, contractType: 'CLT', workModel: '44H_WEEKLY',
                addressState: '', bankAccountType: 'CORRENTE', shiftId: '', dependentsCount: 0
            });
        }
        setActiveTab('GENERAL');
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async () => {
      if (variant === 'ACCESS' && !userToEdit) return; 

      if (!form.name) return showAlert({ title: "Nome Obrigatório", message: "Informe o nome.", type: "WARNING" });
      if (variant === 'ACCESS' && !form.email) return showAlert({ title: "Email Obrigatório", message: "Informe o email.", type: "WARNING" });
      if (variant === 'ACCESS' && !form.customRoleId && form.role !== Role.ADMIN) {
          return showAlert({ title: "Cargo Obrigatório", message: "Selecione um cargo cadastrado para o colaborador.", type: "WARNING" });
      }

      const userToSave = { 
          ...form, 
          customRoleId: form.customRoleId || undefined,
          hrJobRoleId: form.hrJobRoleId || undefined,
          shiftId: form.shiftId || undefined,
          baseSalary: Number(form.baseSalary) || 0,
          benefitsTotal: Number(form.benefitsTotal) || 0,
          dependentsCount: Number(form.dependentsCount) || 0
      };

      try {
          if (userToEdit) {
              await updateUser({ ...userToEdit, ...userToSave } as User);
              showAlert({ title: "Sucesso", message: "Dados atualizados!", type: 'SUCCESS' });
          } else {
              await addUser(userToSave);
              showAlert({ title: "Sucesso", message: "Colaborador cadastrado!", type: 'SUCCESS' });
          }
          onClose();
      } catch (error: any) {
          showAlert({ title: "Erro", message: error.message || "Erro ao salvar.", type: 'ERROR' });
      }
  };

  if (variant === 'ACCESS' && !userToEdit) return null;

  const renderTabButton = (tab: Tab, label: string, icon: React.ReactNode) => (
      <button 
          onClick={() => setActiveTab(tab)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
      >
          {icon} {label}
      </button>
  );

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={userToEdit ? (variant === 'RH' ? 'Editar Colaborador' : `Acesso: ${userToEdit.name}`) : 'Novo Colaborador'}
        variant={variant === 'RH' ? "page" : "dialog"}
        maxWidth="4xl"
        onSave={handleSubmit}
    >
        <div className="space-y-6 pb-10">
            
            {/* VARIANT ACCESS: Apenas Login e Senha */}
            {variant === 'ACCESS' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                            <Shield size={14}/> Cargo / Função
                        </label>
                        <select 
                            className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none" 
                            value={form.customRoleId || ''} 
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'ADMIN') {
                                    setForm({...form, role: Role.ADMIN, customRoleId: ''});
                                } else {
                                    setForm({...form, customRoleId: val, role: Role.WAITER});
                                }
                            }}
                        >
                            <option value="">Selecione um Cargo...</option>
                            <option value="ADMIN">Administrador (Acesso Total)</option>
                            {state.roles.length > 0 && (
                                <optgroup label="Cargos Cadastrados">
                                    {state.roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                            <Mail size={14}/> E-mail (Login)
                        </label>
                        <input 
                            required 
                            type="email" 
                            placeholder="usuario@email.com" 
                            className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none" 
                            value={form.email} 
                            onChange={e => setForm({...form, email: e.target.value})} 
                        />
                    </div>
                </div>
            )}

            {/* VARIANT RH: Formulário Completo com Abas */}
            {variant === 'RH' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar de Navegação */}
                    <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
                        {renderTabButton('GENERAL', 'Geral', <UserIcon size={16}/>)}
                        {renderTabButton('PERSONAL', 'Dados Pessoais', <FileText size={16}/>)}
                        {renderTabButton('ADDRESS', 'Endereço', <MapPin size={16}/>)}
                        {renderTabButton('CONTRACT', 'Contrato & Jornada', <Briefcase size={16}/>)}
                        {renderTabButton('FINANCIAL', 'Financeiro & Benefícios', <DollarSign size={16}/>)}
                        {renderTabButton('SST', 'Saúde & Segurança', <HeartPulse size={16}/>)}
                        {renderTabButton('CONTRACT_DOCS', 'Contrato', <FileSignature size={16}/>)}
                        
                        {userToEdit && (
                            <button 
                                onClick={() => printStaffSheet(userToEdit)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors text-slate-500 hover:bg-slate-50 mt-4 border-t border-slate-100 pt-4"
                            >
                                <Printer size={16}/> Imprimir Ficha
                            </button>
                        )}
                    </div>

                    {/* Conteúdo das Abas */}
                    <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                        
                        {activeTab === 'GENERAL' && (
                            <div className="space-y-6 animate-fade-in">
                                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Informações Gerais</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Nome Completo *</label>
                                        <input required className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Maria Silva" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">CPF</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="000.000.000-00" value={form.documentCpf} onChange={e => setForm({...form, documentCpf: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">E-mail</label>
                                        <input type="email" className="w-full border p-2.5 rounded-xl text-sm" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Telefone / Celular</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Departamento</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Cozinha, Salão" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Cargo / Função (RH)</label>
                                        <select 
                                            className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                                            value={form.hrJobRoleId || ''} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                const selectedRole = state.hrJobRoles.find(r => r.id === val);
                                                setForm({
                                                    ...form, 
                                                    hrJobRoleId: val,
                                                    customRoleId: selectedRole?.customRoleId || form.customRoleId,
                                                    baseSalary: selectedRole?.baseSalary && !form.baseSalary ? selectedRole.baseSalary : form.baseSalary
                                                });
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            {state.hrJobRoles.map(role => (
                                                <option key={role.id} value={role.id}>{role.title} ({role.cboCode})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Perfil de Acesso (Sistema)</label>
                                        <select 
                                            className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                                            value={form.customRoleId || (form.role === Role.ADMIN ? 'ADMIN' : '')} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === 'ADMIN') {
                                                    setForm({...form, role: Role.ADMIN, customRoleId: ''});
                                                } else {
                                                    setForm({...form, customRoleId: val, role: Role.WAITER});
                                                }
                                            }}
                                        >
                                            <option value="">Sem Acesso / Básico</option>
                                            <option value="ADMIN">Administrador (Acesso Total)</option>
                                            {state.roles.length > 0 && (
                                                <optgroup label="Perfis Cadastrados">
                                                    {state.roles.map(role => (
                                                        <option key={role.id} value={role.id}>{role.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'PERSONAL' && (
                            <div className="space-y-6 animate-fade-in">
                                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Dados Pessoais</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Data de Nascimento</label>
                                        <input type="date" className="w-full border p-2.5 rounded-xl text-sm" value={form.birthDate ? new Date(form.birthDate).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, birthDate: e.target.value ? new Date(e.target.value) : undefined})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Estado Civil</label>
                                        <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.maritalStatus || ''} onChange={e => setForm({...form, maritalStatus: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            <option value="SOLTEIRO">Solteiro(a)</option>
                                            <option value="CASADO">Casado(a)</option>
                                            <option value="DIVORCIADO">Divorciado(a)</option>
                                            <option value="VIUVO">Viúvo(a)</option>
                                            <option value="UNIAO_ESTAVEL">União Estável</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">RG (Número)</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.rgNumber || ''} onChange={e => setForm({...form, rgNumber: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold mb-1 text-slate-600">Órgão Emissor</label>
                                            <input className="w-full border p-2.5 rounded-xl text-sm" value={form.rgIssuer || ''} onChange={e => setForm({...form, rgIssuer: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1 text-slate-600">UF</label>
                                            <input className="w-full border p-2.5 rounded-xl text-sm" maxLength={2} value={form.rgState || ''} onChange={e => setForm({...form, rgState: e.target.value.toUpperCase()})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">PIS/PASEP</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.pisPasep || ''} onChange={e => setForm({...form, pisPasep: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Título de Eleitor</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.voterRegistration || ''} onChange={e => setForm({...form, voterRegistration: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">CTPS (Número)</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.ctpsNumber || ''} onChange={e => setForm({...form, ctpsNumber: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold mb-1 text-slate-600">Série</label>
                                            <input className="w-full border p-2.5 rounded-xl text-sm" value={form.ctpsSeries || ''} onChange={e => setForm({...form, ctpsSeries: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1 text-slate-600">UF</label>
                                            <input className="w-full border p-2.5 rounded-xl text-sm" maxLength={2} value={form.ctpsState || ''} onChange={e => setForm({...form, ctpsState: e.target.value.toUpperCase()})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Nome da Mãe</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.mothersName || ''} onChange={e => setForm({...form, mothersName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Nome do Pai</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.fathersName || ''} onChange={e => setForm({...form, fathersName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Escolaridade</label>
                                        <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.educationLevel || ''} onChange={e => setForm({...form, educationLevel: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            <option value="FUNDAMENTAL_INCOMPLETO">Fundamental Incompleto</option>
                                            <option value="FUNDAMENTAL_COMPLETO">Fundamental Completo</option>
                                            <option value="MEDIO_INCOMPLETO">Médio Incompleto</option>
                                            <option value="MEDIO_COMPLETO">Médio Completo</option>
                                            <option value="SUPERIOR_INCOMPLETO">Superior Incompleto</option>
                                            <option value="SUPERIOR_COMPLETO">Superior Completo</option>
                                            <option value="POS_GRADUACAO">Pós-Graduação</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 border-t pt-4 mt-2">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Contato de Emergência</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-slate-600">Nome do Contato</label>
                                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.emergencyContactName || ''} onChange={e => setForm({...form, emergencyContactName: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-slate-600">Telefone do Contato</label>
                                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.emergencyContactPhone || ''} onChange={e => setForm({...form, emergencyContactPhone: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ADDRESS' && (
                            <div className="space-y-6 animate-fade-in">
                                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Endereço Residencial</h4>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">CEP</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="00000-000" value={form.addressZip || ''} onChange={e => setForm({...form, addressZip: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Rua / Logradouro</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.addressStreet || ''} onChange={e => setForm({...form, addressStreet: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Número</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.addressNumber || ''} onChange={e => setForm({...form, addressNumber: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Complemento</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.addressComplement || ''} onChange={e => setForm({...form, addressComplement: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Bairro</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.addressNeighborhood || ''} onChange={e => setForm({...form, addressNeighborhood: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Cidade</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.addressCity || ''} onChange={e => setForm({...form, addressCity: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Estado (UF)</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" maxLength={2} value={form.addressState || ''} onChange={e => setForm({...form, addressState: e.target.value.toUpperCase()})} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'CONTRACT' && (
                            <div className="space-y-6 animate-fade-in">
                                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Contrato & Jornada</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Tipo Contrato</label>
                                        <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.contractType} onChange={e => setForm({...form, contractType: e.target.value as ContractType})}>
                                            <option value="CLT">CLT</option>
                                            <option value="PJ">PJ</option>
                                            <option value="FREELANCE">Freelance</option>
                                            <option value="TEMPORARY">Temporário</option>
                                            <option value="INTERN">Estágio</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Data de Admissão</label>
                                        <input type="date" className="w-full border p-2.5 rounded-xl text-sm" value={form.hireDate ? new Date(form.hireDate).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, hireDate: e.target.value ? new Date(e.target.value) : undefined})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Modelo de Jornada</label>
                                        <select className="w-full border p-2.5 rounded-xl text-sm bg-white font-bold text-blue-700" value={form.workModel} onChange={e => setForm({...form, workModel: e.target.value as WorkModel})}>
                                            <option value="44H_WEEKLY">44h Semanais (Padrão)</option>
                                            <option value="12X36">Escala 12x36</option>
                                            <option value="PART_TIME">Meio Período (25h)</option>
                                            <option value="INTERMITTENT">Intermitente (Por Hora)</option>
                                            <option value="ROTATING">Escala Rotativa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Salário Base (R$)</label>
                                        <input type="number" step="0.01" className="w-full border p-2.5 rounded-xl text-sm font-bold" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: parseFloat(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Turno Padrão</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                            <select 
                                                className="w-full border pl-9 p-2.5 rounded-xl text-sm bg-white cursor-pointer"
                                                value={form.shiftId || ''}
                                                onChange={e => setForm({...form, shiftId: e.target.value})}
                                            >
                                                <option value="">Selecione o Turno...</option>
                                                {state.shifts.map(shift => (
                                                    <option key={shift.id} value={shift.id}>
                                                        {shift.name} ({shift.startTime} - {shift.endTime})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Número de Dependentes (IRRF)</label>
                                        <input type="number" className="w-full border p-2.5 rounded-xl text-sm" value={form.dependentsCount} onChange={e => setForm({...form, dependentsCount: parseInt(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'FINANCIAL' && (
                            <div className="space-y-6 animate-fade-in">
                                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Dados Bancários & Benefícios</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Banco</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Nubank, Itaú" value={form.bankName || ''} onChange={e => setForm({...form, bankName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Tipo de Conta</label>
                                        <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.bankAccountType || ''} onChange={e => setForm({...form, bankAccountType: e.target.value})}>
                                            <option value="CORRENTE">Conta Corrente</option>
                                            <option value="POUPANCA">Conta Poupança</option>
                                            <option value="SALARIO">Conta Salário</option>
                                            <option value="PAGAMENTO">Conta de Pagamento</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Agência</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.bankAgency || ''} onChange={e => setForm({...form, bankAgency: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Conta</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.bankAccount || ''} onChange={e => setForm({...form, bankAccount: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Chave PIX</label>
                                        <input className="w-full border p-2.5 rounded-xl text-sm" value={form.pixKey || ''} onChange={e => setForm({...form, pixKey: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2 border-t pt-4 mt-2">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Informações de Benefícios</h5>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-slate-600">Vale Transporte / Alimentação</label>
                                                <textarea className="w-full border p-2.5 rounded-xl text-sm h-20" placeholder="Detalhes sobre vales..." value={form.transportVoucherInfo || ''} onChange={e => setForm({...form, transportVoucherInfo: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-slate-600">Plano de Saúde</label>
                                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="Operadora, Plano, Nº Carteirinha..." value={form.healthPlanInfo || ''} onChange={e => setForm({...form, healthPlanInfo: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-slate-600">Previdência Privada / Outros</label>
                                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.pensionInfo || ''} onChange={e => setForm({...form, pensionInfo: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'SST' && (
                            <div className="space-y-6 animate-fade-in">
                                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Saúde e Segurança do Trabalho (SST)</h4>
                                <div className="space-y-4">
                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-xs text-yellow-800 mb-4">
                                        Registre aqui informações sobre exames admissionais, periódicos, demissionais, atestados médicos, PPP e afastamentos.
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-600">Histórico e Observações SST</label>
                                        <textarea 
                                            className="w-full border p-4 rounded-xl text-sm h-64 focus:ring-2 focus:ring-blue-500 outline-none" 
                                            placeholder="Ex: Exame admissional realizado em 10/01/2024 - Apto.&#10;Afastamento por licença médica de 05/03 a 10/03..." 
                                            value={form.sstInfo || ''} 
                                            onChange={e => setForm({...form, sstInfo: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'CONTRACT_DOCS' && (
                            <div className="space-y-6 animate-fade-in">
                                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Gerar e Gerenciar Contrato</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Gerar Contrato */}
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                        <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Printer size={16}/> Gerar Minuta</h5>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-slate-600">Modelo de Contrato</label>
                                                <select 
                                                    className="w-full border p-2.5 rounded-xl text-sm bg-white"
                                                    value={selectedTemplateId}
                                                    onChange={e => setSelectedTemplateId(e.target.value)}
                                                >
                                                    <option value="">Selecione um modelo...</option>
                                                    {state.contractTemplates.filter(t => t.isActive && t.type === 'CONTRACT').map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button 
                                                onClick={handleGenerateContract}
                                                disabled={!selectedTemplateId}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Gerar e Imprimir
                                            </button>
                                        </div>
                                    </div>

                                    {/* Upload Contrato Assinado */}
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                        <h5 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><FileSignature size={16}/> Contrato Assinado</h5>
                                        
                                        {userToEdit?.signedContractUrl ? (
                                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
                                                    <Shield size={16}/> Contrato Arquivado
                                                </div>
                                                <a 
                                                    href={userToEdit.signedContractUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    Visualizar
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">
                                                Nenhum contrato assinado foi enviado ainda.
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold mb-1 text-slate-600">Enviar Arquivo (PDF/Img)</label>
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={handleUploadContract}
                                                    disabled={isUploading}
                                                    className="w-full text-sm text-slate-500
                                                        file:mr-4 file:py-2.5 file:px-4
                                                        file:rounded-xl file:border-0
                                                        file:text-sm file:font-bold
                                                        file:bg-blue-50 file:text-blue-700
                                                        hover:file:bg-blue-100
                                                    "
                                                />
                                                {isUploading && <div className="absolute right-2 top-2"><RefreshCcw className="animate-spin text-blue-600" size={16}/></div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    </Modal>
  );
};
