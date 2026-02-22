import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';


interface SummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summary: {
        overtime: number;
        missingHours: number;
        bankHours: number;
    };
    onSave: (newSummary: {
        overtime: number;
        missingHours: number;
        bankHours: number;
    }) => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, summary, onSave }) => {
    const [overtime, setOvertime] = useState(0);
    const [missingHours, setMissingHours] = useState(0);
    const [bankHours, setBankHours] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setOvertime(summary.overtime);
            setMissingHours(summary.missingHours);
            setBankHours(summary.bankHours);
        }
    }, [isOpen, summary]);

    const handleSave = () => {
        onSave({ overtime, missingHours, bankHours });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Resumo do Dia" onSave={handleSave}>
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Horas Extras</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-xl mt-1" value={overtime} onChange={e => setOvertime(parseFloat(e.target.value))} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Horas Faltantes</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-xl mt-1" value={missingHours} onChange={e => setMissingHours(parseFloat(e.target.value))} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Banco de Horas</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-xl mt-1" value={bankHours} onChange={e => setBankHours(parseFloat(e.target.value))} />
                </div>
            </div>
        </Modal>
    );
};
