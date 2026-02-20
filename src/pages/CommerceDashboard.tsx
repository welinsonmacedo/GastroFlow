
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CommercePOS } from './commerce/CommercePOS';

export const CommerceDashboard: React.FC = () => {
    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            <Routes>
                <Route path="/" element={<CommercePOS />} />
                <Route path="*" element={<Navigate to="/commerce" replace />} />
            </Routes>
        </div>
    );
};
