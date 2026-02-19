
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { User, Role, ContractType } from '../../types';
import { Shield, Mail, User as UserIcon, Phone, FileText, Building2, DollarSign, Calendar, MapPin, Briefcase, CreditCard, Loader2, Clock, Users } from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  variant?: 'ACCESS' | 'RH';
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({ isOpen, onClose, userToEdit, variant = 'ACCESS' }) => {
  const { addUser, updateUser, state } = useStaff(); 
  const { showAlert } = useUI();
  const [loadingCep, setLoadingCep] = useState(false);

  const [form, setForm] = useState<Partial<User>>({});

  useEffect(() => {
    if (isOpen) {
        if (userToEdit) {
            setForm({ ...userToEdit, customRoleId: userToEdit.customRoleId || '' });
        } else {
            setForm({ 
                name: '', role: Role.WAITER, email: '', allowedRoutes: [], customRoleId: '',
                department: '', phone: '', documentCpf: '', baseSalary: 0, contractType: 'CLT',
                addressState: '', bankAccountType: 'CORRENTE', shiftId: '', dependentsCount: 0
            });
        }
    }
  }, [isOpen, userToEdit]);

  const handleCepBlur = async () => {
    const cep = form.addressZip?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            addressStreet: data.logradouro,
            addressNeighborhood: data.bairro,
            addressCity: data.localidade,
            addressState: data.uf
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Limpeza de campos opcionais que não podem ser string vazia
      const userToSave = { 
          ...form, 
          customRoleId: form.customRoleId || undefined,
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

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={userToEdit ? (variant === 'RH' ? 'Editar Colaborador' : `Acesso: ${userToEdit.name}`) : 'Novo Colaborador'}
        variant={variant === 'RH' ? "page" : "dialog"}
        maxWidth="md"
    >
        <form onSubmit={handleSubmit} className="space-y-8 pb-10">
            
            {/* VARIANT ACCESS: Apenas Login e Senha */}
            {variant === 'ACCESS' && (
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-slate-700 border">{userToEdit?.name.charAt(0)}</div>
                            <div>
                                <p className="font-bold text-slate-800">{userToEdit?.name}</p>
                                <p className="text-xs text-slate-500">{userToEdit?.department || 'Setor não informado'}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                            <Shield size={14}/> Cargo / Função
                        </label>
                        <select 
                            className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none transition-all cursor-pointer" 
                            value={form.customRoleId ? form.customRoleId : form.role} 
                            onChange={e => {
                                const val = e.target.value;
                                if (['WAITER', 'KITCHEN', 'CASHIER', 'ADMIN'].includes(val)) {
                                    setForm({...form, role: val as Role, customRoleId: ''});
                                } else {
                                    setForm({...form, customRoleId: val, role: Role.WAITER});
                                }
                            }}
                        >
                            <optgroup label="Cargos Padrão">
                                <option value="WAITER">Garçom</option>
                                <option value="KITCHEN">Cozinha</option>
                                <option value="CASHIER">Caixa</option>
                                <option value="ADMIN">Gerente</option>
                            </optgroup>
                            {state.roles.length > 0 && (
                                <optgroup label="Personalizados">
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
                            className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
                            value={form.email} 
                            onChange={e => setForm({...form, email: e.target.value})} 
                        />
                    </div>
                </div>
            )}

            {/* VARIANT RH: Formulário Completo */}
            {variant === 'RH' && (
                <div className="space-y-8 max-w-5xl mx-auto">
                    
                    {/* 1. DADOS PESSOAIS */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 pb-2 border-b">
                            <UserIcon size={16} className="text-blue-600"/> Dados Pessoais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 text-slate-600">Nome Completo</label>
                                <input required className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Maria Silva" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Data de Nascimento</label>
                                <input type="date" className="w-full border p-2.5 rounded-xl text-sm" value={form.birthDate ? new Date(form.birthDate).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, birthDate: new Date(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Gênero</label>
                                <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Estado Civil</label>
                                <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.maritalStatus} onChange={e => setForm({...form, maritalStatus: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                    <option value="Viúvo(a)">Viúvo(a)</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Escolaridade</label>
                                <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.educationLevel} onChange={e => setForm({...form, educationLevel: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option value="Fundamental">Ensino Fundamental</option>
                                    <option value="Medio">Ensino Médio</option>
                                    <option value="Superior">Ensino Superior</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 text-slate-600">Nome da Mãe</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.mothersName} onChange={e => setForm({...form, mothersName: e.target.value})} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Telefone</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* 2. DOCUMENTAÇÃO */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 pb-2 border-b">
                            <FileText size={16} className="text-orange-600"/> Documentação
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">CPF</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="000.000.000-00" value={form.documentCpf} onChange={e => setForm({...form, documentCpf: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">RG</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.rgNumber} onChange={e => setForm({...form, rgNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Órgão Emissor</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: SSP" value={form.rgIssuer} onChange={e => setForm({...form, rgIssuer: e.target.value})} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">UF RG</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" maxLength={2} value={form.rgState} onChange={e => setForm({...form, rgState: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">CTPS (Carteira)</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.ctpsNumber} onChange={e => setForm({...form, ctpsNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Série CTPS</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.ctpsSeries} onChange={e => setForm({...form, ctpsSeries: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">UF CTPS</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" maxLength={2} value={form.ctpsState} onChange={e => setForm({...form, ctpsState: e.target.value.toUpperCase()})} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">PIS/PASEP</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.pisPasep} onChange={e => setForm({...form, pisPasep: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* 3. ENDEREÇO */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 pb-2 border-b">
                            <MapPin size={16} className="text-green-600"/> Endereço
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">CEP</label>
                                <div className="relative">
                                    <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="00000-000" value={form.addressZip} onChange={e => setForm({...form, addressZip: e.target.value})} onBlur={handleCepBlur} />
                                    {loadingCep && <Loader2 size={16} className="absolute right-3 top-2.5 animate-spin text-blue-500"/>}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 text-slate-600">Logradouro</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm bg-gray-50" value={form.addressStreet} onChange={e => setForm({...form, addressStreet: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Número</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.addressNumber} onChange={e => setForm({...form, addressNumber: e.target.value})} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Bairro</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm bg-gray-50" value={form.addressNeighborhood} onChange={e => setForm({...form, addressNeighborhood: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Cidade</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm bg-gray-50" value={form.addressCity} onChange={e => setForm({...form, addressCity: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Estado</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm bg-gray-50" value={form.addressState} onChange={e => setForm({...form, addressState: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Complemento</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.addressComplement} onChange={e => setForm({...form, addressComplement: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* 4. DADOS BANCÁRIOS */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 pb-2 border-b">
                            <CreditCard size={16} className="text-purple-600"/> Dados Bancários
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 text-slate-600">Banco</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Nubank, Itaú" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Tipo de Conta</label>
                                <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.bankAccountType} onChange={e => setForm({...form, bankAccountType: e.target.value})}>
                                    <option value="CORRENTE">Conta Corrente</option>
                                    <option value="POUPANCA">Conta Poupança</option>
                                    <option value="SALARIO">Conta Salário</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Chave PIX</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.pixKey} onChange={e => setForm({...form, pixKey: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Agência</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.bankAgency} onChange={e => setForm({...form, bankAgency: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Conta com Dígito</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* 5. CONTRATO */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 pb-2 border-b">
                            <Briefcase size={16} className="text-gray-600"/> Dados Contratuais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Departamento / Setor</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Cozinha" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                            </div>
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
                                <input type="date" className="w-full border p-2.5 rounded-xl text-sm" value={form.hireDate ? new Date(form.hireDate).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, hireDate: new Date(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Salário Base</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                    <input type="number" step="0.01" className="w-full border pl-9 p-2.5 rounded-xl text-sm bg-white font-bold text-slate-700" placeholder="0.00" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Dependentes (IRRF)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                    <input type="number" min="0" className="w-full border pl-9 p-2.5 rounded-xl text-sm bg-white" placeholder="0" value={form.dependentsCount} onChange={e => setForm({...form, dependentsCount: parseInt(e.target.value)})} />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Usado para cálculo da dedução do IRRF.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Turno de Trabalho</label>
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
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-4 pt-6 border-t bg-gray-50 -mx-6 px-6 -mb-6 pb-6 sticky bottom-0 z-10">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-4 text-lg">Cancelar</Button>
                <Button type="submit" className="flex-1 shadow-lg py-4 text-lg font-bold">{userToEdit ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</Button>
            </div>
        </form>
    </Modal>
  );
};
