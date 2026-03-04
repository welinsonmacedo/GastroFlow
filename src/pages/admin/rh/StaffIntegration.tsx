import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { Button } from '../../../components/Button';
import { Network, Download, FileCode2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export const StaffIntegration: React.FC = () => {
    const { state: restState } = useRestaurant();
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const { data, error } = await supabase
                    .from('global_settings')
                    .select('settings')
                    .eq('id', 'default')
                    .single();

                if (error) throw error;

                if (data?.settings?.esocialTemplates) {
                    const parsed = typeof data.settings.esocialTemplates === 'string' 
                        ? JSON.parse(data.settings.esocialTemplates) 
                        : data.settings.esocialTemplates;
                    
                    if (Array.isArray(parsed)) {
                        setTemplates(parsed);
                    } else {
                        const arr = Object.entries(parsed).map(([code, tData]: [string, any]) => ({
                            id: tData.id || Math.random().toString(36).substr(2, 9),
                            code,
                            name: tData.name || code,
                            xmlTemplate: tData.xmlTemplate || tData
                        }));
                        setTemplates(arr);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch esocial templates", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTemplates();
    }, []);

    const handleDownloadXML = (template: any) => {
        // Here we would replace {{variables}} with actual data from the tenant
        // For now, we just download the raw template or a mock replaced version
        
        let xmlContent = template.xmlTemplate;
        
        // Example replacements (in a real scenario, this would use actual employee/company data)
        xmlContent = xmlContent.replace(/\{\{razaoSocial\}\}/g, restState.theme.restaurantName || 'Empresa Teste');
        xmlContent = xmlContent.replace(/\{\{cnpj\}\}/g, restState.businessInfo?.cnpj || '00.000.000/0001-00');
        
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `esocial_${template.code}_${new Date().getTime()}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
                    <Network size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Integração e-Social</h2>
                    <p className="text-gray-500 mt-1">
                        Gere os arquivos XML formatados para envio ao e-Social utilizando os moldes oficiais disponibilizados pela administração.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <FileCode2 size={18} className="text-gray-400" />
                        Eventos Disponíveis
                    </h3>
                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {templates.length} moldes
                    </span>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p>Carregando moldes...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <AlertTriangle size={48} className="text-orange-300 mb-4" />
                        <p className="font-bold text-gray-700">Nenhum molde configurado</p>
                        <p className="text-sm mt-2">A administração ainda não disponibilizou os moldes XML do e-Social.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {templates.map(t => (
                            <div key={t.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm border border-blue-100">
                                            {t.code}
                                        </span>
                                        <h4 className="font-bold text-gray-800">{t.name}</h4>
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <CheckCircle size={14} className="text-green-500" /> Molde atualizado e pronto para uso
                                    </p>
                                </div>
                                <Button onClick={() => handleDownloadXML(t)} variant="outline" className="shrink-0">
                                    <Download size={18} className="mr-2" /> Gerar XML
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
