
import React, { useState } from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { Truck, Plus, Trash2, Edit } from 'lucide-react';
import { SupplierModal } from './SupplierModal';
import { Supplier } from '../../../types';

export const InventorySuppliersView: React.FC = () => {
    const { state: invState, addSupplier, updateSupplier, deleteSupplier } = useInventory();
    const { showConfirm, showAlert } = useUI();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const handleOpenModal = (supplier: Supplier | null = null) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedSupplier(null);
        setIsModalOpen(false);
    };

    const handleSaveSupplier = async (supplier: Supplier) => {
        if (supplier.id) {
            await updateSupplier(supplier);
            showAlert({ title: "Sucesso", message: "Fornecedor atualizado.", type: "SUCCESS" });
        } else {
            await addSupplier(supplier as any);
            showAlert({ title: "Sucesso", message: "Fornecedor adicionado.", type: "SUCCESS" });
        }
        handleCloseModal();
    };

    const handleDeleteSupplier = (id: string) => {
        showConfirm({ 
            title: "Excluir Fornecedor", 
            message: "Tem certeza? Esta ação não pode ser desfeita.", 
            onConfirm: async () => { 
                await deleteSupplier(id); 
                showAlert({ title: "Sucesso", message: "Fornecedor removido.", type: 'SUCCESS' }); 
            } 
        });
    };

    return (
      <div className="w-full h-full flex flex-col space-y-6 overflow-hidden">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-blue-600"/> Fornecedores</h2>
              <Button onClick={() => handleOpenModal()}><Plus size={18}/> Novo Fornecedor</Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
                          <tr>
                              <th className="p-4">Nome</th>
                              <th className="p-4">Contato</th>
                              <th className="p-4">Telefone</th>
                              <th className="p-4">CNPJ</th>
                              <th className="p-4 w-32"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {invState.suppliers.map(s => (
                              <tr key={s.id} className="hover:bg-slate-50">
                                  <td className="p-4 font-bold text-slate-800">{s.name}</td>
                                  <td className="p-4 text-slate-600">{s.contactName}</td>
                                  <td className="p-4 text-slate-600">{s.phone}</td>
                                  <td className="p-4 text-slate-600">{s.cnpj}</td>
                                  <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <Button variant="outline" size="sm" onClick={() => handleOpenModal(s)}><Edit size={14}/> Editar</Button>
                                          <Button variant="secondary" size="sm" className="text-red-500 hover:bg-red-100" onClick={() => handleDeleteSupplier(s.id)}><Trash2 size={14}/></Button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {invState.suppliers.length === 0 && (
                      <div className="col-span-full text-center py-20 text-gray-400 flex flex-col items-center justify-center">
                          <Truck size={48} className="mb-4 opacity-20"/>
                          <p>Nenhum fornecedor cadastrado.</p>
                      </div>
                  )}
              </div>
          </div>

          <SupplierModal 
              isOpen={isModalOpen} 
              onClose={handleCloseModal} 
              onSave={handleSaveSupplier} 
              supplier={selectedSupplier} 
          />
      </div>
    );
};
