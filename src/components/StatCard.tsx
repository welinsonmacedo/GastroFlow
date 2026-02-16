
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  colorBorder?: string; // ex: border-blue-500
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorBorder = 'border-gray-200' }) => {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${colorBorder} flex flex-col justify-between h-full`}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">{title}</div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
    </div>
  );
};
