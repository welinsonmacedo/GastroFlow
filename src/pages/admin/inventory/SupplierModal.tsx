import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Supplier } from '../../../types';

interface SupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplier: Supplier) => void;
    supplier: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({ isOpen, onClose, onSave, supplier }) => {
    const [formData, setFormData] = useState<Supplier | any>({});

    useEffect(() => {
        if (supplier) {
            setFormData(supplier);
        } else {
            setFormData({ name: '', phone: '', email: '', cnpj: '', contactName: '' });
        }
    }, [supplier, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'} variant="page">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-bold block mb-1 text-slate-600">Nome / Razão Social</label>
                    <input required name="name" className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={formData.name || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-slate-600">CNPJ</label>
                    <input name="cnpj" className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={formData.cnpj || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-slate-600">Nome Contato</label>
                    <input name="contactName" className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={formData.contactName || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-slate-600">Telefone</label>
                    <input name="phone" className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={formData.phone || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-slate-600">Email</label>
                    <input name="email" type="email" className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={formData.email || ''} onChange={handleChange} />
                </div>
                <div className="flex gap-3 mt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-3">Cancelar</Button>
                    <Button type="submit" className="flex-1 py-3 shadow-md">Salvar</Button>
                </div>
            </form>
        </Modal>
    );
};
