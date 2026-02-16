
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Supplier } from '../../types';
import { MapPin, Phone, User as UserIcon, FileText, Loader2, Trash2 } from 'lucide-react';

interface SupplierManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplierManagerModal: React.FC<SupplierManagerModalProps> = ({ isOpen, onClose }) => {
  const { state, addSupplier, deleteSupplier } = useInventory();
  const { showAlert } = useUI();
  
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '', contactName: '', phone: '',
    cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: ''
  });
  const [loadingCep, setLoadingCep] = useState(false);

  const formatCNPJ = (value: string) => {
    return value.replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else {
      return v.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3').slice(0, 14);
    }
  };

  const handleCepBlur = async () => {
    const cep = newSupplier.cep?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setNewSupplier(prev => ({
            ...prev,
            address: data.logradouro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name) return;
    try {
      await addSupplier(newSupplier as Supplier);
      setNewSupplier({ name: '', contactName: '', phone: '', cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: '' });
      showAlert({ title: "Sucesso", message: "Fornecedor cadastrado com sucesso!", type: 'SUCCESS' });
    } catch (error) {
      showAlert({ title: "Erro", message: "Erro ao salvar fornecedor.", type: 'ERROR' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestão de Fornecedores" variant="page">
      <div className="space-y-8">
        <form onSubmit={handleAddSupplier} className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Novo Fornecedor</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Razão Social / Nome Fantasia *</label>
              <input required placeholder="Ex: Distribuidora Silva LTDA" className="border-2 p-2.5 rounded-xl w-full focus:border-blue-500 outline-none" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-500">CNPJ</label>
              <input placeholder="00.000.000/0000-00" className="border-2 p-2.5 rounded-xl w-full" value={newSupplier.cnpj} onChange={e => setNewSupplier({ ...newSupplier, cnpj: formatCNPJ(e.target.value) })} maxLength={18} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Inscrição Estadual</label>
              <input placeholder="Isento ou Número" className="border-2 p-2.5 rounded-xl w-full" value={newSupplier.ie} onChange={e => setNewSupplier({ ...newSupplier, ie: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Nome Contato</label>
              <div className="relative">
                <UserIcon size={14} className="absolute left-3 top-3.5 text-gray-400" />
                <input placeholder="Ex: João" className="border-2 p-2.5 pl-9 rounded-xl w-full" value={newSupplier.contactName} onChange={e => setNewSupplier({ ...newSupplier, contactName: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Telefone / WhatsApp</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-3.5 text-gray-400" />
                <input placeholder="(00) 00000-0000" className="border-2 p-2.5 pl-9 rounded-xl w-full" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: formatPhone(e.target.value) })} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1 uppercase text-slate-500">E-mail</label>
              <input type="email" placeholder="contato@fornecedor.com" className="border-2 p-2.5 rounded-xl w-full" value={newSupplier.email} onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })} />
            </div>
          </div>
          <div className="border-t pt-4 mt-2">
            <h5 className="text-xs font-bold text-gray-500 mb-3 uppercase flex items-center gap-1"><MapPin size={12} /> Endereço</h5>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">CEP</label>
                <div className="relative">
                  <input
                    placeholder="00000-000"
                    className={`border-2 p-2.5 rounded-xl w-full text-sm ${loadingCep ? 'bg-gray-100' : ''}`}
                    value={newSupplier.cep}
                    onChange={e => setNewSupplier({ ...newSupplier, cep: formatCEP(e.target.value) })}
                    onBlur={handleCepBlur}
                    maxLength={9}
                  />
                  {loadingCep && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-blue-500" />}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Logradouro</label>
                <input className="border-2 p-2.5 rounded-xl w-full text-sm bg-gray-50" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Número</label>
                <input className="border-2 p-2.5 rounded-xl w-full text-sm" value={newSupplier.number} onChange={e => setNewSupplier({ ...newSupplier, number: e.target.value })} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Complemento</label>
                <input className="border-2 p-2.5 rounded-xl w-full text-sm" value={newSupplier.complement} onChange={e => setNewSupplier({ ...newSupplier, complement: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Cidade</label>
                <input className="border-2 p-2.5 rounded-xl w-full text-sm bg-gray-50" value={newSupplier.city} onChange={e => setNewSupplier({ ...newSupplier, city: e.target.value })} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">UF</label>
                <input className="border-2 p-2.5 rounded-xl w-full text-sm bg-gray-50" maxLength={2} value={newSupplier.state} onChange={e => setNewSupplier({ ...newSupplier, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
          </div>
          <Button size="lg" type="submit" className="w-full mt-4 py-3 font-bold shadow-md">Salvar Fornecedor</Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.suppliers.map(s => (
            <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors group relative">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 leading-tight pr-6">{s.name}</h4>
                  <button onClick={() => deleteSupplier(s.id)} className="text-red-300 hover:text-red-500 absolute top-4 right-4 p-1 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12} /> {s.phone || 'Sem telefone'}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2 truncate"><FileText size={12} /> {s.cnpj || 'Sem CNPJ'}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate mt-1 pt-1 border-t"><MapPin size={10} /> {s.city && s.state ? `${s.city}-${s.state}` : 'Sem endereço'}</div>
              </div>
            </div>
          ))}
          {state.suppliers.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 bg-slate-50 rounded-xl border-2 border-dashed">
              <p>Nenhum fornecedor cadastrado.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
