
import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../Button';

export const SaaSSettingsView: React.FC = () => {
    const { state, dispatch } = useSaaS();
    const { showAlert } = useUI();
    const [settingsForm, setSettingsForm] = useState({ name: state.adminName || '', email: state.adminEmail || '' });

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'UPDATE_PROFILE', name: settingsForm.name, email: settingsForm.email });
        showAlert({ title: "Sucesso", message: "Perfil atualizado com sucesso!", type: 'SUCCESS' });
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Meu Perfil</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Nome</label>
                    <input className="w-full border p-3 rounded-lg" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Email</label>
                    <input className="w-full border p-3 rounded-lg" value={settingsForm.email} onChange={e => setSettingsForm({...settingsForm, email: e.target.value})} />
                </div>
                <Button type="submit" className="w-full py-3 text-lg">Atualizar Perfil</Button>
            </form>
        </div>
    );
};
