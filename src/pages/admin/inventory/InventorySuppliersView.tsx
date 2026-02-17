
import React, { useState } from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { Truck, Plus, Trash2, User as UserIcon, Phone, FileText } from 'lucide-react';

export const InventorySuppliersView: React.FC = () => {
    const { state: invState, addSupplier, deleteSupplier } = useInventory();
    const { showConfirm, showAlert } = useUI();
    
    const [newSupplierForm, setNewSupplierForm] = useState({ name: '', phone: '', email: '', cnpj: '', contactName: '' });
    const [showSupplierForm, setShowSupplierForm] = useState(false);

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newSupplierForm.name) return;
        await addSupplier(newSupplierForm as any);
        setNewSupplierForm({ name: '', phone: '', email: '', cnpj: '', contactName: '' });
        setShowSupplierForm(false);
        showAlert({ title: "Sucesso", message: "Fornecedor adicionado.", type: "SUCCESS" });
    };

    const handleDeleteSupplier = (id: string) => {
        showConfirm({ title: "Excluir Fornecedor", message: "Tem certeza?", onConfirm: async () => { await deleteSupplier(id); showAlert({ title: "Sucesso", message: "Fornecedor removido.", type: 'SUCCESS' }); } });
    };

    return (
      <div className="w-full h-full flex flex-col space-y-6 overflow-hidden">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-blue-600"/> Fornecedores</h2>
              <Button onClick={() => setShowSupplierForm(true)}><Plus size={18}/> Novo Fornecedor</Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
              {showSupplierForm && (
                  <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-md mb-6 animate-fade-in">
                      <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4">Cadastro de Fornecedor</h4>
                      <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2"><label className="text-xs font-bold block mb-1 text-slate-600">Nome / Razão Social</label><input required className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.name} onChange={e => setNewSupplierForm({...newSupplierForm, name: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">CNPJ</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.cnpj} onChange={e => setNewSupplierForm({...newSupplierForm, cnpj: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">Nome Contato</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.contactName} onChange={e => setNewSupplierForm({...newSupplierForm, contactName: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">Telefone</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.phone} onChange={e => setNewSupplierForm({...newSupplierForm, phone: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">Email</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.email} onChange={e => setNewSupplierForm({...newSupplierForm, email: e.target.value})} /></div>
                          <div className="md:col-span-2 flex gap-3 mt-2">
                              <Button type="button" variant="secondary" onClick={() => setShowSupplierForm(false)} className="flex-1 py-3">Cancelar</Button>
                              <Button type="submit" className="flex-1 py-3 shadow-md">Salvar Fornecedor</Button>
                          </div>
                      </form>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {invState.suppliers.map(s => (
                      <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-blue-400 hover:shadow-lg transition-all relative">
                          <button onClick={() => handleDeleteSupplier(s.id)} className="absolute top-4 right-4 text-red-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                          <div>
                              <h4 className="font-bold text-slate-800 text-lg mb-1 truncate pr-6" title={s.name}>{s.name}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mb-3"><UserIcon size={12}/> {s.contactName || 'Sem contato'}</p>
                              <div className="space-y-2">
                                  <p className="text-xs bg-slate-50 p-2 rounded-lg flex items-center gap-2 border border-slate-100 font-medium text-slate-600"><Phone size={12} className="text-blue-500"/> {s.phone || '-'}</p>
                                  <p className="text-xs bg-slate-50 p-2 rounded-lg flex items-center gap-2 border border-slate-100 font-medium text-slate-600"><FileText size={12} className="text-blue-500"/> {s.cnpj || '-'}</p>
                              </div>
                          </div>
                      </div>
                  ))}
                  {invState.suppliers.length === 0 && !showSupplierForm && <div className="col-span-full text-center py-20 text-gray-400 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl"><Truck size={48} className="mb-4 opacity-20"/><p>Nenhum fornecedor cadastrado.</p></div>}
              </div>
          </div>
      </div>
    );
};
