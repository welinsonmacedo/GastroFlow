import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';

export const AdminSettings: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert } = useUI();
  const [localTheme, setLocalTheme] = useState(state.theme);

  const handleSave = () => {
      dispatch({ type: 'UPDATE_THEME', theme: localTheme });
      showAlert({ title: 'Sucesso', message: 'Tema atualizado!', type: 'SUCCESS' });
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Personalização do App</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold mb-1 text-gray-600">Nome do Restaurante</label>
                    <input className="w-full border p-3 rounded-lg text-sm" value={localTheme.restaurantName} onChange={e => setLocalTheme({...localTheme, restaurantName: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-600">Cor Primária</label>
                        <div className="flex gap-2">
                            <input type="color" className="h-11 w-12 border rounded cursor-pointer p-1" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                            <input className="flex-1 border p-3 rounded-lg text-sm uppercase" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-600">Cor de Fundo</label>
                        <div className="flex gap-2">
                            <input type="color" className="h-11 w-12 border rounded cursor-pointer p-1" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                            <input className="flex-1 border p-3 rounded-lg text-sm uppercase" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold mb-1 text-gray-600">Logotipo (URL)</label>
                    <ImageUploader value={localTheme.logoUrl} onChange={(val) => setLocalTheme({...localTheme, logoUrl: val})} />
                </div>

                <div>
                    <label className="block text-sm font-bold mb-1 text-gray-600">Modo de Exibição do Menu</label>
                    <select className="w-full border p-3 rounded-lg text-sm bg-white" value={localTheme.viewMode || 'LIST'} onChange={e => setLocalTheme({...localTheme, viewMode: e.target.value as 'LIST' | 'GRID'})}>
                        <option value="LIST">Lista (Padrão)</option>
                        <option value="GRID">Grade (Fotos Grandes)</option>
                    </select>
                </div>

                <Button onClick={handleSave} className="w-full mt-4 py-3 text-lg">Salvar Alterações</Button>
            </div>
        </div>
    </div>
  );
};